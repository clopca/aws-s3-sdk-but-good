import type {
  FileRouter,
  inferEndpointInput,
  inferEndpoints,
} from "./types";
import { UploadError, type UploadFileResponse } from "@s3-good/shared";
import { genUploader, type GenUploaderOptions } from "./client-factory";

export type UploadJobState =
  | "queued"
  | "uploading"
  | "paused"
  | "completed"
  | "failed"
  | "canceled";

export interface QueueOptions {
  concurrency?: number;
  autoStart?: boolean;
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
}

export interface ResumeOptions {
  enabled?: boolean;
  storageKey?: string;
}

export type UploadLifecycleEventType =
  | "upload.enqueued"
  | "upload.started"
  | "upload.progress"
  | "upload.paused"
  | "upload.resumed"
  | "upload.completed"
  | "upload.failed"
  | "upload.canceled";

export interface UploadLifecycleEvent {
  type: UploadLifecycleEventType;
  jobId: string;
  endpoint: string;
  attempt?: number;
  progress?: number;
  error?: UploadError;
}

export interface CreateS3GoodClientOptions extends GenUploaderOptions {
  queue?: QueueOptions;
  retry?: RetryOptions;
  resume?: ResumeOptions;
  onEvent?: (event: UploadLifecycleEvent) => void;
}

export interface EnqueueUploadOptions<
  TRouter extends FileRouter,
  TEndpoint extends inferEndpoints<TRouter>,
> {
  files: File[];
  input?: inferEndpointInput<TRouter, TEndpoint>;
  headers?: HeadersInit | (() => Promise<HeadersInit> | HeadersInit);
  onUploadBegin?: (fileName: string) => void;
  onUploadProgress?: (progress: number) => void;
}

export interface UploadJobSnapshot {
  id: string;
  endpoint: string;
  state: UploadJobState;
  attempts: number;
  progress: number;
  createdAt: number;
  updatedAt: number;
  error?: UploadError;
}

export interface UploadQueueSnapshot {
  jobs: UploadJobSnapshot[];
  activeCount: number;
}

interface PersistedUploadOptions {
  files: File[];
  input?: unknown;
  headers?: HeadersInit;
}

interface PersistedUploadJob {
  id: string;
  endpoint: string;
  state: "queued" | "paused";
  attempts: number;
  progress: number;
  createdAt: number;
  updatedAt: number;
  options: PersistedUploadOptions;
}

interface PersistedQueueState {
  version: 1;
  idCounter: number;
  jobs: PersistedUploadJob[];
}

interface QueueJob<
  TRouter extends FileRouter,
  TEndpoint extends inferEndpoints<TRouter>,
> {
  id: string;
  endpoint: TEndpoint;
  opts: EnqueueUploadOptions<TRouter, TEndpoint>;
  controller: AbortController;
  snapshot: UploadJobSnapshot;
  abortReason: "pause" | "cancel" | null;
  resolve: (value: UploadFileResponse[] | undefined) => void;
  reject: (reason?: unknown) => void;
}

export interface UploadJobHandle {
  id: string;
  start: () => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  result: Promise<UploadFileResponse[] | undefined>;
}

const DEFAULT_QUEUE: Required<QueueOptions> = {
  concurrency: 3,
  autoStart: true,
};

const DEFAULT_RETRY: Required<RetryOptions> = {
  maxAttempts: 4,
  baseDelayMs: 300,
  maxDelayMs: 3000,
  jitter: true,
};
const MAX_TERMINAL_SNAPSHOTS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof UploadError) {
    if (error.retryable === true) return true;
    if (error.retryable === false) return false;
    return (
      error.code === "NETWORK_ERROR" ||
      error.code === "S3_ERROR" ||
      error.code === "UPLOAD_FAILED" ||
      error.code === "RATE_LIMITED"
    );
  }
  if (error instanceof DOMException && error.name === "AbortError") return false;
  return true;
}

function toUploadError(error: unknown): UploadError {
  if (error instanceof UploadError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new UploadError({
      code: "UPLOAD_FAILED",
      message: "Upload aborted",
      status: 499,
      retryable: false,
      hint: "Resume the upload if needed.",
    });
  }
  if (error instanceof TypeError) {
    return new UploadError({
      code: "NETWORK_ERROR",
      message: error.message || "Network error",
      retryable: true,
      hint: "Check your network connection and retry.",
    });
  }
  return new UploadError({
    code: "UPLOAD_FAILED",
    message: error instanceof Error ? error.message : "Upload failed",
    retryable: false,
  });
}

function computeBackoff(attempt: number, retry: Required<RetryOptions>): number {
  const exponential = Math.min(
    retry.maxDelayMs,
    retry.baseDelayMs * 2 ** Math.max(0, attempt - 1),
  );
  if (!retry.jitter) return exponential;
  const jitterFactor = 0.5 + Math.random();
  return Math.round(exponential * jitterFactor);
}

function buildStorageKey(opts: CreateS3GoodClientOptions): string {
  return opts.resume?.storageKey ?? "s3-good:upload-jobs:v1";
}

function hasIndexedDb(): boolean {
  return typeof globalThis !== "undefined" && "indexedDB" in globalThis;
}

async function persistQueueSnapshot(
  key: string,
  snapshot: PersistedQueueState,
): Promise<void> {
  if (!hasIndexedDb()) return;
  await new Promise<void>((resolve) => {
    const open = indexedDB.open("s3-good-client", 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore("queue");
    };
    open.onerror = () => resolve();
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction("queue", "readwrite");
      tx.objectStore("queue").put(snapshot, key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    };
  });
}

async function loadQueueSnapshot(
  key: string,
): Promise<PersistedQueueState | undefined> {
  if (!hasIndexedDb()) return undefined;

  return new Promise<PersistedQueueState | undefined>((resolve) => {
    const open = indexedDB.open("s3-good-client", 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore("queue");
    };
    open.onerror = () => resolve(undefined);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction("queue", "readonly");
      const request = tx.objectStore("queue").get(key);
      request.onerror = () => {
        db.close();
        resolve(undefined);
      };
      request.onsuccess = () => {
        db.close();
        resolve(request.result as PersistedQueueState | undefined);
      };
    };
  });
}

function toSerializableHeaders(
  headers: HeadersInit | (() => Promise<HeadersInit> | HeadersInit) | undefined,
): HeadersInit | undefined {
  if (!headers || typeof headers === "function") return undefined;
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers;
}

export function createS3GoodClient<TRouter extends FileRouter>(
  opts: CreateS3GoodClientOptions = {},
) {
  const uploader = genUploader<TRouter>({ url: opts.url });
  const queueCfg: Required<QueueOptions> = {
    ...DEFAULT_QUEUE,
    ...(opts.queue ?? {}),
    concurrency: Math.max(
      1,
      Math.floor(opts.queue?.concurrency ?? DEFAULT_QUEUE.concurrency),
    ),
  };
  const retryCfg: Required<RetryOptions> = {
    ...DEFAULT_RETRY,
    ...(opts.retry ?? {}),
    maxAttempts: Math.max(
      1,
      Math.floor(opts.retry?.maxAttempts ?? DEFAULT_RETRY.maxAttempts),
    ),
  };
  const resumeEnabled = opts.resume?.enabled ?? true;
  const storageKey = buildStorageKey(opts);

  const pending: Array<QueueJob<TRouter, inferEndpoints<TRouter>>> = [];
  const active = new Map<string, QueueJob<TRouter, inferEndpoints<TRouter>>>();
  const jobs = new Map<string, QueueJob<TRouter, inferEndpoints<TRouter>>>();
  const snapshots = new Map<string, UploadJobSnapshot>();
  const persistedOptions = new Map<string, PersistedUploadOptions>();
  let idCounter = 0;
  let lastPersistAt = 0;
  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  const pruneSnapshots = () => {
    const terminal = Array.from(snapshots.values())
      .filter(
        (snapshot) =>
          snapshot.state === "completed" ||
          snapshot.state === "canceled" ||
          snapshot.state === "failed",
      )
      .sort((a, b) => a.updatedAt - b.updatedAt);
    const overflow = terminal.length - MAX_TERMINAL_SNAPSHOTS;
    if (overflow <= 0) return;
    for (let i = 0; i < overflow; i += 1) {
      const snapshot = terminal[i];
      if (snapshot) snapshots.delete(snapshot.id);
    }
  };

  const emit = (event: UploadLifecycleEvent) => {
    try {
      opts.onEvent?.(event);
    } catch {
      // Observer callbacks should not break upload control flow.
    }
  };

  const queueSnapshot = (): UploadQueueSnapshot => ({
    jobs: Array.from(snapshots.values()),
    activeCount: active.size,
  });

  const resumePersistedState = (): PersistedQueueState => {
    const jobs: PersistedUploadJob[] = [];
    for (const [id, snapshot] of snapshots.entries()) {
      if (
        snapshot.state !== "queued" &&
        snapshot.state !== "paused" &&
        snapshot.state !== "uploading"
      ) {
        continue;
      }
      const options = persistedOptions.get(id);
      if (!options) continue;
      jobs.push({
        id,
        endpoint: snapshot.endpoint,
        state: snapshot.state === "paused" ? "paused" : "queued",
        attempts: snapshot.attempts,
        progress: snapshot.progress,
        createdAt: snapshot.createdAt,
        updatedAt: Date.now(),
        options,
      });
    }
    return {
      version: 1,
      idCounter,
      jobs,
    };
  };

  const syncPersistence = (force = true) => {
    if (!resumeEnabled) return;
    const persistNow = () => {
      lastPersistAt = Date.now();
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
      void persistQueueSnapshot(storageKey, resumePersistedState());
    };
    if (force) {
      persistNow();
      return;
    }
    const elapsed = Date.now() - lastPersistAt;
    if (elapsed >= 500) {
      persistNow();
      return;
    }
    if (persistTimer) return;
    persistTimer = setTimeout(persistNow, 500 - elapsed);
  };

  const runNext = () => {
    while (active.size < queueCfg.concurrency && pending.length > 0) {
      const next = pending.shift();
      if (!next) return;
      if (next.snapshot.state !== "queued") continue;
      void runJob(next);
    }
  };

  const runJob = async (
    job: QueueJob<TRouter, inferEndpoints<TRouter>>,
  ): Promise<void> => {
    active.set(job.id, job);
    job.snapshot.state = "uploading";
    job.snapshot.updatedAt = Date.now();
    snapshots.set(job.id, { ...job.snapshot });
    emit({ type: "upload.started", jobId: job.id, endpoint: String(job.endpoint), attempt: job.snapshot.attempts + 1 });
    syncPersistence();

    try {
      for (let attempt = 1; attempt <= retryCfg.maxAttempts; attempt += 1) {
        job.snapshot.attempts = attempt;
        job.snapshot.updatedAt = Date.now();
        snapshots.set(job.id, { ...job.snapshot });
        syncPersistence();

        try {
          const result = await uploader.uploadFiles(job.endpoint, {
            ...job.opts,
            signal: job.controller.signal,
            onUploadProgress: (progressEvent) => {
              job.snapshot.progress = progressEvent.percentage;
              job.snapshot.updatedAt = Date.now();
              snapshots.set(job.id, { ...job.snapshot });
              emit({
                type: "upload.progress",
                jobId: job.id,
                endpoint: String(job.endpoint),
                attempt,
                progress: progressEvent.percentage,
              });
              job.opts.onUploadProgress?.(progressEvent.percentage);
              syncPersistence(false);
            },
          });

          job.snapshot.state = "completed";
          job.snapshot.progress = 100;
          job.snapshot.error = undefined;
          job.snapshot.updatedAt = Date.now();
          snapshots.set(job.id, { ...job.snapshot });
          persistedOptions.delete(job.id);
          jobs.delete(job.id);
          pruneSnapshots();
          emit({ type: "upload.completed", jobId: job.id, endpoint: String(job.endpoint), attempt });
          syncPersistence();
          job.resolve(result);
          return;
        } catch (error) {
          const abortReason = job.abortReason;
          if (abortReason === "pause") {
            job.snapshot.state = "paused";
            job.snapshot.updatedAt = Date.now();
            snapshots.set(job.id, { ...job.snapshot });
            emit({
              type: "upload.paused",
              jobId: job.id,
              endpoint: String(job.endpoint),
              attempt,
            });
            syncPersistence();
            return;
          }
          if (abortReason === "cancel") {
            job.snapshot.state = "canceled";
            job.snapshot.updatedAt = Date.now();
            snapshots.set(job.id, { ...job.snapshot });
            persistedOptions.delete(job.id);
            jobs.delete(job.id);
            pruneSnapshots();
            emit({
              type: "upload.canceled",
              jobId: job.id,
              endpoint: String(job.endpoint),
              attempt,
            });
            syncPersistence();
            job.resolve(undefined);
            return;
          }
          const normalized = toUploadError(error);
          const canRetry = isRetryableError(normalized) && attempt < retryCfg.maxAttempts;
          if (!canRetry) {
            throw normalized;
          }
          await sleep(computeBackoff(attempt, retryCfg));
        }
      }
    } catch (error) {
      const normalized = toUploadError(error);
      const isCanceled = job.abortReason === "cancel";
      job.snapshot.state = isCanceled ? "canceled" : "failed";
      job.snapshot.error = normalized;
      job.snapshot.updatedAt = Date.now();
      snapshots.set(job.id, { ...job.snapshot });
      persistedOptions.delete(job.id);
      jobs.delete(job.id);
      pruneSnapshots();
      emit({
        type: isCanceled ? "upload.canceled" : "upload.failed",
        jobId: job.id,
        endpoint: String(job.endpoint),
        attempt: job.snapshot.attempts,
        error: normalized,
      });
      syncPersistence();
      if (isCanceled) {
        job.resolve(undefined);
      } else {
        job.reject(normalized);
      }
    } finally {
      active.delete(job.id);
      runNext();
    }
  };

  function enqueueUpload<TEndpoint extends inferEndpoints<TRouter>>(
    endpoint: TEndpoint,
    uploadOpts: EnqueueUploadOptions<TRouter, TEndpoint>,
  ): UploadJobHandle {
    const id = `job_${Date.now()}_${++idCounter}`;
    const controller = new AbortController();

    let resolve!: (value: UploadFileResponse[] | undefined) => void;
    let reject!: (reason?: unknown) => void;
    const result = new Promise<UploadFileResponse[] | undefined>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const snapshot: UploadJobSnapshot = {
      id,
      endpoint: String(endpoint),
      state: "queued",
      attempts: 0,
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const job: QueueJob<TRouter, TEndpoint> = {
      id,
      endpoint,
      opts: uploadOpts,
      controller,
      snapshot,
      abortReason: null,
      resolve,
      reject,
    };

    const canPersist = typeof uploadOpts.headers !== "function";
    const serializableHeaders = toSerializableHeaders(uploadOpts.headers);
    if (resumeEnabled && !canPersist) {
      console.warn(
        "[s3-good] resume persistence skipped for job with function-based headers",
      );
    }

    snapshots.set(id, snapshot);
    jobs.set(id, job as QueueJob<TRouter, inferEndpoints<TRouter>>);
    if (canPersist) {
      persistedOptions.set(id, {
        files: uploadOpts.files,
        input: uploadOpts.input,
        headers: serializableHeaders,
      });
    }
    pending.push(job as QueueJob<TRouter, inferEndpoints<TRouter>>);
    emit({ type: "upload.enqueued", jobId: id, endpoint: String(endpoint) });
    syncPersistence();

    const start = () => runNext();
    const pause = () => {
      if (snapshot.state === "uploading") {
        job.abortReason = "pause";
        job.controller.abort();
      } else if (snapshot.state === "queued") {
        snapshot.state = "paused";
        snapshot.updatedAt = Date.now();
        const idx = pending.findIndex((entry) => entry.id === id);
        if (idx >= 0) pending.splice(idx, 1);
        snapshots.set(id, { ...snapshot });
        emit({ type: "upload.paused", jobId: id, endpoint: String(endpoint) });
        syncPersistence();
      }
    };

    const resume = () => {
      if (snapshot.state !== "paused") return;
      const newController = new AbortController();
      job.controller = newController;
      job.abortReason = null;
      snapshot.state = "queued";
      snapshot.updatedAt = Date.now();
      snapshots.set(id, { ...snapshot });
      pending.push(job as QueueJob<TRouter, inferEndpoints<TRouter>>);
      emit({ type: "upload.resumed", jobId: id, endpoint: String(endpoint) });
      syncPersistence();
      runNext();
    };

    const cancel = () => {
      if (snapshot.state === "canceled" || snapshot.state === "completed") return;
      const previousState = snapshot.state;
      job.abortReason = "cancel";
      snapshot.state = "canceled";
      snapshot.updatedAt = Date.now();
      snapshots.set(id, { ...snapshot });
      if (previousState === "queued" || previousState === "paused") {
        const idx = pending.findIndex((entry) => entry.id === id);
        if (idx >= 0) pending.splice(idx, 1);
        persistedOptions.delete(id);
        jobs.delete(id);
        pruneSnapshots();
        emit({ type: "upload.canceled", jobId: id, endpoint: String(endpoint) });
        job.resolve(undefined);
      } else {
        job.controller.abort();
      }
      syncPersistence();
    };

    if (queueCfg.autoStart) start();

    return { id, start, pause, resume, cancel, result };
  }

  const resumeJob = (jobId: string) => {
    const job = jobs.get(jobId);
    if (!job || job.snapshot.state !== "paused") return;
    const newController = new AbortController();
    job.controller = newController;
    job.abortReason = null;
    job.snapshot.state = "queued";
    job.snapshot.updatedAt = Date.now();
    snapshots.set(jobId, { ...job.snapshot });
    pending.push(job);
    emit({ type: "upload.resumed", jobId, endpoint: String(job.endpoint) });
    syncPersistence();
    runNext();
  };

  const cancelJob = (jobId: string) => {
    const job = jobs.get(jobId);
    if (!job) return;
    if (job.snapshot.state === "canceled" || job.snapshot.state === "completed") {
      return;
    }
    const previousState = job.snapshot.state;
    job.abortReason = "cancel";
    job.snapshot.state = "canceled";
    job.snapshot.updatedAt = Date.now();
    snapshots.set(jobId, { ...job.snapshot });
    if (previousState === "queued" || previousState === "paused") {
      const idx = pending.findIndex((entry) => entry.id === jobId);
      if (idx >= 0) pending.splice(idx, 1);
      persistedOptions.delete(jobId);
      jobs.delete(jobId);
      pruneSnapshots();
      emit({ type: "upload.canceled", jobId, endpoint: String(job.endpoint) });
      job.resolve(undefined);
    } else {
      job.controller.abort();
    }
    syncPersistence();
  };

  return {
    uploads: {
      uploadFiles: uploader.uploadFiles,
      createUpload: uploader.createUpload,
      enqueueUpload,
      getQueueState: queueSnapshot,
      resumeJob,
      cancelJob,
      resumePending: async () => {
        if (!resumeEnabled) {
          runNext();
          return;
        }
        const persisted = await loadQueueSnapshot(storageKey);
        if (persisted?.version === 1) {
          idCounter = Math.max(idCounter, persisted.idCounter);
          for (const job of persisted.jobs) {
            if (snapshots.has(job.id)) continue;

            let resolve!: (value: UploadFileResponse[] | undefined) => void;
            let reject!: (reason?: unknown) => void;
            const result = new Promise<UploadFileResponse[] | undefined>((res, rej) => {
              resolve = res;
              reject = rej;
            });
            // Restored jobs are detached from the original caller promise.
            void result.catch(() => undefined);

            const snapshot: UploadJobSnapshot = {
              id: job.id,
              endpoint: job.endpoint,
              state: job.state,
              attempts: job.attempts,
              progress: job.progress,
              createdAt: job.createdAt,
              updatedAt: Date.now(),
            };

            const queueJob: QueueJob<TRouter, inferEndpoints<TRouter>> = {
              id: job.id,
              endpoint: job.endpoint as inferEndpoints<TRouter>,
              opts: {
                files: job.options.files,
                input: job.options.input as inferEndpointInput<
                  TRouter,
                  inferEndpoints<TRouter>
                >,
                headers: job.options.headers,
              },
              controller: new AbortController(),
              snapshot,
              abortReason: null,
              resolve,
              reject,
            };

            snapshots.set(job.id, snapshot);
            persistedOptions.set(job.id, job.options);
            jobs.set(job.id, queueJob);
            if (job.state === "queued") {
              pending.push(queueJob);
            }
          }
          syncPersistence();
        }
        runNext();
      },
    },
    events: {
      emit,
    },
  };
}
