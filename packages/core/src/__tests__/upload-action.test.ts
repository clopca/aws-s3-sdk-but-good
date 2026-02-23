import { describe, it, expect, vi, beforeEach } from "vitest";
import { UploadError } from "@s3-good/shared";
import type { S3Config } from "@s3-good/shared";

// ─── Mock S3 operations ─────────────────────────────────────────────────────

vi.mock("@aws-sdk/client-s3", () => {
  const MockS3Client = vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({
      UploadId: "mock-upload-id",
      ContentLength: 1024,
      ContentType: "image/jpeg",
    }),
  }));
  return {
    S3Client: MockS3Client,
    PutObjectCommand: vi.fn(),
    CreateMultipartUploadCommand: vi.fn(),
    CompleteMultipartUploadCommand: vi.fn(),
    AbortMultipartUploadCommand: vi.fn(),
    UploadPartCommand: vi.fn(),
    HeadObjectCommand: vi.fn(),
    ListObjectsV2Command: vi.fn(),
    DeleteObjectCommand: vi.fn(),
    DeleteObjectsCommand: vi.fn(),
    CopyObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://s3.example.com/presigned-url"),
}));

import type { FileRoute, AnyParams } from "../_internal/types";
import {
  encodeMetadataToken,
  decodeMetadataToken,
  handleUploadRequest,
  type UploadMetadata,
} from "../_internal/handler";
import { createRouteHandler } from "../server";
import { clearS3ClientCache } from "../_internal/s3";

// ─── Helpers ────────────────────────────────────────────────────────────────

const testConfig: S3Config = {
  region: "us-east-1",
  bucket: "test-bucket",
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "test-secret-key-for-hmac-signing",
};

function makeRoute(overrides?: Partial<FileRoute<AnyParams>["_def"]>): FileRoute<AnyParams> {
  return {
    _def: {
      routerConfig: { image: { maxFileSize: "4MB", maxFileCount: 5 } },
      inputParser: undefined,
      middleware: () => ({ userId: "user_123" }),
      onUploadComplete: ({ file }) => ({ url: file.url }),
      ...overrides,
    },
    _input: undefined as any,
    _metadata: undefined as any,
    _output: undefined as any,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("handleUploadRequest", () => {
  beforeEach(() => {
    clearS3ClientCache();
    vi.clearAllMocks();
  });

  it("test_handleUploadRequest_simple", async () => {
    const route = makeRoute();
    const body = {
      files: [{ name: "photo.jpg", size: 1024, type: "image/jpeg" }],
    };
    const req = new Request("http://localhost/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const response = await handleUploadRequest(req, route, body, testConfig, "imageUploader");
    expect(response).toBeInstanceOf(Response);

    const data = await response.json();
    expect(data.files).toHaveLength(1);
    expect(data.files[0]).toHaveProperty("key");
    expect(data.files[0]).toHaveProperty("name", "photo.jpg");
    expect(data.files[0]).toHaveProperty("fileType", "image/jpeg");
    expect(data.metadata).toBeDefined();
    expect(typeof data.metadata).toBe("string");
  });

  it("test_handleUploadRequest_multipart", async () => {
    // Use a route config that allows large files
    const route = makeRoute({
      routerConfig: { image: { maxFileSize: "512MB", maxFileCount: 5 } },
    });
    // 100MB file → should trigger multipart
    const body = {
      files: [{ name: "video.mp4", size: 100 * 1024 * 1024, type: "image/jpeg" }],
    };
    const req = new Request("http://localhost/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const response = await handleUploadRequest(req, route, body, testConfig, "imageUploader");
    const data = await response.json();

    expect(data.files).toHaveLength(1);
    expect(data.files[0]).toHaveProperty("uploadId");
    expect(data.files[0]).toHaveProperty("parts");
    expect(data.files[0]).toHaveProperty("chunkSize");
    expect(data.files[0]).toHaveProperty("chunkCount");
    expect(Array.isArray(data.files[0].parts)).toBe(true);
  });

  it("test_handleUploadRequest_invalid_file_type", async () => {
    const route = makeRoute({
      routerConfig: { pdf: { maxFileSize: "16MB" } },
    });
    const body = {
      files: [{ name: "photo.jpg", size: 1024, type: "image/jpeg" }],
    };
    const req = new Request("http://localhost/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    await expect(
      handleUploadRequest(req, route, body, testConfig, "pdfUploader"),
    ).rejects.toThrow(UploadError);
  });
});

describe("encodeDecodeMetadataToken", () => {
  const secret = "test-secret-key-for-hmac-signing";

  it("test_encodeDecodeMetadataToken_roundtrip", () => {
    const metadata: UploadMetadata = {
      fileKeys: ["abc123.jpg"],
      fileNames: { "abc123.jpg": "photo.jpg" },
      fileSizes: { "abc123.jpg": 1024 },
      fileTypes: { "abc123.jpg": "image/jpeg" },
      metadata: { userId: "user_123" },
      routeSlug: "imageUploader",
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };

    const token = encodeMetadataToken(metadata, secret);
    expect(typeof token).toBe("string");
    expect(token).toContain(".");

    const decoded = decodeMetadataToken(token, secret);
    expect(decoded.fileKeys).toEqual(metadata.fileKeys);
    expect(decoded.fileNames).toEqual(metadata.fileNames);
    expect(decoded.fileSizes).toEqual(metadata.fileSizes);
    expect(decoded.fileTypes).toEqual(metadata.fileTypes);
    expect(decoded.metadata).toEqual(metadata.metadata);
    expect(decoded.routeSlug).toBe(metadata.routeSlug);
  });

  it("test_decodeMetadataToken_expired", () => {
    const metadata: UploadMetadata = {
      fileKeys: ["abc123.jpg"],
      fileNames: { "abc123.jpg": "photo.jpg" },
      fileSizes: { "abc123.jpg": 1024 },
      fileTypes: { "abc123.jpg": "image/jpeg" },
      metadata: {},
      routeSlug: "imageUploader",
      expiresAt: Date.now() - 1000, // Already expired
    };

    const token = encodeMetadataToken(metadata, secret);
    expect(() => decodeMetadataToken(token, secret)).toThrow(UploadError);
    expect(() => decodeMetadataToken(token, secret)).toThrow("expired");
  });

  it("test_decodeMetadataToken_tampered", () => {
    const metadata: UploadMetadata = {
      fileKeys: ["abc123.jpg"],
      fileNames: { "abc123.jpg": "photo.jpg" },
      fileSizes: { "abc123.jpg": 1024 },
      fileTypes: { "abc123.jpg": "image/jpeg" },
      metadata: {},
      routeSlug: "imageUploader",
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };

    const token = encodeMetadataToken(metadata, secret);
    // Tamper with the payload portion
    const [payload, signature] = token.split(".");
    const tamperedPayload = payload! + "x";
    const tamperedToken = `${tamperedPayload}.${signature}`;

    expect(() => decodeMetadataToken(tamperedToken, secret)).toThrow(
      UploadError,
    );
    expect(() => decodeMetadataToken(tamperedToken, secret)).toThrow(
      "Invalid upload token",
    );
  });
});

describe("createRouteHandler", () => {
  it("test_createRouteHandler_returns_handlers", () => {
    const route = makeRoute();
    const router = { imageUploader: route };

    const handler = createRouteHandler({ router, config: testConfig });
    expect(handler).toHaveProperty("GET");
    expect(handler).toHaveProperty("POST");
    expect(typeof handler.GET).toBe("function");
    expect(typeof handler.POST).toBe("function");
  });
});
