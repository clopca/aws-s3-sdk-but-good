import {
  PutBucketCorsCommand,
  GetBucketCorsCommand,
  PutBucketLifecycleConfigurationCommand,
} from "@aws-sdk/client-s3";
import type { S3Config } from "@s3-good/shared";
import { S3Error } from "@s3-good/shared";
import { getS3Client } from "../_internal/s3";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SetupOptions {
  /** Allowed origins for CORS (default: ["*"]) */
  allowedOrigins?: string[];
  /** Days to keep incomplete multipart uploads (default: 1) */
  multipartExpiryDays?: number;
}

// ---------------------------------------------------------------------------
// Setup Bucket — configures CORS and lifecycle rules
// ---------------------------------------------------------------------------

/**
 * Configures an S3 bucket for use with the upload SDK.
 *
 * This sets up:
 * 1. **CORS** — Allows browser-based uploads (PUT, GET, HEAD) and exposes
 *    the ETag header required for multipart upload verification.
 * 2. **Lifecycle** — Automatically aborts incomplete multipart uploads after
 *    the specified number of days to prevent cost accumulation.
 *
 * This function should be called once during project setup, not on every request.
 */
export async function setupBucket(
  config: S3Config,
  opts?: SetupOptions,
): Promise<{ cors: boolean; lifecycle: boolean }> {
  const s3 = getS3Client(config);
  const results = { cors: false, lifecycle: false };

  // Configure CORS
  try {
    await s3.send(
      new PutBucketCorsCommand({
        Bucket: config.bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ["*"],
              AllowedMethods: ["GET", "PUT", "HEAD"],
              AllowedOrigins: opts?.allowedOrigins ?? ["*"],
              ExposeHeaders: ["ETag", "Content-Length", "Content-Type"],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      }),
    );
    results.cors = true;
  } catch (error) {
    throw new S3Error("Failed to configure CORS", error as Error);
  }

  // Configure lifecycle rule
  try {
    await s3.send(
      new PutBucketLifecycleConfigurationCommand({
        Bucket: config.bucket,
        LifecycleConfiguration: {
          Rules: [
            {
              ID: "s3-good-abort-incomplete-multipart",
              Status: "Enabled",
              Filter: {},
              AbortIncompleteMultipartUpload: {
                DaysAfterInitiation: opts?.multipartExpiryDays ?? 1,
              },
            },
          ],
        },
      }),
    );
    results.lifecycle = true;
  } catch (error) {
    throw new S3Error("Failed to configure lifecycle rule", error as Error);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Validate CORS — checks if the bucket has the required CORS configuration
// ---------------------------------------------------------------------------

/**
 * Validates that the S3 bucket has the CORS configuration required for
 * browser-based uploads.
 *
 * Checks for:
 * - A CORS rule that allows PUT and HEAD methods
 * - The ETag header exposed (required for multipart upload verification)
 */
export async function validateBucketCors(
  config: S3Config,
): Promise<{ isValid: boolean; issues: string[] }> {
  const s3 = getS3Client(config);
  const issues: string[] = [];

  try {
    const response = await s3.send(
      new GetBucketCorsCommand({
        Bucket: config.bucket,
      }),
    );

    const rules = response.CORSRules ?? [];
    const hasRule = rules.some((rule) => {
      const methods = rule.AllowedMethods ?? [];
      const exposedHeaders = rule.ExposeHeaders ?? [];
      return (
        methods.includes("PUT") &&
        methods.includes("HEAD") &&
        exposedHeaders.some((h) => h.toLowerCase() === "etag")
      );
    });

    if (!hasRule) {
      issues.push(
        "Missing CORS rule with PUT, HEAD methods and ETag exposed header",
      );
    }
  } catch {
    issues.push(
      "Unable to read CORS configuration — check IAM permissions",
    );
  }

  return { isValid: issues.length === 0, issues };
}
