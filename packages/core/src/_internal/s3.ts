import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Error } from "@s3-good/shared";
import type { S3Config } from "@s3-good/shared";

// ---------------------------------------------------------------------------
// S3 Client Factory — lazy initialization with singleton caching per config
// ---------------------------------------------------------------------------

interface CacheEntry {
  client: S3Client;
  createdAt: number;
}

const clientCache = new Map<string, CacheEntry>();

/** Default TTL for cached S3 clients (5 minutes). */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/** Minimum interval between full cache sweeps (60 seconds). */
const CLEANUP_INTERVAL_MS = 60 * 1000;

let lastCleanup = 0;

function isExpired(entry: CacheEntry, ttlMs: number): boolean {
  return Date.now() - entry.createdAt > ttlMs;
}

/**
 * Sweeps the entire cache and removes expired entries.
 *
 * Runs at most once per {@link CLEANUP_INTERVAL_MS} to avoid scanning on every
 * cache access. This piggybacks on normal `getS3Client` calls so no timers are
 * needed.
 */
function cleanupExpired(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, entry] of clientCache) {
    if (isExpired(entry, DEFAULT_TTL_MS)) {
      clientCache.delete(key);
    }
  }
}

function configToKey(config: S3Config): string {
  return `${config.region}:${config.bucket}:${config.accessKeyId}:${config.endpoint ?? "default"}:${config.sessionToken ?? "none"}`;
}

/**
 * Returns a cached {@link S3Client} for the given config.
 *
 * The client is created lazily on first call and reused for subsequent calls
 * with the same config (keyed by region + bucket + accessKeyId + endpoint +
 * sessionToken).
 *
 * Cache entries expire after {@link DEFAULT_TTL_MS} (5 minutes) so that stale
 * clients with expired credentials are evicted automatically.
 */
export function getS3Client(config: S3Config): S3Client {
  const key = configToKey(config);
  const cached = clientCache.get(key);

  if (cached && !isExpired(cached, DEFAULT_TTL_MS)) {
    return cached.client;
  }

  // Entry missing or expired — remove stale entry if present
  if (cached) {
    clientCache.delete(key);
  }

  const client = new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      ...(config.sessionToken && { sessionToken: config.sessionToken }),
    },
    ...(config.endpoint && { endpoint: config.endpoint }),
    forcePathStyle: config.forcePathStyle ?? false,
    // Disable automatic checksum computation. AWS SDK v3 enables flexible
    // checksums by default which bakes a CRC32 of the (empty) body into
    // presigned URLs. When the browser later PUTs actual file data the
    // checksum mismatches and S3 returns 403 SignatureDoesNotMatch.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  clientCache.set(key, { client, createdAt: Date.now() });

  // Piggyback cleanup on cache writes to avoid timer leaks
  cleanupExpired();

  return client;
}

// ---------------------------------------------------------------------------
// File URL Construction
// ---------------------------------------------------------------------------

/**
 * Constructs the public URL for a file stored in S3.
 *
 * Resolution order:
 * 1. If `config.baseUrl` is set, use it as the prefix.
 * 2. If `config.forcePathStyle` is true, use path-style addressing.
 * 3. Otherwise, use virtual-hosted-style addressing.
 */
export function getFileUrl(config: S3Config, key: string): string {
  if (config.baseUrl) {
    return `${config.baseUrl.replace(/\/$/, "")}/${key}`;
  }
  if (config.forcePathStyle) {
    const endpoint =
      config.endpoint ?? `https://s3.${config.region}.amazonaws.com`;
    return `${endpoint}/${config.bucket}/${key}`;
  }
  return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
}

// ---------------------------------------------------------------------------
// Content Disposition
// ---------------------------------------------------------------------------

/**
 * Determines the Content-Disposition for a file based on its MIME type.
 *
 * - Images and videos default to `"inline"` (rendered in the browser).
 * - Everything else defaults to `"attachment"` (triggers download).
 * - An explicit override always takes precedence.
 */
export function getContentDisposition(
  contentType: string,
  configDisposition?: "inline" | "attachment",
): "inline" | "attachment" {
  if (configDisposition) return configDisposition;
  // Default: inline for images/videos, attachment for others
  if (contentType.startsWith("image/") || contentType.startsWith("video/")) {
    return "inline";
  }
  return "attachment";
}

// ---------------------------------------------------------------------------
// Presigned URL Generation
// ---------------------------------------------------------------------------

export interface PresignedUrlOptions {
  bucket: string;
  key: string;
  contentType: string;
  /**
   * Content-Disposition value for the S3 object.
   *
   * **Note:** This is intentionally NOT included in the presigned URL signature.
   * The AWS SDK presigner does not hoist `Content-Disposition` to a query
   * parameter (unlike `Content-Type`), so it becomes a signed header that the
   * client must send verbatim. Since browser upload code typically doesn't send
   * this header, including it causes 403 SignatureDoesNotMatch errors.
   *
   * Content-Disposition is still tracked in the upload metadata for reference
   * but is not part of the S3 PUT signature.
   */
  contentDisposition?: "inline" | "attachment";
  /** URL expiry in seconds. Defaults to 3600 (1 hour). */
  expiresIn?: number;
  /**
   * Base64-encoded SHA-256 checksum (tracked in metadata only).
   *
   * Checksums are NOT embedded in presigned URLs because they require the
   * client to send exact header values that match the signature. Instead,
   * integrity is verified server-side via HeadObject on the upload callback —
   * S3 automatically computes checksums (CRC64NVME since Dec 2024).
   */
  checksumSHA256?: string;
}

/**
 * Generates a presigned PUT URL for uploading a single file to S3.
 *
 * Only `Bucket`, `Key`, and `ContentType` are included in the command.
 * `ContentDisposition` and checksum fields are intentionally excluded to avoid
 * signed-header mismatches — the presigner does not hoist these to query
 * parameters, so the client would need to send them as exact headers.
 */
export async function generatePresignedPutUrl(
  s3: S3Client,
  opts: PresignedUrlOptions,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: opts.bucket,
    Key: opts.key,
    ContentType: opts.contentType,
  });

  return getSignedUrl(s3, command, {
    expiresIn: opts.expiresIn ?? 3600,
  });
}

export interface FilePresignedUrl {
  key: string;
  url: string;
  name: string;
  fileType: string;
  /** Base64-encoded SHA-256 checksum the browser must send as a header. */
  checksumSHA256?: string;
}

/**
 * Generates presigned PUT URLs for a batch of files in parallel.
 */
export async function generatePresignedUrls(
  s3: S3Client,
  files: Array<{
    key: string;
    name: string;
    contentType: string;
    contentDisposition?: "inline" | "attachment";
    checksumSHA256?: string;
  }>,
  bucket: string,
): Promise<FilePresignedUrl[]> {
  return Promise.all(
    files.map(async (file) => ({
      key: file.key,
      url: await generatePresignedPutUrl(s3, {
        bucket,
        key: file.key,
        contentType: file.contentType,
        contentDisposition: file.contentDisposition,
        checksumSHA256: file.checksumSHA256,
      }),
      name: file.name,
      fileType: file.contentType,
      ...(file.checksumSHA256 && { checksumSHA256: file.checksumSHA256 }),
    })),
  );
}

// ---------------------------------------------------------------------------
// Browser Operations
// ---------------------------------------------------------------------------

export interface ListObjectsOptions {
  bucket: string;
  /** Prefix to filter objects (acts as "folder path"). */
  prefix?: string;
  /** Delimiter for folder grouping. Defaults to `/`. */
  delimiter?: string;
  /** Maximum number of keys to return. Defaults to 1000. */
  maxKeys?: number;
  /** Continuation token for pagination. */
  continuationToken?: string;
}

export interface ListObjectsResult {
  objects: Array<{
    key: string;
    size: number;
    lastModified: Date;
    etag?: string;
  }>;
  folders: string[];
  nextContinuationToken?: string;
  isTruncated: boolean;
}

/**
 * Lists objects and common prefixes from a bucket prefix.
 */
export async function listObjects(
  s3: S3Client,
  opts: ListObjectsOptions,
): Promise<ListObjectsResult> {
  const command = new ListObjectsV2Command({
    Bucket: opts.bucket,
    Prefix: opts.prefix,
    Delimiter: opts.delimiter ?? "/",
    MaxKeys: opts.maxKeys ?? 1000,
    ContinuationToken: opts.continuationToken,
  });

  const response = await s3.send(command);

  return {
    objects: (response.Contents ?? [])
      .filter((obj) => obj.Key && obj.Key !== opts.prefix)
      .map((obj) => ({
        key: obj.Key!,
        size: obj.Size ?? 0,
        lastModified: obj.LastModified ?? new Date(0),
        etag: obj.ETag,
      })),
    folders: (response.CommonPrefixes ?? [])
      .map((cp) => cp.Prefix)
      .filter((prefix): prefix is string => Boolean(prefix)),
    nextContinuationToken: response.NextContinuationToken,
    isTruncated: response.IsTruncated ?? false,
  };
}

/**
 * Deletes a single object by key.
 */
export async function deleteObject(
  s3: S3Client,
  opts: { bucket: string; key: string },
): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: opts.bucket,
    Key: opts.key,
  });
  await s3.send(command);
}

/**
 * Deletes multiple objects, automatically batching into chunks of 1000.
 */
export async function deleteObjects(
  s3: S3Client,
  opts: { bucket: string; keys: string[] },
): Promise<{
  deleted: string[];
  errors: Array<{ key: string; message: string }>;
}> {
  if (opts.keys.length === 0) {
    return { deleted: [], errors: [] };
  }

  const allDeleted: string[] = [];
  const allErrors: Array<{ key: string; message: string }> = [];

  for (let i = 0; i < opts.keys.length; i += 1000) {
    const batch = opts.keys.slice(i, i + 1000);
    const command = new DeleteObjectsCommand({
      Bucket: opts.bucket,
      Delete: {
        Objects: batch.map((key) => ({ Key: key })),
        Quiet: false,
      },
    });

    const response = await s3.send(command);
    allDeleted.push(
      ...(response.Deleted ?? [])
        .map((item) => item.Key)
        .filter((key): key is string => Boolean(key)),
    );
    allErrors.push(
      ...(response.Errors ?? []).map((item) => ({
        key: item.Key ?? "unknown",
        message: item.Message ?? "Unknown error",
      })),
    );
  }

  return { deleted: allDeleted, errors: allErrors };
}

function encodeCopySource(bucket: string, key: string): string {
  const encodedKey = encodeURIComponent(key).replace(/%2F/g, "/");
  return `${bucket}/${encodedKey}`;
}

/**
 * Copies an object to a destination key in the same bucket.
 */
export async function copyObject(
  s3: S3Client,
  opts: { bucket: string; sourceKey: string; destinationKey: string },
): Promise<void> {
  const command = new CopyObjectCommand({
    Bucket: opts.bucket,
    CopySource: encodeCopySource(opts.bucket, opts.sourceKey),
    Key: opts.destinationKey,
  });
  await s3.send(command);
}

export interface PresignedGetUrlOptions {
  bucket: string;
  key: string;
  /** URL expiry in seconds. Defaults to 3600 (1 hour). */
  expiresIn?: number;
  /** Force download with Content-Disposition: attachment */
  forceDownload?: boolean;
  /** Override filename in Content-Disposition if forceDownload=true */
  downloadFilename?: string;
}

/**
 * Generates a presigned GET URL for download or preview.
 */
export async function generatePresignedGetUrl(
  s3: S3Client,
  opts: PresignedGetUrlOptions,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: opts.bucket,
    Key: opts.key,
    ...(opts.forceDownload && {
      ResponseContentDisposition: opts.downloadFilename
        ? `attachment; filename="${opts.downloadFilename}"`
        : "attachment",
    }),
  });

  return getSignedUrl(s3, command, {
    expiresIn: opts.expiresIn ?? 3600,
  });
}

/**
 * Creates a folder marker object (0-byte object ending with `/`).
 */
export async function putEmptyObject(
  s3: S3Client,
  opts: { bucket: string; key: string },
): Promise<void> {
  const key = opts.key.endsWith("/") ? opts.key : `${opts.key}/`;
  const command = new PutObjectCommand({
    Bucket: opts.bucket,
    Key: key,
    Body: "",
    ContentLength: 0,
    ContentType: "application/x-directory",
  });
  await s3.send(command);
}

// ---------------------------------------------------------------------------
// Multipart Upload — Part Size Calculation
// ---------------------------------------------------------------------------

/** Files ≥ 50 MB use multipart upload. */
export const MULTIPART_THRESHOLD = 50 * 1024 * 1024; // 50 MB
const DEFAULT_PART_SIZE = 10 * 1024 * 1024; // 10 MB
const MIN_PART_SIZE = 5 * 1024 * 1024; // 5 MB (AWS minimum)
const MAX_PARTS = 10_000; // AWS limit

/**
 * Determines whether a file should use multipart upload and calculates the
 * optimal part size and count.
 *
 * - Files below {@link MULTIPART_THRESHOLD} (50 MB) are uploaded as a single
 *   PUT and return `isMultipart: false`.
 * - The default part size is 10 MB. If a custom `partSize` is provided it is
 *   clamped to the AWS minimum of 5 MB.
 * - If the resulting part count exceeds the AWS limit of 10 000 parts the part
 *   size is automatically increased.
 */
export function calculateParts(
  fileSize: number,
  partSize?: number,
): { isMultipart: boolean; partSize: number; partCount: number } {
  if (fileSize < MULTIPART_THRESHOLD) {
    return { isMultipart: false, partSize: fileSize, partCount: 1 };
  }

  const size = Math.max(partSize ?? DEFAULT_PART_SIZE, MIN_PART_SIZE);
  const count = Math.ceil(fileSize / size);

  if (count > MAX_PARTS) {
    // Increase part size to fit within MAX_PARTS
    const adjustedSize = Math.ceil(fileSize / MAX_PARTS);
    return {
      isMultipart: true,
      partSize: adjustedSize,
      partCount: Math.ceil(fileSize / adjustedSize),
    };
  }

  return { isMultipart: true, partSize: size, partCount: count };
}

// ---------------------------------------------------------------------------
// Multipart Upload — S3 Operations
// ---------------------------------------------------------------------------

/**
 * Initiates a multipart upload and returns the upload ID assigned by S3.
 *
 * @throws {S3Error} If S3 does not return an UploadId.
 */
export async function createMultipartUpload(
  s3: S3Client,
  opts: { bucket: string; key: string; contentType: string },
): Promise<{ uploadId: string }> {
  const command = new CreateMultipartUploadCommand({
    Bucket: opts.bucket,
    Key: opts.key,
    ContentType: opts.contentType,
  });
  const response = await s3.send(command);
  if (!response.UploadId) {
    throw new S3Error(
      "Failed to create multipart upload: no UploadId returned",
    );
  }
  return { uploadId: response.UploadId };
}

/** A presigned URL for uploading a single part of a multipart upload. */
export interface MultipartPresignedUrl {
  partNumber: number;
  url: string;
}

/**
 * Generates presigned PUT URLs for every part of a multipart upload.
 *
 * Part numbers are 1-indexed (as required by S3). All URLs are generated in
 * parallel for maximum throughput.
 */
export async function generatePresignedPartUrls(
  s3: S3Client,
  opts: {
    bucket: string;
    key: string;
    uploadId: string;
    partCount: number;
    expiresIn?: number;
  },
): Promise<MultipartPresignedUrl[]> {
  const urls = await Promise.all(
    Array.from({ length: opts.partCount }, async (_, i) => {
      const command = new UploadPartCommand({
        Bucket: opts.bucket,
        Key: opts.key,
        UploadId: opts.uploadId,
        PartNumber: i + 1,
      });
      const url = await getSignedUrl(s3, command, {
        expiresIn: opts.expiresIn ?? 3600,
      });
      return { partNumber: i + 1, url };
    }),
  );
  return urls;
}

/** A completed part with its ETag (as returned by S3 after upload). */
export interface CompletedPart {
  partNumber: number;
  etag: string;
}

/**
 * Completes a multipart upload by assembling the uploaded parts.
 *
 * Parts are sorted by `partNumber` before being sent to S3 (an AWS
 * requirement). ETags should be preserved exactly as returned by S3 (including
 * surrounding quotes).
 */
export async function completeMultipartUpload(
  s3: S3Client,
  opts: {
    bucket: string;
    key: string;
    uploadId: string;
    parts: CompletedPart[];
  },
): Promise<{ location: string }> {
  // Sort parts by partNumber (AWS requirement)
  const sortedParts = [...opts.parts].sort(
    (a, b) => a.partNumber - b.partNumber,
  );

  const command = new CompleteMultipartUploadCommand({
    Bucket: opts.bucket,
    Key: opts.key,
    UploadId: opts.uploadId,
    MultipartUpload: {
      Parts: sortedParts.map((p) => ({
        PartNumber: p.partNumber,
        ETag: p.etag,
      })),
    },
  });
  const response = await s3.send(command);
  return { location: response.Location ?? "" };
}

/**
 * Aborts an in-progress multipart upload, releasing all uploaded parts.
 *
 * This should be called when an upload is cancelled or fails irrecoverably to
 * avoid orphaned parts incurring storage costs.
 */
export async function abortMultipartUpload(
  s3: S3Client,
  opts: { bucket: string; key: string; uploadId: string },
): Promise<void> {
  const command = new AbortMultipartUploadCommand({
    Bucket: opts.bucket,
    Key: opts.key,
    UploadId: opts.uploadId,
  });
  await s3.send(command);
}

// ---------------------------------------------------------------------------
// Cache Management (testing utility)
// ---------------------------------------------------------------------------

/**
 * Clears the internal S3 client cache. Intended for testing only.
 */
export function clearS3ClientCache(): void {
  clientCache.clear();
  lastCleanup = 0;
}
