import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock @aws-sdk/client-s3 before importing source modules
vi.mock("@aws-sdk/client-s3", () => {
  let instanceCount = 0;
  const MockS3Client = vi.fn().mockImplementation(() => ({
    send: vi.fn(),
    _instanceId: ++instanceCount,
  }));
  return {
    S3Client: MockS3Client,
    PutObjectCommand: vi.fn(),
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

import type { S3Config } from "@s3-good-internal/shared";
import { getS3Client, clearS3ClientCache } from "../_internal/s3";

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes — mirrors source constant
const CLEANUP_INTERVAL_MS = 60 * 1000; // 60 seconds — mirrors source constant

describe("S3 Client Cache Expiry (Task 19)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearS3ClientCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseConfig: S3Config = {
    region: "us-east-1",
    bucket: "my-bucket",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  };

  it("test cache returns same client within TTL", () => {
    const client1 = getS3Client(baseConfig);

    // Advance time to just before TTL expiry
    vi.advanceTimersByTime(DEFAULT_TTL_MS - 1000);

    const client2 = getS3Client(baseConfig);

    expect(client1).toBe(client2);
  });

  it("test cache creates new client after TTL", () => {
    const client1 = getS3Client(baseConfig);

    // Advance time past TTL
    vi.advanceTimersByTime(DEFAULT_TTL_MS + 1);

    const client2 = getS3Client(baseConfig);

    expect(client1).not.toBe(client2);
  });

  it("test expired entries cleaned up", () => {
    const configA: S3Config = { ...baseConfig, region: "us-east-1" };
    const configB: S3Config = { ...baseConfig, region: "eu-west-1" };

    // Create two clients
    const clientA1 = getS3Client(configA);
    const clientB1 = getS3Client(configB);

    // Advance past TTL + cleanup interval so cleanup sweep runs
    vi.advanceTimersByTime(DEFAULT_TTL_MS + CLEANUP_INTERVAL_MS + 1);

    // Creating a new client triggers cleanup of expired entries
    const clientA2 = getS3Client(configA);

    // clientA should be a new instance (old one expired)
    expect(clientA2).not.toBe(clientA1);

    // clientB should also be expired — requesting it should give a new instance
    const clientB2 = getS3Client(configB);
    expect(clientB2).not.toBe(clientB1);
  });

  it("test clearS3ClientCache removes all entries", () => {
    const client1 = getS3Client(baseConfig);

    clearS3ClientCache();

    const client2 = getS3Client(baseConfig);

    expect(client1).not.toBe(client2);
  });
});
