import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type {
  FileRouter,
  inferEndpointInput,
  inferEndpoints,
  PermittedFileInfo,
} from "s3-good/types";
import type { UploadFileResponse } from "s3-good/types";
import { UploadError, parseFileSize } from "s3-good/types";
import {
  createS3GoodClient,
  type UploadJobSnapshot,
  type QueueOptions,
  type RetryOptions,
  type ResumeOptions,
} from "s3-good/client";

// ─── Hook Types ─────────────────────────────────────────────────────────────

export interface UseUploadProps<
  TRouter extends FileRouter,
  TEndpoint extends inferEndpoints<TRouter>,
> {
  endpoint: TEndpoint;
  onUploadBegin?: (fileName: string) => void;
  onUploadProgress?: (progress: number) => void;
  onClientUploadComplete?: (
    res: UploadFileResponse<TRouter[TEndpoint]["_output"]>[],
  ) => void;
  onUploadError?: (error: UploadError) => void;
  headers?: HeadersInit | (() => Promise<HeadersInit> | HeadersInit);
  queue?: QueueOptions;
  retry?: RetryOptions;
  resume?: ResumeOptions;
}

export interface UseUploadReturn<
  TRouter extends FileRouter,
  TEndpoint extends inferEndpoints<TRouter>,
> {
  startUpload: (
    files: File[],
    input?: inferEndpointInput<TRouter, TEndpoint>,
  ) => Promise<
    UploadFileResponse<TRouter[TEndpoint]["_output"]>[] | undefined
  >;
  isUploading: boolean;
  progress: number;
  abort: () => void;
  enqueue: (
    files: File[],
    input?: inferEndpointInput<TRouter, TEndpoint>,
  ) => string;
  pause: (jobId: string) => void;
  resume: (jobId: string) => void;
  cancel: (jobId: string) => void;
  retry: (jobId: string) => void;
  jobs: UploadJobSnapshot[];
  activeCount: number;
  queueSize: number;
  failedCount: number;
  /** Permitted file info fetched from the server GET endpoint */
  permittedFileInfo: PermittedFileInfo | undefined;
}

type HighLevelClient<TRouter extends FileRouter> = ReturnType<
  typeof createS3GoodClient<TRouter>
>;

function areJobSnapshotsEqual(
  prev: UploadJobSnapshot[],
  next: UploadJobSnapshot[],
): boolean {
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i += 1) {
    const a = prev[i];
    const b = next[i];
    if (!a || !b) return false;
    if (
      a.id !== b.id ||
      a.state !== b.state ||
      a.progress !== b.progress ||
      a.attempts !== b.attempts
    ) {
      return false;
    }
  }
  return true;
}

function parseFileSizeToBytes(size: string | undefined): number {
  if (!size) return 0;
  try {
    return parseFileSize(size as Parameters<typeof parseFileSize>[0]);
  } catch {
    return 0;
  }
}

// ─── Hook Implementation ────────────────────────────────────────────────────

export function useUpload<
  TRouter extends FileRouter,
  TEndpoint extends inferEndpoints<TRouter>,
>(
  endpoint: TEndpoint,
  opts?: Omit<UseUploadProps<TRouter, TEndpoint>, "endpoint">,
  uploaderOpts?: { url?: string; client?: HighLevelClient<TRouter> },
): UseUploadReturn<TRouter, TEndpoint> {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobs, setJobs] = useState<UploadJobSnapshot[]>([]);
  const [permittedFileInfo, setPermittedFileInfo] = useState<
    PermittedFileInfo | undefined
  >(undefined);
  const currentJobIdRef = useRef<string | null>(null);
  const uploadCountRef = useRef(0);
  const lastArgsRef = useRef<
    Record<string, { files: File[]; input?: inferEndpointInput<TRouter, TEndpoint> }>
  >({});
  const jobHandlesRef = useRef<
    Record<string, { pause: () => void; resume: () => void; cancel: () => void }>
  >({});
  const rafRef = useRef<number | null>(null);
  const queueRafRef = useRef<number | null>(null);
  const pendingQueueStateRef = useRef<UploadJobSnapshot[] | null>(null);
  const url = uploaderOpts?.url ?? "/api/upload";
  const sharedClient = uploaderOpts?.client;
  const queueConcurrency = opts?.queue?.concurrency;
  const queueAutoStart = opts?.queue?.autoStart;
  const retryMaxAttempts = opts?.retry?.maxAttempts;
  const retryBaseDelayMs = opts?.retry?.baseDelayMs;
  const retryMaxDelayMs = opts?.retry?.maxDelayMs;
  const retryJitter = opts?.retry?.jitter;
  const resumeEnabled = opts?.resume?.enabled;
  const resumeStorageKey = opts?.resume?.storageKey;

  // Debounce progress updates via requestAnimationFrame
  const debouncedSetProgress = useCallback((value: number) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setProgress(value);
      rafRef.current = null;
    });
  }, []);

  const scheduleQueueStateSync = useCallback(() => {
    const queueState = clientRef.current?.uploads.getQueueState();
    if (!queueState) return;
    pendingQueueStateRef.current = queueState.jobs;
    if (queueRafRef.current !== null) return;
    queueRafRef.current = requestAnimationFrame(() => {
      const nextJobs = pendingQueueStateRef.current ?? [];
      setJobs((prev) => (areJobSnapshotsEqual(prev, nextJobs) ? prev : nextJobs));
      setIsUploading((prev) => {
        const next = nextJobs.some((job) => job.state === "uploading");
        return prev === next ? prev : next;
      });
      queueRafRef.current = null;
    });
  }, []);

  const client = useMemo(
    () => {
      if (sharedClient) return sharedClient;
      return createS3GoodClient<TRouter>({
        url,
        queue: opts?.queue,
        retry: opts?.retry,
        resume: opts?.resume,
      });
    },
    // opts includes callback refs; only include config sections that affect client behavior.
    [
      url,
      queueConcurrency,
      queueAutoStart,
      retryMaxAttempts,
      retryBaseDelayMs,
      retryMaxDelayMs,
      retryJitter,
      resumeEnabled,
      resumeStorageKey,
      sharedClient,
    ],
  );
  const clientRef = useRef(client);
  clientRef.current = client;

  useEffect(() => {
    scheduleQueueStateSync();
    const unsubscribe = client.events?.subscribe?.(() => {
      scheduleQueueStateSync();
    });
    return () => {
      unsubscribe?.();
    };
  }, [client, scheduleQueueStateSync]);

  // Fetch permitted file info from the server GET endpoint on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchPermittedFileInfo() {
      try {
        const res = await fetch(`${url}?slug=${String(endpoint)}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          config: Record<
            string,
            { maxFileSize?: string; maxFileCount?: number }
          >;
        };
        if (cancelled) return;

        const config = data.config;
        const fileTypes = Object.keys(config);
        const maxFileSize = Object.values(config).reduce(
          (max, v) => {
            const candidate = v.maxFileSize;
            if (!candidate) return max;
            return parseFileSizeToBytes(candidate) > parseFileSizeToBytes(max)
              ? candidate
              : max;
          },
          "0MB",
        );
        const maxFileCount = Object.values(config).reduce((max, v) => {
          return Math.max(max, v.maxFileCount ?? 1);
        }, 1);

        setPermittedFileInfo({
          slug: String(endpoint),
          config: config as PermittedFileInfo["config"],
          fileTypes,
          maxFileSize,
          maxFileCount,
        });
      } catch {
        // Silently fail — components will work without permitted info
      }
    }

    fetchPermittedFileInfo();

    return () => {
      cancelled = true;
    };
  }, [endpoint, url]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const handle of Object.values(jobHandlesRef.current)) {
        handle.cancel();
      }
      jobHandlesRef.current = {};
      lastArgsRef.current = {};
      currentJobIdRef.current = null;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (queueRafRef.current !== null) cancelAnimationFrame(queueRafRef.current);
      pendingQueueStateRef.current = null;
    };
  }, []);

  const startUpload = useCallback(
    async (
      files: File[],
      input?: inferEndpointInput<TRouter, TEndpoint>,
    ) => {
      const currentUpload = ++uploadCountRef.current;
      let handleId: string | undefined;

      setIsUploading(true);
      setProgress(0);

      try {
        const handle = client.uploads.enqueueUpload(endpoint, {
          files,
          input,
          headers: opts?.headers,
          onUploadBegin: opts?.onUploadBegin,
          onUploadProgress: (p) => {
            if (currentUpload === uploadCountRef.current) {
              debouncedSetProgress(p);
              opts?.onUploadProgress?.(p);
            }
          },
        });
        jobHandlesRef.current[handle.id] = {
          pause: handle.pause,
          resume: handle.resume,
          cancel: handle.cancel,
        };
        handleId = handle.id;
        lastArgsRef.current[handleId] = { files, input };
        currentJobIdRef.current = handleId;
        const result = await handle.result;

        if (currentUpload === uploadCountRef.current) {
          setIsUploading(false);
          if (result) {
            setProgress(100);
            opts?.onClientUploadComplete?.(
              result as UploadFileResponse<TRouter[TEndpoint]["_output"]>[],
            );
          } else {
            setProgress(0);
          }
        }

        return result as
          | UploadFileResponse<TRouter[TEndpoint]["_output"]>[]
          | undefined;
      } catch (error) {
        if (currentUpload === uploadCountRef.current) {
          setIsUploading(false);
          setProgress(0);
          if (error instanceof UploadError) {
            opts?.onUploadError?.(error);
          }
        }
        return undefined;
      } finally {
        if (handleId) {
          delete jobHandlesRef.current[handleId];
          if (currentJobIdRef.current === handleId) {
            currentJobIdRef.current = null;
          }
        }
      }
    },
    [endpoint, opts, client, debouncedSetProgress],
  );

  const abort = useCallback(() => {
    uploadCountRef.current += 1;
    if (currentJobIdRef.current) {
      jobHandlesRef.current[currentJobIdRef.current]?.cancel();
    }
    currentJobIdRef.current = null;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setIsUploading(false);
    setProgress(0);
  }, []);

  const enqueue = useCallback(
    (files: File[], input?: inferEndpointInput<TRouter, TEndpoint>) => {
      const handle = client.uploads.enqueueUpload(endpoint, {
        files,
        input,
        headers: opts?.headers,
        onUploadBegin: opts?.onUploadBegin,
        onUploadProgress: (p) => opts?.onUploadProgress?.(p),
      });
      jobHandlesRef.current[handle.id] = {
        pause: handle.pause,
        resume: handle.resume,
        cancel: handle.cancel,
      };
      lastArgsRef.current[handle.id] = { files, input };
      void handle.result
        .then((res) => {
          if (res) {
            opts?.onClientUploadComplete?.(
              res as UploadFileResponse<TRouter[TEndpoint]["_output"]>[],
            );
          }
          delete lastArgsRef.current[handle.id];
        })
        .catch((error) => {
          if (error instanceof UploadError) opts?.onUploadError?.(error);
        })
        .finally(() => {
          delete jobHandlesRef.current[handle.id];
        });
      return handle.id;
    },
    [client, endpoint, opts],
  );

  const pause = useCallback((jobId: string) => {
    const handle = jobHandlesRef.current[jobId];
    if (handle) {
      handle.pause();
      return;
    }
    client.uploads.pauseJob?.(jobId);
  }, [client]);
  const resume = useCallback((jobId: string) => {
    const handle = jobHandlesRef.current[jobId];
    if (handle) {
      handle.resume();
      return;
    }
    client.uploads.resumeJob?.(jobId);
  }, [client]);
  const cancel = useCallback((jobId: string) => {
    const handle = jobHandlesRef.current[jobId];
    if (handle) {
      handle.cancel();
      return;
    }
    client.uploads.cancelJob?.(jobId);
  }, [client]);
  const retry = useCallback(
    (jobId: string) => {
      const args = lastArgsRef.current[jobId];
      if (!args) return;
      enqueue(args.files, args.input);
    },
    [enqueue],
  );

  const { activeCount, queueSize, failedCount } = useMemo(() => {
    let nextActiveCount = 0;
    let nextQueueSize = 0;
    let nextFailedCount = 0;
    for (const job of jobs) {
      if (job.state === "uploading") nextActiveCount += 1;
      else if (job.state === "queued") nextQueueSize += 1;
      else if (job.state === "failed") nextFailedCount += 1;
    }
    return {
      activeCount: nextActiveCount,
      queueSize: nextQueueSize,
      failedCount: nextFailedCount,
    };
  }, [jobs]);

  return {
    startUpload,
    isUploading,
    progress,
    abort,
    enqueue,
    pause,
    resume,
    cancel,
    retry,
    jobs,
    activeCount,
    queueSize,
    failedCount,
    permittedFileInfo,
  };
}
