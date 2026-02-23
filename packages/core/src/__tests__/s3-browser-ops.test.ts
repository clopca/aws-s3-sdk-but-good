import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSend = vi.fn();

vi.mock("@aws-sdk/client-s3", () => {
  const MockS3Client = vi.fn().mockImplementation(() => ({ send: mockSend }));
  return {
    S3Client: MockS3Client,
    PutObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    CreateMultipartUploadCommand: vi.fn(),
    CompleteMultipartUploadCommand: vi.fn(),
    AbortMultipartUploadCommand: vi.fn(),
    UploadPartCommand: vi.fn(),
    ListObjectsV2Command: vi.fn().mockImplementation((input) => ({ input })),
    DeleteObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    DeleteObjectsCommand: vi.fn().mockImplementation((input) => ({ input })),
    CopyObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    GetObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://s3.example.com/get"),
}));

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  copyObject,
  deleteObject,
  deleteObjects,
  generatePresignedGetUrl,
  listObjects,
  putEmptyObject,
} from "../_internal/s3";

describe("s3 browser operations", () => {
  let s3: InstanceType<typeof S3Client>;

  beforeEach(() => {
    vi.clearAllMocks();
    s3 = new S3Client({});
  });

  it("test_listObjects_returns_files_and_folders", async () => {
    mockSend.mockResolvedValueOnce({
      Contents: [
        {
          Key: "photos/cat.jpg",
          Size: 123,
          LastModified: new Date("2026-01-01T00:00:00.000Z"),
          ETag: '"etag-1"',
        },
      ],
      CommonPrefixes: [{ Prefix: "photos/animals/" }],
      IsTruncated: false,
    });

    const result = await listObjects(s3, {
      bucket: "bucket",
      prefix: "photos/",
    });

    expect(ListObjectsV2Command).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: "bucket",
        Prefix: "photos/",
        Delimiter: "/",
        MaxKeys: 1000,
      }),
    );
    expect(result.objects).toHaveLength(1);
    expect(result.folders).toEqual(["photos/animals/"]);
  });

  it("test_listObjects_pagination_with_continuation_token", async () => {
    mockSend.mockResolvedValueOnce({
      Contents: [],
      CommonPrefixes: [],
      IsTruncated: true,
      NextContinuationToken: "token-next",
    });

    const result = await listObjects(s3, {
      bucket: "bucket",
      continuationToken: "token-prev",
    });

    expect(ListObjectsV2Command).toHaveBeenCalledWith(
      expect.objectContaining({ ContinuationToken: "token-prev" }),
    );
    expect(result.nextContinuationToken).toBe("token-next");
    expect(result.isTruncated).toBe(true);
  });

  it("test_listObjects_excludes_prefix_itself", async () => {
    mockSend.mockResolvedValueOnce({
      Contents: [
        { Key: "photos/", Size: 0, LastModified: new Date("2026-01-01") },
        { Key: "photos/file.txt", Size: 1, LastModified: new Date("2026-01-01") },
      ],
      CommonPrefixes: [],
      IsTruncated: false,
    });

    const result = await listObjects(s3, { bucket: "bucket", prefix: "photos/" });

    expect(result.objects).toHaveLength(1);
    expect(result.objects[0]?.key).toBe("photos/file.txt");
  });

  it("test_deleteObject_sends_correct_command", async () => {
    mockSend.mockResolvedValueOnce({});

    await deleteObject(s3, { bucket: "bucket", key: "file.txt" });

    expect(DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: "bucket",
      Key: "file.txt",
    });
  });

  it("test_deleteObjects_batches_over_1000", async () => {
    const keys = Array.from({ length: 1500 }, (_, i) => `file-${i}`);
    mockSend
      .mockResolvedValueOnce({ Deleted: keys.slice(0, 1000).map((Key) => ({ Key })) })
      .mockResolvedValueOnce({ Deleted: keys.slice(1000).map((Key) => ({ Key })) });

    const result = await deleteObjects(s3, { bucket: "bucket", keys });

    expect(DeleteObjectsCommand).toHaveBeenCalledTimes(2);
    expect(result.deleted).toHaveLength(1500);
  });

  it("test_deleteObjects_returns_deleted_and_errors", async () => {
    mockSend.mockResolvedValueOnce({
      Deleted: [{ Key: "ok.txt" }],
      Errors: [{ Key: "bad.txt", Message: "AccessDenied" }],
    });

    const result = await deleteObjects(s3, {
      bucket: "bucket",
      keys: ["ok.txt", "bad.txt"],
    });

    expect(result.deleted).toEqual(["ok.txt"]);
    expect(result.errors).toEqual([{ key: "bad.txt", message: "AccessDenied" }]);
  });

  it("test_deleteObjects_empty_array", async () => {
    const result = await deleteObjects(s3, { bucket: "bucket", keys: [] });

    expect(result).toEqual({ deleted: [], errors: [] });
    expect(DeleteObjectsCommand).not.toHaveBeenCalled();
  });

  it("test_copyObject_sends_correct_source", async () => {
    mockSend.mockResolvedValueOnce({});

    await copyObject(s3, {
      bucket: "bucket",
      sourceKey: "a folder/file name.txt",
      destinationKey: "dest/file.txt",
    });

    expect(CopyObjectCommand).toHaveBeenCalledWith({
      Bucket: "bucket",
      CopySource: "bucket/a%20folder/file%20name.txt",
      Key: "dest/file.txt",
    });
  });

  it("test_generatePresignedGetUrl_default_expiry", async () => {
    vi.mocked(getSignedUrl).mockResolvedValueOnce("https://s3.example.com/default");

    const url = await generatePresignedGetUrl(s3, {
      bucket: "bucket",
      key: "file.txt",
    });

    expect(GetObjectCommand).toHaveBeenCalledWith({ Bucket: "bucket", Key: "file.txt" });
    expect(getSignedUrl).toHaveBeenCalledWith(s3, expect.anything(), { expiresIn: 3600 });
    expect(url).toBe("https://s3.example.com/default");
  });

  it("test_generatePresignedGetUrl_force_download", async () => {
    await generatePresignedGetUrl(s3, {
      bucket: "bucket",
      key: "file.txt",
      forceDownload: true,
      downloadFilename: "download.txt",
    });

    expect(GetObjectCommand).toHaveBeenCalledWith({
      Bucket: "bucket",
      Key: "file.txt",
      ResponseContentDisposition: 'attachment; filename="download.txt"',
    });
  });

  it("test_putEmptyObject_zero_byte", async () => {
    mockSend.mockResolvedValueOnce({});

    await putEmptyObject(s3, { bucket: "bucket", key: "folder" });

    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: "bucket",
      Key: "folder/",
      Body: "",
      ContentLength: 0,
      ContentType: "application/x-directory",
    });
  });
});
