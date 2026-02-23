import { beforeEach, describe, expect, it, vi } from "vitest";
import type { S3Config } from "@s3-good/shared";

vi.mock("../_internal/s3", () => ({
  getFileUrl: vi.fn().mockReturnValue("https://cdn.example.com/a.txt"),
  getS3Client: vi.fn().mockReturnValue({}),
  listObjects: vi.fn(),
  deleteObject: vi.fn(),
  deleteObjects: vi.fn(),
  copyObject: vi.fn(),
  generatePresignedGetUrl: vi.fn(),
  putEmptyObject: vi.fn(),
}));

import {
  copyObject,
  deleteObject,
  deleteObjects,
  generatePresignedGetUrl,
  getS3Client,
  listObjects,
  putEmptyObject,
} from "../_internal/s3";
import { S3Api } from "../sdk/index";

describe("S3Api browser methods", () => {
  const config: S3Config = {
    region: "us-east-1",
    bucket: "bucket",
    accessKeyId: "AKIA...",
    secretAccessKey: "secret",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getS3Client).mockReturnValue({} as never);
  });

  it("test_s3api_list_delegates_to_listObjects", async () => {
    vi.mocked(listObjects).mockResolvedValueOnce({
      objects: [],
      folders: [],
      isTruncated: false,
    });
    const api = new S3Api(config);

    await api.list({ prefix: "photos/" });

    expect(listObjects).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ bucket: "bucket", prefix: "photos/" }),
    );
  });

  it("test_s3api_delete_delegates_to_deleteObject", async () => {
    vi.mocked(deleteObject).mockResolvedValueOnce();
    const api = new S3Api(config);

    await api.delete("file.txt");

    expect(deleteObject).toHaveBeenCalledWith(expect.anything(), {
      bucket: "bucket",
      key: "file.txt",
    });
  });

  it("test_s3api_deleteMany_delegates_to_deleteObjects", async () => {
    vi.mocked(deleteObjects).mockResolvedValueOnce({ deleted: [], errors: [] });
    const api = new S3Api(config);

    await api.deleteMany(["a.txt", "b.txt"]);

    expect(deleteObjects).toHaveBeenCalledWith(expect.anything(), {
      bucket: "bucket",
      keys: ["a.txt", "b.txt"],
    });
  });

  it("test_s3api_copy_delegates_to_copyObject", async () => {
    vi.mocked(copyObject).mockResolvedValueOnce();
    const api = new S3Api(config);

    await api.copy("a.txt", "b.txt");

    expect(copyObject).toHaveBeenCalledWith(expect.anything(), {
      bucket: "bucket",
      sourceKey: "a.txt",
      destinationKey: "b.txt",
    });
  });

  it("test_s3api_move_copies_then_deletes", async () => {
    vi.mocked(copyObject).mockResolvedValueOnce();
    vi.mocked(deleteObject).mockResolvedValueOnce();
    const api = new S3Api(config);

    await api.move("a.txt", "b.txt");

    expect(copyObject).toHaveBeenCalledOnce();
    expect(deleteObject).toHaveBeenCalledOnce();
  });

  it("test_s3api_rename_constructs_correct_key", async () => {
    vi.mocked(copyObject).mockResolvedValueOnce();
    vi.mocked(deleteObject).mockResolvedValueOnce();
    const api = new S3Api(config);

    await api.rename("photos/old.jpg", "new.jpg");

    expect(copyObject).toHaveBeenCalledWith(expect.anything(), {
      bucket: "bucket",
      sourceKey: "photos/old.jpg",
      destinationKey: "photos/new.jpg",
    });
  });

  it("test_s3api_rename_root_level", async () => {
    vi.mocked(copyObject).mockResolvedValueOnce();
    vi.mocked(deleteObject).mockResolvedValueOnce();
    const api = new S3Api(config);

    await api.rename("old.jpg", "new.jpg");

    expect(copyObject).toHaveBeenCalledWith(expect.anything(), {
      bucket: "bucket",
      sourceKey: "old.jpg",
      destinationKey: "new.jpg",
    });
  });

  it("test_s3api_createFolder_appends_slash", async () => {
    vi.mocked(putEmptyObject).mockResolvedValueOnce();
    const api = new S3Api(config);

    await api.createFolder("photos", "vacation");

    expect(putEmptyObject).toHaveBeenCalledWith(expect.anything(), {
      bucket: "bucket",
      key: "photos/vacation/",
    });
  });

  it("test_s3api_getDownloadUrl_force_download", async () => {
    vi.mocked(generatePresignedGetUrl).mockResolvedValueOnce("https://s3.example.com/dl");
    const api = new S3Api(config);

    await api.getDownloadUrl("file.txt", { filename: "renamed.txt" });

    expect(generatePresignedGetUrl).toHaveBeenCalledWith(expect.anything(), {
      bucket: "bucket",
      key: "file.txt",
      expiresIn: undefined,
      forceDownload: true,
      downloadFilename: "renamed.txt",
    });
  });
});
