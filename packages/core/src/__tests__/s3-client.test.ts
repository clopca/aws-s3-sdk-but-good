import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @aws-sdk/client-s3 before importing source modules
vi.mock("@aws-sdk/client-s3", () => {
  const MockS3Client = vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  }));
  return {
    S3Client: MockS3Client,
    PutObjectCommand: vi.fn(),
    CreateMultipartUploadCommand: vi.fn(),
    CompleteMultipartUploadCommand: vi.fn(),
    AbortMultipartUploadCommand: vi.fn(),
    UploadPartCommand: vi.fn(),
  };
});

import type { S3Config } from "@s3-good/shared";
import { getS3Client, getFileUrl, clearS3ClientCache } from "../_internal/s3";

describe("S3 Client Init", () => {
  beforeEach(() => {
    clearS3ClientCache();
    vi.clearAllMocks();
  });

  const baseConfig: S3Config = {
    region: "us-east-1",
    bucket: "my-bucket",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  };

  it("test_getS3Client_returns_client", () => {
    const client = getS3Client(baseConfig);
    expect(client).toBeDefined();
    expect(client).toHaveProperty("send");
  });

  it("test_getS3Client_caches_same_config", () => {
    const client1 = getS3Client(baseConfig);
    const client2 = getS3Client(baseConfig);
    expect(client1).toBe(client2);
  });

  it("test_getS3Client_different_configs", () => {
    const client1 = getS3Client(baseConfig);
    const client2 = getS3Client({
      ...baseConfig,
      region: "eu-west-1",
    });
    expect(client1).not.toBe(client2);
  });

  it("test_getFileUrl_virtual_hosted", () => {
    const url = getFileUrl(baseConfig, "photos/cat.jpg");
    expect(url).toBe(
      "https://my-bucket.s3.us-east-1.amazonaws.com/photos/cat.jpg",
    );
  });

  it("test_getFileUrl_path_style", () => {
    const config: S3Config = {
      ...baseConfig,
      forcePathStyle: true,
    };
    const url = getFileUrl(config, "photos/cat.jpg");
    expect(url).toBe(
      "https://s3.us-east-1.amazonaws.com/my-bucket/photos/cat.jpg",
    );
  });

  it("test_getFileUrl_with_baseUrl", () => {
    const config: S3Config = {
      ...baseConfig,
      baseUrl: "https://cdn.example.com",
    };
    const url = getFileUrl(config, "photos/cat.jpg");
    expect(url).toBe("https://cdn.example.com/photos/cat.jpg");
  });

  it("test_getFileUrl_baseUrl_trailing_slash", () => {
    const config: S3Config = {
      ...baseConfig,
      baseUrl: "https://cdn.example.com/",
    };
    const url = getFileUrl(config, "photos/cat.jpg");
    expect(url).toBe("https://cdn.example.com/photos/cat.jpg");
    expect(url).not.toContain("//photos");
  });
});
