import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @aws-sdk/client-s3
const mockSend = vi.fn();
vi.mock("@aws-sdk/client-s3", () => {
  const MockS3Client = vi.fn().mockImplementation(() => ({
    send: mockSend,
  }));
  return {
    S3Client: MockS3Client,
    PutObjectCommand: vi.fn(),
    PutBucketCorsCommand: vi
      .fn()
      .mockImplementation((input) => ({ _type: "PutBucketCors", input })),
    GetBucketCorsCommand: vi
      .fn()
      .mockImplementation((input) => ({ _type: "GetBucketCors", input })),
    PutBucketLifecycleConfigurationCommand: vi
      .fn()
      .mockImplementation((input) => ({
        _type: "PutBucketLifecycleConfiguration",
        input,
      })),
    CreateMultipartUploadCommand: vi.fn(),
    CompleteMultipartUploadCommand: vi.fn(),
    AbortMultipartUploadCommand: vi.fn(),
    UploadPartCommand: vi.fn(),
    ListObjectsV2Command: vi.fn(),
    DeleteObjectCommand: vi.fn(),
    DeleteObjectsCommand: vi.fn(),
    CopyObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
  };
});

// Mock @aws-sdk/s3-request-presigner (needed because s3.ts imports it)
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

import type { S3Config } from "@s3-good/shared";
import {
  PutBucketCorsCommand,
  PutBucketLifecycleConfigurationCommand,
} from "@aws-sdk/client-s3";
import { setupBucket, validateBucketCors } from "../sdk/setup";
import { clearS3ClientCache } from "../_internal/s3";

describe("Setup Utility", () => {
  const config: S3Config = {
    region: "us-east-1",
    bucket: "my-bucket",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearS3ClientCache();
    // Default: all sends succeed
    mockSend.mockResolvedValue({});
  });

  it("test_setupBucket_configures_cors", async () => {
    const result = await setupBucket(config);

    expect(result.cors).toBe(true);
    expect(PutBucketCorsCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: "my-bucket",
        CORSConfiguration: expect.objectContaining({
          CORSRules: expect.arrayContaining([
            expect.objectContaining({
              AllowedMethods: ["GET", "PUT", "HEAD"],
              ExposeHeaders: expect.arrayContaining(["ETag"]),
            }),
          ]),
        }),
      }),
    );
  });

  it("test_setupBucket_configures_lifecycle", async () => {
    const result = await setupBucket(config);

    expect(result.lifecycle).toBe(true);
    expect(PutBucketLifecycleConfigurationCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: "my-bucket",
        LifecycleConfiguration: expect.objectContaining({
          Rules: expect.arrayContaining([
            expect.objectContaining({
              ID: "s3-good-abort-incomplete-multipart",
              Status: "Enabled",
            }),
          ]),
        }),
      }),
    );
  });

  it("test_setupBucket_custom_origins", async () => {
    await setupBucket(config, {
      allowedOrigins: ["https://app.com"],
    });

    expect(PutBucketCorsCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        CORSConfiguration: expect.objectContaining({
          CORSRules: expect.arrayContaining([
            expect.objectContaining({
              AllowedOrigins: ["https://app.com"],
            }),
          ]),
        }),
      }),
    );
  });
});

describe("Validate Bucket CORS", () => {
  const config: S3Config = {
    region: "us-east-1",
    bucket: "my-bucket",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearS3ClientCache();
  });

  it("test_validateBucketCors_valid", async () => {
    mockSend.mockResolvedValueOnce({
      CORSRules: [
        {
          AllowedMethods: ["GET", "PUT", "HEAD"],
          AllowedOrigins: ["*"],
          ExposeHeaders: ["ETag", "Content-Length"],
        },
      ],
    });

    const result = await validateBucketCors(config);

    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("test_validateBucketCors_missing_etag", async () => {
    mockSend.mockResolvedValueOnce({
      CORSRules: [
        {
          AllowedMethods: ["GET", "PUT", "HEAD"],
          AllowedOrigins: ["*"],
          ExposeHeaders: ["Content-Length"],
          // Missing ETag in ExposeHeaders
        },
      ],
    });

    const result = await validateBucketCors(config);

    expect(result.isValid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
