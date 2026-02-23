import { describe, it, expect, vi, beforeEach } from "vitest";
import { UploadError } from "@s3-good/shared";
import type { FileRoute, AnyParams } from "../_internal/types";

// ─── Hoisted mocks (available before vi.mock factory runs) ──────────────────

const { mockS3Send, mockDecodeMetadataToken } = vi.hoisted(() => ({
  mockS3Send: vi.fn(),
  mockDecodeMetadataToken: vi.fn(),
}));

// ─── Mock S3 operations ─────────────────────────────────────────────────────

vi.mock("../_internal/s3", () => ({
  getS3Client: vi.fn(() => ({ send: mockS3Send })),
  getFileUrl: vi.fn(
    (_config: unknown, key: string) => `https://test-bucket.s3.us-east-1.amazonaws.com/${key}`,
  ),
  completeMultipartUpload: vi.fn().mockResolvedValue({ location: "" }),
}));

// Mock the handler module for decodeMetadataToken
vi.mock("../_internal/handler", () => ({
  decodeMetadataToken: mockDecodeMetadataToken,
}));

import { resolveFileMetadata, handleUploadCallback } from "../_internal/callback";

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockConfig = {
  region: "us-east-1",
  bucket: "test-bucket",
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
};

function makeRoute(overrides?: Partial<FileRoute<AnyParams>["_def"]>): FileRoute<AnyParams> {
  return {
    _def: {
      routerConfig: { image: { maxFileSize: "4MB" } },
      inputParser: undefined,
      middleware: () => ({ userId: "user_123" }),
      onUploadComplete: vi.fn().mockResolvedValue({ success: true }),
      ...overrides,
    },
    _input: undefined as never,
    _metadata: undefined as never,
    _output: undefined as never,
  };
}

// ─── Tests: resolveFileMetadata ─────────────────────────────────────────────

describe("resolveFileMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("test_resolveFileMetadata_success", async () => {
    // Arrange — HeadObject returns enriched data
    mockS3Send.mockResolvedValueOnce({
      ContentLength: 2048,
      ContentType: "image/png",
    });

    const s3 = { send: mockS3Send } as never;
    const tokenData = {
      fileNames: { "uploads/abc.jpg": "photo.jpg" },
      fileSizes: { "uploads/abc.jpg": 1024 },
      fileTypes: { "uploads/abc.jpg": "image/jpeg" },
    };

    // Act
    const result = await resolveFileMetadata(
      s3,
      "test-bucket",
      "uploads/abc.jpg",
      mockConfig,
      tokenData,
    );

    // Assert — HeadObject enriches the data
    expect(result.key).toBe("uploads/abc.jpg");
    expect(result.name).toBe("photo.jpg");
    expect(result.size).toBe(2048); // From HeadObject
    expect(result.type).toBe("image/png"); // From HeadObject
    expect(result.url).toContain("uploads/abc.jpg");
  });

  it("test_resolveFileMetadata_fallback", async () => {
    // Arrange — HeadObject fails (eventual consistency)
    mockS3Send.mockRejectedValueOnce(new Error("NoSuchKey"));

    const s3 = { send: mockS3Send } as never;
    const tokenData = {
      fileNames: { "uploads/abc.jpg": "photo.jpg" },
      fileSizes: { "uploads/abc.jpg": 1024 },
      fileTypes: { "uploads/abc.jpg": "image/jpeg" },
    };

    // Act
    const result = await resolveFileMetadata(
      s3,
      "test-bucket",
      "uploads/abc.jpg",
      mockConfig,
      tokenData,
    );

    // Assert — falls back to token data
    expect(result.key).toBe("uploads/abc.jpg");
    expect(result.name).toBe("photo.jpg");
    expect(result.size).toBe(1024); // From token
    expect(result.type).toBe("image/jpeg"); // From token
    expect(result.url).toContain("uploads/abc.jpg");
  });
});

// ─── Tests: handleUploadCallback ────────────────────────────────────────────

describe("handleUploadCallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: HeadObject succeeds
    mockS3Send.mockResolvedValue({
      ContentLength: 2048,
      ContentType: "image/png",
    });
  });

  it("test_handleUploadCallback_success", async () => {
    // Arrange
    const onUploadComplete = vi.fn().mockResolvedValue({ processed: true });
    const route = makeRoute({ onUploadComplete });

    mockDecodeMetadataToken.mockReturnValue({
      fileKeys: ["uploads/abc.jpg"],
      fileNames: { "uploads/abc.jpg": "photo.jpg" },
      fileSizes: { "uploads/abc.jpg": 1024 },
      fileTypes: { "uploads/abc.jpg": "image/jpeg" },
      metadata: { userId: "user_123" },
      routeSlug: "imageUploader",
      expiresAt: Date.now() + 3600_000,
    });

    // Act
    const results = await handleUploadCallback(
      route,
      mockConfig,
      "mock-token",
      { fileKeys: ["uploads/abc.jpg"] },
    );

    // Assert
    expect(results).toHaveLength(1);
    expect(results[0]!.key).toBe("uploads/abc.jpg");
    expect(results[0]!.serverData).toEqual({ processed: true });
    expect(onUploadComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { userId: "user_123" },
        file: expect.objectContaining({ key: "uploads/abc.jpg" }),
      }),
    );
  });

  it("test_handleUploadCallback_key_mismatch", async () => {
    // Arrange
    const route = makeRoute();

    mockDecodeMetadataToken.mockReturnValue({
      fileKeys: ["uploads/abc.jpg"],
      fileNames: { "uploads/abc.jpg": "photo.jpg" },
      fileSizes: {},
      fileTypes: {},
      metadata: {},
      routeSlug: "imageUploader",
      expiresAt: Date.now() + 3600_000,
    });

    // Act & Assert — mismatched key should throw
    await expect(
      handleUploadCallback(
        route,
        mockConfig,
        "mock-token",
        { fileKeys: ["uploads/TAMPERED.jpg"] },
      ),
    ).rejects.toThrow(UploadError);

    await expect(
      handleUploadCallback(
        route,
        mockConfig,
        "mock-token",
        { fileKeys: ["uploads/TAMPERED.jpg"] },
      ),
    ).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      message: expect.stringContaining("mismatch"),
    });
  });

  it("test_onUploadComplete_error_calls_onUploadError", async () => {
    // Arrange
    const uploadError = new Error("Processing failed");
    const onUploadComplete = vi.fn().mockRejectedValue(uploadError);
    const onUploadError = vi.fn();
    const route = makeRoute({ onUploadComplete, onUploadError });

    mockDecodeMetadataToken.mockReturnValue({
      fileKeys: ["uploads/abc.jpg"],
      fileNames: { "uploads/abc.jpg": "photo.jpg" },
      fileSizes: { "uploads/abc.jpg": 1024 },
      fileTypes: { "uploads/abc.jpg": "image/jpeg" },
      metadata: { userId: "user_123" },
      routeSlug: "imageUploader",
      expiresAt: Date.now() + 3600_000,
    });

    // Act & Assert — error should propagate and onUploadError should be called
    await expect(
      handleUploadCallback(
        route,
        mockConfig,
        "mock-token",
        { fileKeys: ["uploads/abc.jpg"] },
      ),
    ).rejects.toThrow("Processing failed");

    expect(onUploadError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(UploadError),
        fileKey: "uploads/abc.jpg",
      }),
    );
  });
});
