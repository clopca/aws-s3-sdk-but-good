import { HeadObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import type { S3Config, UploadedFile, UploadFileResponse } from "@s3-good/shared";
import { UploadError } from "@s3-good/shared";
import type { FileRoute, AnyParams } from "./types";
import {
  getS3Client,
  getFileUrl,
  completeMultipartUpload,
} from "./s3";
import { decodeMetadataToken } from "./handler";

// ─── File Metadata Resolution ───────────────────────────────────────────────

/**
 * Resolves the full metadata for an uploaded file by combining the metadata
 * token data (primary source) with a HeadObject call to S3 for
 * verification/enrichment.
 *
 * The metadata token (set during the upload request phase in Task 21) contains
 * the original file name, size, and MIME type. HeadObject provides the
 * authoritative size after upload and may update the content type.
 *
 * If HeadObject fails (e.g. due to eventual consistency), the token data is
 * used as a fallback.
 */
export async function resolveFileMetadata(
  s3: S3Client,
  bucket: string,
  key: string,
  config: S3Config,
  tokenData: {
    fileNames: Record<string, string>;
    fileSizes: Record<string, number>;
    fileTypes: Record<string, string>;
    fileChecksums?: Record<string, string>;
  },
): Promise<UploadedFile> {
  // Primary source: metadata token (set during upload request in Task 21)
  const name = tokenData.fileNames[key] ?? key.split("/").pop() ?? key;
  let size = tokenData.fileSizes[key] ?? 0;
  let type = tokenData.fileTypes[key] ?? "application/octet-stream";
  const expectedChecksum = tokenData.fileChecksums?.[key];

  // Enrich/verify with HeadObject from S3 (authoritative for size after upload)
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
      // Enable checksum retrieval so S3 returns ChecksumSHA256 if present
      ...(expectedChecksum && { ChecksumMode: "ENABLED" as const }),
    });
    const response = await s3.send(command);
    size = response.ContentLength ?? size;
    if (response.ContentType) type = response.ContentType;

    // Verify integrity: compare the checksum S3 stored with what the browser computed
    if (expectedChecksum) {
      const actualChecksum = response.ChecksumSHA256;
      if (actualChecksum && actualChecksum !== expectedChecksum) {
        throw new UploadError({
          code: "INTEGRITY_CHECK_FAILED",
          message: `SHA-256 checksum mismatch for "${key}": expected ${expectedChecksum}, got ${actualChecksum}`,
        });
      }
    }
  } catch (error) {
    // Re-throw integrity errors — they must not be swallowed
    if (error instanceof UploadError && error.code === "INTEGRITY_CHECK_FAILED") {
      throw error;
    }
    // Fallback to token data if HEAD fails (e.g. eventual consistency)
  }

  return {
    key,
    url: getFileUrl(config, key),
    name,
    size,
    type,
  };
}

// ─── Upload Callback Handler ────────────────────────────────────────────────

export interface UploadCompletionData {
  fileKeys: string[];
  fileEtags?: Record<string, Array<{ partNumber: number; etag: string }>>;
}

/**
 * Handles the upload completion callback flow:
 *
 * 1. Decodes and verifies the metadata token
 * 2. Validates that file keys match the token (prevents tampering)
 * 3. Completes multipart uploads in S3 if needed
 * 4. Resolves file metadata from S3 (enriched with token data)
 * 5. Runs `onUploadComplete` for each file
 * 6. Returns `UploadFileResponse[]` with serverData
 *
 * If `onUploadComplete` throws, `onUploadError` is called (if defined) and
 * the error is propagated.
 */
export async function handleUploadCallback(
  route: FileRoute<AnyParams>,
  config: S3Config,
  metadataToken: string,
  completionData: UploadCompletionData,
): Promise<UploadFileResponse[]> {
  // 1. Decode and verify metadata token
  const uploadMetadata = decodeMetadataToken(
    metadataToken,
    config.signingSecret ?? config.secretAccessKey,
  );

  // 2. Verify file keys match
  const expectedKeys = new Set(uploadMetadata.fileKeys);
  for (const key of completionData.fileKeys) {
    if (!expectedKeys.has(key)) {
      throw new UploadError({
        code: "INTERNAL_ERROR",
        message: "File key mismatch — possible tampering",
      });
    }
  }

  // 3. Complete multipart uploads for each file that has etags
  const s3 = getS3Client(config);
  if (completionData.fileEtags && uploadMetadata.uploadIds) {
    await Promise.all(
      completionData.fileKeys.map(async (key) => {
        const etags = completionData.fileEtags?.[key];
        const uploadId = uploadMetadata.uploadIds?.[key];
        if (etags && uploadId) {
          await completeMultipartUpload(s3, {
            bucket: config.bucket,
            key,
            uploadId,
            parts: etags,
          });
        }
      }),
    );
  }

  // 4. Resolve file metadata from S3 (enriched with token data)
  const files = await Promise.all(
    completionData.fileKeys.map((key) =>
      resolveFileMetadata(s3, config.bucket, key, config, {
        fileNames: uploadMetadata.fileNames,
        fileSizes: uploadMetadata.fileSizes ?? {},
        fileTypes: uploadMetadata.fileTypes ?? {},
        fileChecksums: uploadMetadata.fileChecksums,
      }),
    ),
  );

  // 5. Run onUploadComplete for each file
  const results = await Promise.all(
    files.map(async (file) => {
      try {
        const serverData: unknown = await route._def.onUploadComplete({
          metadata: uploadMetadata.metadata,
          file,
        });
        return { ...file, serverData };
      } catch (error) {
        // Call onUploadError if defined
        if (route._def.onUploadError) {
          await route._def.onUploadError({
            error:
              error instanceof UploadError
                ? error
                : new UploadError({
                    code: "INTERNAL_ERROR",
                    message: error instanceof Error ? error.message : String(error),
                  }),
            fileKey: file.key,
          });
        }
        throw error;
      }
    }),
  );

  return results;
}
