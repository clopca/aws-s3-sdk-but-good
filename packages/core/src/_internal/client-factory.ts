import type {
  FileRouter,
  inferEndpointInput,
  inferEndpoints,
} from "./types";
import type { UploadFileResponse } from "@s3-good/shared";
import { UploadError, computeSHA256 } from "@s3-good/shared";
import type { UploadProgressEvent } from "./upload-browser";
import { uploadFile } from "./upload-browser";
import { MULTIPART_THRESHOLD } from "./s3";

// ─── Client Types ───────────────────────────────────────────────────────────

export interface GenUploaderOptions {
  /** API endpoint URL (default: "/api/upload") */
  url?: string;
}

export interface UploadFilesOptions<
  TRouter extends FileRouter,
  TEndpoint extends inferEndpoints<TRouter>,
> {
  endpoint: TEndpoint;
  files: File[];
  input?: inferEndpointInput<TRouter, TEndpoint>;
  onUploadBegin?: (fileName: string) => void;
  onUploadProgress?: (progress: UploadProgressEvent) => void;
  headers?: HeadersInit | (() => Promise<HeadersInit> | HeadersInit);
  signal?: AbortSignal;
}

// ─── Server Communication ───────────────────────────────────────────────────

/**
 * Request presigned URLs from the server for the given files.
 * Sends file metadata to the upload endpoint and receives presigned URLs back.
 */
async function requestPresignedUrls(
  url: string,
  endpoint: string,
  files: Array<{ name: string; size: number; type: string; checksumSHA256?: string }>,
  input: unknown,
  headers?: HeadersInit,
): Promise<{
  files: Array<{
    key: string;
    url?: string;
    checksumSHA256?: string;
    uploadId?: string;
    parts?: Array<{ partNumber: number; url: string }>;
    chunkSize?: number;
    chunkCount?: number;
  }>;
  metadata: string;
}> {
  const response = await fetch(`${url}?slug=${endpoint}&actionType=upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      files: files.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
        ...(f.checksumSHA256 && { checksumSHA256: f.checksumSHA256 }),
      })),
      input,
    }),
  });

  if (!response.ok) {
    const error = (await response.json()) as {
      error?: { code?: string; message?: string };
    };
    throw new UploadError({
      code: (error.error?.code as "UPLOAD_FAILED") ?? "UPLOAD_FAILED",
      message: error.error?.message ?? "Upload request failed",
      status: response.status,
    });
  }

  return response.json() as Promise<{
    files: Array<{
      key: string;
      url?: string;
      checksumSHA256?: string;
      uploadId?: string;
      parts?: Array<{ partNumber: number; url: string }>;
      chunkSize?: number;
      chunkCount?: number;
    }>;
    metadata: string;
  }>;
}

/**
 * Notify the server that all files have been uploaded to S3.
 * The server will verify the uploads, run onUploadComplete callbacks,
 * and return the final file responses with serverData.
 */
async function notifyUploadComplete(
  url: string,
  endpoint: string,
  data: {
    fileKeys: string[];
    metadata: string;
    fileEtags?: Record<string, Array<{ partNumber: number; etag: string }>>;
  },
  headers?: HeadersInit,
): Promise<{ files: UploadFileResponse[] }> {
  const response = await fetch(
    `${url}?slug=${endpoint}&actionType=multipart-complete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    const error = (await response.json()) as {
      error?: { code?: string; message?: string };
    };
    throw new UploadError({
      code: (error.error?.code as "UPLOAD_FAILED") ?? "UPLOAD_FAILED",
      message: error.error?.message ?? "Upload completion failed",
    });
  }

  return response.json() as Promise<{ files: UploadFileResponse[] }>;
}

// ─── Factory ────────────────────────────────────────────────────────────────

/**
 * Creates typed upload functions bound to a FileRouter type.
 *
 * This is the client-side counterpart to `createUploader()`. The generic
 * parameter `TRouter` provides full type safety: endpoint names are
 * autocompleted and input types are inferred from the route's Zod schema.
 *
 * @example
 * ```ts
 * import { genUploader } from "@s3-good/core/client";
 * import type { OurFileRouter } from "~/server/upload-router";
 *
 * const { uploadFiles } = genUploader<OurFileRouter>();
 *
 * const result = await uploadFiles("imageUploader", {
 *   files: [file],
 *   input: { category: "avatar" },
 * });
 * ```
 */
export function genUploader<TRouter extends FileRouter>(
  opts?: GenUploaderOptions,
) {
  const url = opts?.url ?? "/api/upload";

  /**
   * Upload files to a specific endpoint.
   *
   * Handles the full flow:
   * 1. POST to server → get presigned URLs
   * 2. Upload files to S3 via XHR (with progress tracking)
   * 3. Notify server of completion → get serverData
   */
  async function uploadFiles<TEndpoint extends inferEndpoints<TRouter>>(
    endpoint: TEndpoint,
    uploadOpts: Omit<UploadFilesOptions<TRouter, TEndpoint>, "endpoint">,
  ): Promise<UploadFileResponse[]> {
    const { files, input, onUploadBegin, onUploadProgress, headers, signal } =
      uploadOpts;
    const resolvedHeaders =
      typeof headers === "function" ? await headers() : headers;

    // 1. Compute SHA-256 checksums for single-part files (< MULTIPART_THRESHOLD)
    const fileMetadata = await Promise.all(
      files.map(async (f) => {
        const meta: { name: string; size: number; type: string; checksumSHA256?: string } = {
          name: f.name,
          size: f.size,
          type: f.type,
        };
        // Only compute checksums for files that will use single-part upload
        if (f.size < MULTIPART_THRESHOLD) {
          try {
            meta.checksumSHA256 = await computeSHA256(await f.arrayBuffer());
          } catch {
            // If checksum computation fails (e.g. no Web Crypto API), skip it
          }
        }
        return meta;
      }),
    );

    // 2. Request presigned URLs from server
    const presignedData = await requestPresignedUrls(
      url,
      endpoint as string,
      fileMetadata,
      input,
      resolvedHeaders,
    );

    // 3. Upload each file to S3
    const uploadResults = await Promise.all(
      files.map(async (file, i) => {
        onUploadBegin?.(file.name);
        const fileData = presignedData.files[i]!;
        return uploadFile({
          file,
          presignedData: fileData,
          onProgress: onUploadProgress,
          signal,
        });
      }),
    );

    // 4. Notify server of completion
    // Build per-file etags map for multipart uploads
    const fileEtags: Record<
      string,
      Array<{ partNumber: number; etag: string }>
    > = {};
    uploadResults.forEach((r) => {
      if (r.etags) {
        fileEtags[r.key] = r.etags;
      }
    });

    const result = await notifyUploadComplete(
      url,
      endpoint as string,
      {
        fileKeys: uploadResults.map((r) => r.key),
        metadata: presignedData.metadata,
        ...(Object.keys(fileEtags).length > 0 && { fileEtags }),
      },
      resolvedHeaders,
    );

    return result.files;
  }

  /**
   * Create a controllable upload handle for a specific endpoint.
   *
   * Returns an object with `done()` to trigger the upload and `abort()` to
   * cancel it. Useful when you need deferred start or abort capability.
   */
  function createUpload<TEndpoint extends inferEndpoints<TRouter>>(
    endpoint: TEndpoint,
    uploadOpts: Omit<
      UploadFilesOptions<TRouter, TEndpoint>,
      "endpoint" | "signal"
    >,
  ) {
    const controller = new AbortController();

    return {
      /** Execute the upload and return the results. */
      done: () =>
        uploadFiles(endpoint, { ...uploadOpts, signal: controller.signal }),
      /** Abort the in-progress upload. */
      abort: () => controller.abort(),
    };
  }

  return { uploadFiles, createUpload };
}
