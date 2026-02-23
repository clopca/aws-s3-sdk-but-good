import type { S3Config } from "@s3-good/shared";
import { getFileUrl, getS3Client } from "../_internal/s3";
import { setupBucket, validateBucketCors } from "./setup";
import type { SetupOptions } from "./setup";

export { setupBucket, validateBucketCors } from "./setup";
export type { SetupOptions } from "./setup";

/**
 * High-level API for interacting with S3.
 *
 * Wraps the low-level S3 client operations behind a simple interface.
 * Upload / delete / list methods will be added in subsequent tasks.
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

  // Other methods (upload, delete, list) will be added in tasks 16+
}
