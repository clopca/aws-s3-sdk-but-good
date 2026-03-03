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
    CreateMultipartUploadCommand: vi
      .fn()
      .mockImplementation((input) => ({ _type: "CreateMultipartUpload", input })),
    CompleteMultipartUploadCommand: vi
      .fn()
      .mockImplementation((input) => ({ _type: "CompleteMultipartUpload", input })),
    AbortMultipartUploadCommand: vi
      .fn()
      .mockImplementation((input) => ({ _type: "AbortMultipartUpload", input })),
    UploadPartCommand: vi
      .fn()
      .mockImplementation((input) => ({ _type: "UploadPart", input })),
    ListObjectsV2Command: vi.fn(),
    DeleteObjectCommand: vi.fn(),
    DeleteObjectsCommand: vi.fn(),
    CopyObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
  };
});

// Mock @aws-sdk/s3-request-presigner
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockImplementation(async (_s3, _cmd, _opts) => {
    return "https://s3.example.com/presigned-part";
  }),
}));

import {
  S3Client,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Error } from "@s3-good-internal/shared";
import {
  createMultipartUpload,
  generatePresignedPartUrls,
  completeMultipartUpload,
  abortMultipartUpload,
  calculateParts,
  MULTIPART_THRESHOLD,
} from "../_internal/s3";

describe("Multipart Upload Operations", () => {
  let mockS3: InstanceType<typeof S3Client>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockS3 = new S3Client({});
  });

  it("test_createMultipartUpload_returns_uploadId", async () => {
    mockSend.mockResolvedValueOnce({ UploadId: "test-upload-id-123" });

    const result = await createMultipartUpload(mockS3, {
      bucket: "my-bucket",
      key: "large-file.zip",
      contentType: "application/zip",
    });

    expect(result).toEqual({ uploadId: "test-upload-id-123" });
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it("test_createMultipartUpload_throws_on_missing_id", async () => {
    mockSend.mockResolvedValueOnce({ UploadId: undefined });

    await expect(
      createMultipartUpload(mockS3, {
        bucket: "my-bucket",
        key: "large-file.zip",
        contentType: "application/zip",
      }),
    ).rejects.toThrow(S3Error);
  });

  it("test_generatePresignedPartUrls_correct_count", async () => {
    let callCount = 0;
    vi.mocked(getSignedUrl).mockImplementation(async () => {
      callCount++;
      return `https://s3.example.com/part-${callCount}`;
    });

    const urls = await generatePresignedPartUrls(mockS3, {
      bucket: "my-bucket",
      key: "large-file.zip",
      uploadId: "upload-123",
      partCount: 10,
    });

    expect(urls).toHaveLength(10);
    expect(getSignedUrl).toHaveBeenCalledTimes(10);
  });

  it("test_generatePresignedPartUrls_sequential_numbers", async () => {
    let callCount = 0;
    vi.mocked(getSignedUrl).mockImplementation(async () => {
      callCount++;
      return `https://s3.example.com/part-${callCount}`;
    });

    const urls = await generatePresignedPartUrls(mockS3, {
      bucket: "my-bucket",
      key: "large-file.zip",
      uploadId: "upload-123",
      partCount: 5,
    });

    expect(urls).toHaveLength(5);
    const partNumbers = urls.map((u) => u.partNumber);
    expect(partNumbers).toEqual([1, 2, 3, 4, 5]);
  });

  it("test_completeMultipartUpload_sorts_parts", async () => {
    mockSend.mockResolvedValueOnce({
      Location: "https://s3.example.com/my-bucket/large-file.zip",
    });

    // Provide parts in unsorted order
    const unsortedParts = [
      { partNumber: 3, etag: '"etag3"' },
      { partNumber: 1, etag: '"etag1"' },
      { partNumber: 2, etag: '"etag2"' },
    ];

    await completeMultipartUpload(mockS3, {
      bucket: "my-bucket",
      key: "large-file.zip",
      uploadId: "upload-123",
      parts: unsortedParts,
    });

    // Verify the command was constructed with sorted parts
    expect(CompleteMultipartUploadCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        MultipartUpload: {
          Parts: [
            { PartNumber: 1, ETag: '"etag1"' },
            { PartNumber: 2, ETag: '"etag2"' },
            { PartNumber: 3, ETag: '"etag3"' },
          ],
        },
      }),
    );
  });

  it("test_abortMultipartUpload_sends_command", async () => {
    mockSend.mockResolvedValueOnce({});

    await abortMultipartUpload(mockS3, {
      bucket: "my-bucket",
      key: "large-file.zip",
      uploadId: "upload-123",
    });

    expect(mockSend).toHaveBeenCalledOnce();
    expect(AbortMultipartUploadCommand).toHaveBeenCalledWith({
      Bucket: "my-bucket",
      Key: "large-file.zip",
      UploadId: "upload-123",
    });
  });
});

describe("calculateParts", () => {
  it("test_calculateParts_small_file", () => {
    const fileSize = 30 * 1024 * 1024; // 30 MB
    const result = calculateParts(fileSize);

    expect(result.isMultipart).toBe(false);
    expect(result.partCount).toBe(1);
  });

  it("test_calculateParts_large_file", () => {
    const fileSize = 100 * 1024 * 1024; // 100 MB
    const result = calculateParts(fileSize);

    expect(result.isMultipart).toBe(true);
    // 100 MB / 10 MB default part size = 10 parts
    expect(result.partCount).toBe(10);
  });

  it("test_calculateParts_very_large_file", () => {
    const fileSize = 5 * 1024 * 1024 * 1024 * 1024; // 5 TB
    const result = calculateParts(fileSize);

    expect(result.isMultipart).toBe(true);
    expect(result.partCount).toBeLessThanOrEqual(10000);
  });

  it("test_calculateParts_min_part_size", () => {
    const fileSize = 50 * 1024 * 1024; // 50 MB (exactly at threshold)
    // Request a part size of 1 MB (below AWS minimum of 5 MB)
    const result = calculateParts(fileSize, 1 * 1024 * 1024);

    expect(result.isMultipart).toBe(true);
    // Part size should be clamped to at least 5 MB
    expect(result.partSize).toBeGreaterThanOrEqual(5 * 1024 * 1024);
  });

  it("test_calculateParts_at_threshold", () => {
    // File exactly at threshold should be multipart
    const result = calculateParts(MULTIPART_THRESHOLD);
    expect(result.isMultipart).toBe(true);

    // File just below threshold should not be multipart
    const result2 = calculateParts(MULTIPART_THRESHOLD - 1);
    expect(result2.isMultipart).toBe(false);
  });
});
