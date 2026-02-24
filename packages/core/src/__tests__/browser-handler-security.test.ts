import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../_internal/s3", () => ({
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
  listObjects,
  putEmptyObject,
} from "../_internal/s3";
import { handleBrowserAction } from "../_internal/browser-handler";

const config = {
  region: "us-east-1",
  bucket: "bucket",
  accessKeyId: "AKIA...",
  secretAccessKey: "secret",
};

function postRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/browser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("browser handler – rename security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects newName with forward slash", async () => {
    const response = await handleBrowserAction(
      postRequest({
        action: "rename",
        key: "file.txt",
        newName: "sub/file.txt",
      }),
      { route: {}, config },
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toContain("path separators");
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("rejects newName with backslash", async () => {
    const response = await handleBrowserAction(
      postRequest({
        action: "rename",
        key: "file.txt",
        newName: "sub\\file.txt",
      }),
      { route: {}, config },
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toContain("path separators");
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("rejects newName with dot-dot traversal", async () => {
    // "../escape.txt" contains "/" so the path-separator check fires first.
    // Use a pure ".." value to exercise the traversal guard directly.
    const response = await handleBrowserAction(
      postRequest({ action: "rename", key: "file.txt", newName: ".." }),
      { route: {}, config },
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toContain("traversal");
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("rejects empty newName", async () => {
    const response = await handleBrowserAction(
      postRequest({ action: "rename", key: "file.txt", newName: "" }),
      { route: {}, config },
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("rejects newName that escapes root prefix", async () => {
    // With rootPrefix "root/", a key "root/file.txt" renamed to "../../escape.txt"
    // should be rejected. The slash check fires first (400), but the intent is
    // the destination never escapes the root.
    const response = await handleBrowserAction(
      postRequest({
        action: "rename",
        key: "root/file.txt",
        newName: "../../escape.txt",
      }),
      { route: { rootPrefix: "root/" }, config },
    );

    const body = await response.json();
    expect([400, 403]).toContain(response.status);
    expect(body.success).toBe(false);
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("succeeds with valid newName", async () => {
    vi.mocked(copyObject).mockResolvedValueOnce(undefined);
    vi.mocked(deleteObject).mockResolvedValueOnce(undefined);

    const response = await handleBrowserAction(
      postRequest({
        action: "rename",
        key: "file.txt",
        newName: "renamed.txt",
      }),
      { route: {}, config },
    );

    expect(response.status).toBe(200);
    expect(copyObject).toHaveBeenCalledWith(expect.anything(), {
      bucket: "bucket",
      sourceKey: "file.txt",
      destinationKey: "renamed.txt",
    });
    expect(deleteObject).toHaveBeenCalled();
  });

  it("rejects folder rename newName with slash", async () => {
    const response = await handleBrowserAction(
      postRequest({ action: "rename", key: "folder/", newName: "sub/folder" }),
      { route: {}, config },
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toContain("path separators");
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("succeeds with valid folder rename", async () => {
    vi.mocked(listObjects).mockResolvedValueOnce({
      objects: [
        { key: "folder/a.txt", size: 1, lastModified: new Date("2026-01-01") },
      ],
      folders: [],
      isTruncated: false,
    });
    vi.mocked(copyObject).mockResolvedValueOnce(undefined);
    vi.mocked(deleteObjects).mockResolvedValueOnce({
      deleted: ["folder/", "folder/a.txt"],
      errors: [],
    });

    const response = await handleBrowserAction(
      postRequest({ action: "rename", key: "folder/", newName: "new-folder" }),
      { route: {}, config },
    );

    expect(response.status).toBe(200);
    expect(copyObject).toHaveBeenCalledWith(expect.anything(), {
      bucket: "bucket",
      sourceKey: "folder/a.txt",
      destinationKey: "new-folder/a.txt",
    });
  });
});

describe("browser handler – create-folder security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects folderName with forward slash", async () => {
    const response = await handleBrowserAction(
      postRequest({ action: "create-folder", folderName: "sub/folder" }),
      { route: {}, config },
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toContain("path separators");
    expect(putEmptyObject).not.toHaveBeenCalled();
  });

  it("rejects folderName with backslash", async () => {
    const response = await handleBrowserAction(
      postRequest({ action: "create-folder", folderName: "sub\\folder" }),
      { route: {}, config },
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toContain("path separators");
    expect(putEmptyObject).not.toHaveBeenCalled();
  });

  it("rejects folderName with dot-dot traversal", async () => {
    // Use a pure ".." value to exercise the traversal guard directly,
    // since "../escape" would hit the path-separator check first.
    const response = await handleBrowserAction(
      postRequest({ action: "create-folder", folderName: ".." }),
      { route: {}, config },
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toContain("traversal");
    expect(putEmptyObject).not.toHaveBeenCalled();
  });

  it("rejects empty folderName", async () => {
    const response = await handleBrowserAction(
      postRequest({ action: "create-folder", folderName: "" }),
      { route: {}, config },
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(putEmptyObject).not.toHaveBeenCalled();
  });

  it("rejects folderName escaping root prefix", async () => {
    // With rootPrefix "root/", a folderName "../../escape" should be rejected.
    // The slash check fires first (400), preventing the escape.
    const response = await handleBrowserAction(
      postRequest({
        action: "create-folder",
        folderName: "../../escape",
        prefix: "root/",
      }),
      { route: { rootPrefix: "root/" }, config },
    );

    const body = await response.json();
    expect([400, 403]).toContain(response.status);
    expect(body.success).toBe(false);
    expect(putEmptyObject).not.toHaveBeenCalled();
  });

  it("succeeds with valid folderName", async () => {
    vi.mocked(putEmptyObject).mockResolvedValueOnce(undefined);

    const response = await handleBrowserAction(
      postRequest({ action: "create-folder", folderName: "new-folder" }),
      { route: {}, config },
    );

    expect(response.status).toBe(200);
    expect(putEmptyObject).toHaveBeenCalledWith(expect.anything(), {
      bucket: "bucket",
      key: "new-folder/",
    });
  });
});
