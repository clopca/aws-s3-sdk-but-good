import type { S3Config } from "../types";
import {
  copyObject,
  deleteObject,
  deleteObjects,
  generatePresignedGetUrl,
  getFileUrl,
  getS3Client,
  listObjects,
  putEmptyObject,
} from "../_internal/s3";
import type { ListObjectsResult } from "../_internal/s3";
import { setupBucket, validateBucketCors } from "./setup";
import type { SetupOptions } from "./setup";

export { setupBucket, validateBucketCors } from "./setup";
export type { SetupOptions } from "./setup";

/**
 * High-level API for interacting with S3.
 *
 * Wraps low-level S3 client operations behind a simple interface.
 */
export class S3Api {
  private config: S3Config;

  constructor(config: S3Config) {
    this.config = config;
  }

  /** Returns the public URL for a file stored under the given key. */
  getFileUrl(key: string): string {
    return getFileUrl(this.config, key);
  }

  /**
   * Returns a presigned GET URL for downloading/viewing a file.
   *
   * @param key     - The S3 object key.
   * @param expiresIn - URL expiry in seconds (default 3600 = 1 hour).
   */
  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const s3 = getS3Client(this.config);
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });
    return getSignedUrl(s3, command, { expiresIn: expiresIn ?? 3600 });
  }

  /**
   * Configures the bucket for use with the upload SDK.
   *
   * Sets up CORS rules (allowing browser uploads) and a lifecycle rule
   * to auto-abort incomplete multipart uploads.
   */
  async setupBucket(
    opts?: SetupOptions,
  ): Promise<{ cors: boolean; lifecycle: boolean }> {
    return setupBucket(this.config, opts);
  }

  /**
   * Validates that the bucket has the required CORS configuration
   * for browser-based uploads.
   */
  async validateCors(): Promise<{ isValid: boolean; issues: string[] }> {
    return validateBucketCors(this.config);
  }

  /**
   * Lists objects and folders under an optional prefix.
   */
  async list(opts?: {
    prefix?: string;
    maxKeys?: number;
    continuationToken?: string;
  }): Promise<ListObjectsResult> {
    const s3 = getS3Client(this.config);
    return listObjects(s3, {
      bucket: this.config.bucket,
      ...opts,
    });
  }

  /**
   * Deletes a single object by key.
   */
  async delete(key: string): Promise<void> {
    const s3 = getS3Client(this.config);
    await deleteObject(s3, { bucket: this.config.bucket, key });
  }

  /**
   * Deletes multiple objects by key.
   */
  async deleteMany(keys: string[]): Promise<{
    deleted: string[];
    errors: Array<{ key: string; message: string }>;
  }> {
    const s3 = getS3Client(this.config);
    return deleteObjects(s3, { bucket: this.config.bucket, keys });
  }

  /**
   * Copies an object to a destination key in the same bucket.
   */
  async copy(sourceKey: string, destinationKey: string): Promise<void> {
    const s3 = getS3Client(this.config);
    await copyObject(s3, {
      bucket: this.config.bucket,
      sourceKey,
      destinationKey,
    });
  }

  /**
   * Moves an object (copy + delete source).
   */
  async move(sourceKey: string, destinationKey: string): Promise<void> {
    await this.copy(sourceKey, destinationKey);
    await this.delete(sourceKey);
  }

  /**
   * Renames an object while preserving its parent prefix.
   */
  async rename(key: string, newName: string): Promise<void> {
    const lastSlash = key.lastIndexOf("/");
    const prefix = lastSlash >= 0 ? key.slice(0, lastSlash + 1) : "";
    await this.move(key, `${prefix}${newName}`);
  }

  /**
   * Creates a folder marker key ending in `/`.
   */
  async createFolder(prefix: string, name: string): Promise<void> {
    const s3 = getS3Client(this.config);
    const normalizedPrefix = prefix === "" || prefix.endsWith("/")
      ? prefix
      : `${prefix}/`;
    await putEmptyObject(s3, {
      bucket: this.config.bucket,
      key: `${normalizedPrefix}${name}/`,
    });
  }

  /**
   * Returns a presigned GET URL configured for file download.
   */
  async getDownloadUrl(
    key: string,
    opts?: { expiresIn?: number; filename?: string },
  ): Promise<string> {
    const s3 = getS3Client(this.config);
    return generatePresignedGetUrl(s3, {
      bucket: this.config.bucket,
      key,
      expiresIn: opts?.expiresIn,
      forceDownload: true,
      downloadFilename: opts?.filename,
    });
  }
}
