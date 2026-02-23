import { useState, useCallback, useRef, useEffect } from "react";
import type {
  FileRouter,
  inferEndpointInput,
  inferEndpoints,
  PermittedFileInfo,
} from "@s3-good/core/types";
import type { UploadFileResponse } from "@s3-good/shared";
import { UploadError } from "@s3-good/shared";
import { genUploader } from "@s3-good/core/client";

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
  const [permittedFileInfo, setPermittedFileInfo] = useState<
    PermittedFileInfo | undefined
  >(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);
  const uploadCountRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const url = uploaderOpts?.url ?? "/api/upload";

  // Debounce progress updates via requestAnimationFrame
  function debouncedSetProgress(value: number) {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setProgress(value);
      rafRef.current = null;
    });
  }

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
      abortControllerRef.current?.abort();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const startUpload = useCallback(
    async (
      files: File[],
      input?: inferEndpointInput<TRouter, TEndpoint>,
    ) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const currentUpload = ++uploadCountRef.current;

      setIsUploading(true);
      setProgress(0);

      try {
        const { uploadFiles } = genUploader<TRouter>(uploaderOpts);

        const result = await uploadFiles(endpoint, {
          files,
          input,
          headers: opts?.headers,
          signal: controller.signal,
          onUploadBegin: opts?.onUploadBegin,
          onUploadProgress: (e) => {
            // Only update if this is still the current upload
            if (currentUpload === uploadCountRef.current) {
              debouncedSetProgress(e.percentage);
              opts?.onUploadProgress?.(e.percentage);
            }
          },
        });

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
      }
    },
    [endpoint, opts, uploaderOpts],
  );

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsUploading(false);
    setProgress(0);
  }, []);

  return { startUpload, isUploading, progress, abort, permittedFileInfo };
}
