import { UploadError } from "@s3-good/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percentage: number;
}

export interface XhrUploadOptions {
  url: string;
  file: File | Blob;
  contentType: string;
  onProgress?: (event: UploadProgressEvent) => void;
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Step 1: Single file XHR upload
// ---------------------------------------------------------------------------

/**
 * Uploads a single file (or blob chunk) to S3 via a presigned PUT URL using
 * XMLHttpRequest.
 *
 * XHR is used instead of `fetch` because `xhr.upload.onprogress` provides
 * real-time upload progress events — something `fetch` does not support.
 *
 * @returns The ETag header from the S3 response (needed for multipart completion).
 */
export function uploadFileViaXhr(
  opts: XhrUploadOptions,
): Promise<{ etag?: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Abort support via AbortSignal
    if (opts.signal) {
      if (opts.signal.aborted) {
        reject(
          new UploadError({
            code: "UPLOAD_FAILED",
            message: "Upload aborted",
          }),
        );
        return;
      }

      opts.signal.addEventListener("abort", () => {
        xhr.abort();
        reject(
          new UploadError({
            code: "UPLOAD_FAILED",
            message: "Upload aborted",
          }),
        );
      });
    }

    // Progress tracking
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && opts.onProgress) {
        opts.onProgress({
          loaded: e.loaded,
          total: e.total,
          percentage: Math.round((e.loaded / e.total) * 100),
        });
      }
    });

    // Success handler
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag") ?? undefined;
        resolve({ etag });
      } else {
        reject(
          new UploadError({
            code: "UPLOAD_FAILED",
            message: `Upload failed with status ${xhr.status}`,
          }),
        );
      }
    });

    // Network error handler
    xhr.addEventListener("error", () => {
      reject(
        new UploadError({
          code: "UPLOAD_FAILED",
          message: "Network error during upload",
        }),
      );
    });

    xhr.open("PUT", opts.url);
    xhr.setRequestHeader("Content-Type", opts.contentType);
    xhr.send(opts.file);
  });
}

// ---------------------------------------------------------------------------
// Step 2: Multipart upload with concurrency
// ---------------------------------------------------------------------------

const MAX_CONCURRENT_UPLOADS = 6;

export interface MultipartUploadOptions {
  file: File;
  parts: Array<{ partNumber: number; url: string }>;
  chunkSize: number;
  onProgress?: (event: UploadProgressEvent) => void;
  signal?: AbortSignal;
}

/**
 * Uploads a large file in parts using presigned URLs with concurrent workers.
 *
 * Parts are sliced from the file using `File.slice()` (which creates a Blob
 * view without copying data) and uploaded in parallel with a concurrency limit
 * of {@link MAX_CONCURRENT_UPLOADS} (6).
 *
 * Progress is aggregated across all parts and reported via `onProgress`.
 *
 * @returns Sorted array of completed parts with their ETags.
 */
export async function uploadMultipartViaXhr(
  opts: MultipartUploadOptions,
): Promise<Array<{ partNumber: number; etag: string }>> {
  const completedParts: Array<{ partNumber: number; etag: string }> = [];
  const partProgress = new Map<number, number>();
  const totalSize = opts.file.size;

  // Track aggregate progress across all parts
  function updateProgress() {
    if (!opts.onProgress) return;
    const loaded = Array.from(partProgress.values()).reduce(
      (sum, v) => sum + v,
      0,
    );
    opts.onProgress({
      loaded,
      total: totalSize,
      percentage: Math.round((loaded / totalSize) * 100),
    });
  }

  // Upload parts with concurrency limit using worker pattern
  const queue = [...opts.parts];
  const workers = Array.from(
    { length: Math.min(MAX_CONCURRENT_UPLOADS, queue.length) },
    async () => {
      while (queue.length > 0) {
        const part = queue.shift()!;
        const start = (part.partNumber - 1) * opts.chunkSize;
        const end = Math.min(start + opts.chunkSize, opts.file.size);
        const chunk = opts.file.slice(start, end);

        const result = await uploadFileViaXhr({
          url: part.url,
          file: chunk,
          contentType: opts.file.type,
          onProgress: (e) => {
            partProgress.set(part.partNumber, e.loaded);
            updateProgress();
          },
          signal: opts.signal,
        });

        if (!result.etag) {
          throw new UploadError({
            code: "UPLOAD_FAILED",
            message: `Missing ETag for part ${part.partNumber}`,
          });
        }

        completedParts.push({
          partNumber: part.partNumber,
          etag: result.etag,
        });
      }
    },
  );

  await Promise.all(workers);
  return completedParts.sort((a, b) => a.partNumber - b.partNumber);
}

// ---------------------------------------------------------------------------
// Step 3: Part status check (HEAD requests)
// ---------------------------------------------------------------------------

export interface PartStatus {
  partNumber: number;
  uploaded: boolean;
  etag?: string;
}

/**
 * Checks which parts of a multipart upload have already been uploaded by
 * sending HEAD requests to each part's presigned URL.
 *
 * Parts that return a 2xx response are considered uploaded; their ETag is
 * captured for later use in the complete-multipart call.
 */
export async function checkUploadedParts(
  parts: Array<{ partNumber: number; url: string }>,
  signal?: AbortSignal,
): Promise<PartStatus[]> {
  const statuses = await Promise.all(
    parts.map(async (part) => {
      try {
        const response = await fetch(part.url, {
          method: "HEAD",
          signal,
        });
        if (response.ok) {
          const etag = response.headers.get("ETag") ?? undefined;
          return { partNumber: part.partNumber, uploaded: true, etag };
        }
        return { partNumber: part.partNumber, uploaded: false };
      } catch {
        return { partNumber: part.partNumber, uploaded: false };
      }
    }),
  );
  return statuses;
}

// ---------------------------------------------------------------------------
// Step 4: Resumable multipart upload
// ---------------------------------------------------------------------------

export interface ResumableUploadOptions extends MultipartUploadOptions {
  /** Previously completed parts (from a prior attempt) */
  completedParts?: Array<{ partNumber: number; etag: string }>;
  /** Whether to check S3 for already-uploaded parts via HEAD requests */
  checkExisting?: boolean;
}

/**
 * Uploads a large file in parts, skipping any parts that have already been
 * uploaded. This enables resuming an interrupted multipart upload without
 * re-uploading completed parts.
 *
 * Completed parts can be supplied directly via `completedParts`, or
 * discovered automatically by setting `checkExisting: true` (which sends
 * HEAD requests to each part's presigned URL).
 *
 * Progress reporting accounts for already-completed parts so the percentage
 * starts from the correct offset rather than 0%.
 *
 * @returns Sorted array of all parts (both previously completed and newly uploaded) with ETags.
 */
export async function uploadMultipartResumable(
  opts: ResumableUploadOptions,
): Promise<Array<{ partNumber: number; etag: string }>> {
  let alreadyCompleted: Array<{ partNumber: number; etag: string }> = [];

  if (opts.completedParts) {
    alreadyCompleted = opts.completedParts;
  } else if (opts.checkExisting) {
    const statuses = await checkUploadedParts(opts.parts, opts.signal);
    alreadyCompleted = statuses
      .filter((s): s is PartStatus & { etag: string } => s.uploaded && !!s.etag)
      .map((s) => ({ partNumber: s.partNumber, etag: s.etag }));
  }

  // Filter out already-completed parts
  const completedNumbers = new Set(alreadyCompleted.map((p) => p.partNumber));
  const remainingParts = opts.parts.filter(
    (p) => !completedNumbers.has(p.partNumber),
  );

  if (remainingParts.length === 0) {
    return alreadyCompleted;
  }

  // Calculate progress offset from completed parts
  const completedBytes = alreadyCompleted.length * opts.chunkSize;

  // Upload remaining parts
  const newParts = await uploadMultipartViaXhr({
    ...opts,
    parts: remainingParts,
    onProgress: opts.onProgress
      ? (e) => {
          opts.onProgress!({
            loaded: completedBytes + e.loaded,
            total: opts.file.size,
            percentage: Math.round(
              ((completedBytes + e.loaded) / opts.file.size) * 100,
            ),
          });
        }
      : undefined,
  });

  return [...alreadyCompleted, ...newParts].sort(
    (a, b) => a.partNumber - b.partNumber,
  );
}

// ---------------------------------------------------------------------------
// Step 5: Upload state persistence
// ---------------------------------------------------------------------------

export interface UploadState {
  fileKey: string;
  uploadId: string;
  completedParts: Array<{ partNumber: number; etag: string }>;
  totalParts: number;
  chunkSize: number;
  fileName: string;
  fileSize: number;
  timestamp: number;
}

const STORAGE_KEY_PREFIX = "s3-good-upload-";

/**
 * Persists the current upload state to `localStorage` so it can be recovered
 * after a page reload or browser restart.
 *
 * Silently no-ops when `localStorage` is unavailable (SSR, private browsing
 * with storage disabled, etc.).
 */
export function saveUploadState(state: UploadState): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${state.fileKey}`;
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // localStorage may not be available (SSR, private browsing)
  }
}

/**
 * Loads a previously saved upload state from `localStorage`.
 *
 * Returns `null` if no state exists for the given key, if the stored data is
 * corrupt, or if the state has expired (older than 24 hours). Expired entries
 * are automatically cleaned up.
 */
export function loadUploadState(fileKey: string): UploadState | null {
  try {
    const key = `${STORAGE_KEY_PREFIX}${fileKey}`;
    const data = localStorage.getItem(key);
    if (!data) return null;
    const state = JSON.parse(data) as UploadState;
    // Expire after 24 hours
    if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(key);
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

/**
 * Removes a saved upload state from `localStorage`.
 *
 * Should be called after a multipart upload completes successfully or is
 * explicitly cancelled.
 */
export function clearUploadState(fileKey: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${fileKey}`);
  } catch {
    // Ignore — localStorage may not be available
  }
}

// ---------------------------------------------------------------------------
// Step 6: Unified upload function
// ---------------------------------------------------------------------------

export interface FileUploadOptions {
  file: File;
  presignedData: {
    key: string;
    /** Presigned PUT URL for simple (single-request) upload. */
    url?: string;
    /** Base64-encoded SHA-256 checksum to send with the upload. */
    checksumSHA256?: string;
    /** S3 multipart upload ID. */
    uploadId?: string;
    /** Presigned URLs for each part of a multipart upload. */
    parts?: Array<{ partNumber: number; url: string }>;
    /** Chunk size in bytes for multipart uploads. */
    chunkSize?: number;
    /** Number of chunks for multipart uploads. */
    chunkCount?: number;
  };
  onProgress?: (event: UploadProgressEvent) => void;
  signal?: AbortSignal;
}

/**
 * Unified upload function that handles both simple and multipart uploads.
 *
 * Inspects `presignedData` to determine the upload strategy:
 * - If `url` is present → simple single-request PUT upload.
 * - If `parts` and `chunkSize` are present → multipart upload with concurrency.
 *
 * @returns The file key and (for multipart) the completed part ETags.
 */
export async function uploadFile(
  opts: FileUploadOptions,
): Promise<{
  key: string;
  etags?: Array<{ partNumber: number; etag: string }>;
}> {
  if (opts.presignedData.url) {
    // Simple upload
    await uploadFileViaXhr({
      url: opts.presignedData.url,
      file: opts.file,
      contentType: opts.file.type,
      onProgress: opts.onProgress,
      signal: opts.signal,
    });
    return { key: opts.presignedData.key };
  } else if (opts.presignedData.parts && opts.presignedData.chunkSize) {
    // Multipart upload
    const etags = await uploadMultipartViaXhr({
      file: opts.file,
      parts: opts.presignedData.parts,
      chunkSize: opts.presignedData.chunkSize,
      onProgress: opts.onProgress,
      signal: opts.signal,
    });
    return { key: opts.presignedData.key, etags };
  }

  throw new UploadError({
    code: "INTERNAL_ERROR",
    message: "Invalid presigned data",
  });
}
