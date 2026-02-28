import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type {
  FileRouter,
  inferEndpointInput,
  inferEndpoints,
  PermittedFileInfo,
} from "@s3-good/core/types";
import type { UploadFileResponse } from "@s3-good/shared";
import { UploadError } from "@s3-good/shared";
import {
  createS3GoodClient,
  type UploadJobSnapshot,
  type QueueOptions,
  type RetryOptions,
  type ResumeOptions,
} from "@s3-good/core/client";

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

// ─── Hook Implementation ────────────────────────────────────────────────────

export function useUpload<
  TRouter extends FileRouter,
  TEndpoint extends inferEndpoints<TRouter>,
>(
  endpoint: TEndpoint,
  opts?: Omit<UseUploadProps<TRouter, TEndpoint>, "endpoint">,
  uploaderOpts?: { url?: string },
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
  const url = uploaderOpts?.url ?? "/api/upload";

  // Debounce progress updates via requestAnimationFrame
  const debouncedSetProgress = useCallback((value: number) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setProgress(value);
      rafRef.current = null;
    });
  }, []);

  const client = useMemo(
    () =>
      createS3GoodClient<TRouter>({
        url,
        queue: opts?.queue,
        retry: opts?.retry,
        resume: opts?.resume,
        onEvent: () => {
          const queueState = clientRef.current?.uploads.getQueueState();
          if (!queueState) return;
          setJobs(queueState.jobs);
          setIsUploading(queueState.activeCount > 0);
        },
      }),
    // opts includes callback refs; only include config sections that affect client behavior.
    [url, opts?.queue, opts?.retry, opts?.resume],
  );
  const clientRef = useRef(client);
  clientRef.current = client;

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
            return v.maxFileSize && v.maxFileSize > max
              ? v.maxFileSize
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
      if (currentJobIdRef.current) {
        jobHandlesRef.current[currentJobIdRef.current]?.cancel();
      }
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
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
          setProgress(100);
          opts?.onClientUploadComplete?.(
            result as UploadFileResponse<TRouter[TEndpoint]["_output"]>[],
          );
        }

        return result as UploadFileResponse<
          TRouter[TEndpoint]["_output"]
        >[];
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
    if (currentJobIdRef.current) {
      jobHandlesRef.current[currentJobIdRef.current]?.cancel();
    }
    currentJobIdRef.current = null;
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
        })
        .catch((error) => {
          if (error instanceof UploadError) opts?.onUploadError?.(error);
        });
      return handle.id;
    },
    [client, endpoint, opts],
  );

  const pause = useCallback((jobId: string) => {
    jobHandlesRef.current[jobId]?.pause();
  }, []);
  const resume = useCallback((jobId: string) => {
    jobHandlesRef.current[jobId]?.resume();
  }, []);
  const cancel = useCallback((jobId: string) => {
    jobHandlesRef.current[jobId]?.cancel();
  }, []);
  const retry = useCallback(
    (jobId: string) => {
      const args = lastArgsRef.current[jobId];
      if (!args) return;
      enqueue(args.files, args.input);
    },
    [enqueue],
  );

  const activeCount = jobs.filter((job) => job.state === "uploading").length;
  const queueSize = jobs.filter((job) => job.state === "queued").length;
  const failedCount = jobs.filter((job) => job.state === "failed").length;

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
