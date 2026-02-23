import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @aws-sdk/client-s3
vi.mock("@aws-sdk/client-s3", () => {
  const MockS3Client = vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  }));
  return {
    S3Client: MockS3Client,
    PutObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    CreateMultipartUploadCommand: vi.fn(),
    CompleteMultipartUploadCommand: vi.fn(),
    AbortMultipartUploadCommand: vi.fn(),
    UploadPartCommand: vi.fn(),
  };
});

// Mock @aws-sdk/s3-request-presigner
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://s3.example.com/presigned"),
}));

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  generatePresignedPutUrl,
  generatePresignedUrls,
  getContentDisposition,
} from "../_internal/s3";

describe("Presigned URLs", () => {
  let mockS3: InstanceType<typeof S3Client>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockS3 = new S3Client({});
    // Reset the mock to return unique URLs for batch tests
    let callCount = 0;
    vi.mocked(getSignedUrl).mockImplementation(async () => {
      callCount++;
      return `https://s3.example.com/presigned-${callCount}`;
    });
  });

  it("test_generatePresignedPutUrl_returns_url", async () => {
    vi.mocked(getSignedUrl).mockResolvedValueOnce(
      "https://s3.example.com/presigned-put",
    );

    const url = await generatePresignedPutUrl(mockS3, {
      bucket: "my-bucket",
      key: "photos/cat.jpg",
      contentType: "image/jpeg",
    });

    expect(url).toBe("https://s3.example.com/presigned-put");
    expect(getSignedUrl).toHaveBeenCalledOnce();
  });

  it("test_generatePresignedPutUrl_includes_content_type", async () => {
    vi.mocked(getSignedUrl).mockResolvedValueOnce("https://s3.example.com/url");

    await generatePresignedPutUrl(mockS3, {
      bucket: "my-bucket",
      key: "photos/cat.jpg",
      contentType: "image/jpeg",
    });

    // Verify PutObjectCommand was called with ContentType
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: "my-bucket",
        Key: "photos/cat.jpg",
        ContentType: "image/jpeg",
      }),
    );
  });

  it("test_generatePresignedUrls_batch", async () => {
    const files = [
      { key: "a.jpg", name: "a.jpg", contentType: "image/jpeg" },
      { key: "b.png", name: "b.png", contentType: "image/png" },
      { key: "c.pdf", name: "c.pdf", contentType: "application/pdf" },
    ];

    const results = await generatePresignedUrls(mockS3, files, "my-bucket");

    expect(results).toHaveLength(3);
    results.forEach((result, i) => {
      expect(result).toHaveProperty("key", files[i]!.key);
      expect(result).toHaveProperty("url");
      expect(result).toHaveProperty("name", files[i]!.name);
      expect(result).toHaveProperty("fileType", files[i]!.contentType);
      expect(typeof result.url).toBe("string");
    });
    // Each file should get a unique URL
    const urls = new Set(results.map((r) => r.url));
    expect(urls.size).toBe(3);
  });
});

describe("Content Disposition", () => {
  it("test_getContentDisposition_image", () => {
    const result = getContentDisposition("image/jpeg");
    expect(result).toBe("inline");
  });

  it("test_getContentDisposition_pdf", () => {
    const result = getContentDisposition("application/pdf");
    expect(result).toBe("attachment");
  });

  it("test_getContentDisposition_explicit", () => {
    const result = getContentDisposition("image/jpeg", "attachment");
    expect(result).toBe("attachment");
  });
});
