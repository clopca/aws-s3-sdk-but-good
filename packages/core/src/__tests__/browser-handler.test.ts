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
  generatePresignedGetUrl,
  listObjects,
  putEmptyObject,
} from "../_internal/s3";
import { handleBrowserAction, parseBrowserRequest } from "../_internal/browser-handler";
import type { BrowserRouteConfig } from "../_internal/browser-types";

const config = {
  region: "us-east-1",
  bucket: "bucket",
  accessKeyId: "AKIA...",
  secretAccessKey: "secret",
};

describe("browser handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("test_parseBrowserRequest_GET", async () => {
    const req = new Request(
      "http://localhost/api/browser?action=list&prefix=photos/&continuationToken=abc&search=cat",
      { method: "GET" },
    );

    const payload = await parseBrowserRequest(req);

    expect(payload).toEqual(expect.objectContaining({
      action: "list",
      prefix: "photos/",
      continuationToken: "abc",
      search: "cat",
    }));
    expect(payload.filters).toEqual(expect.objectContaining({
      prefix: "photos/",
      search: "cat",
    }));
  });

  it("test_parseBrowserRequest_POST", async () => {
    const req = new Request("http://localhost/api/browser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", key: "a.txt" }),
    });

    const payload = await parseBrowserRequest(req);
    expect(payload).toEqual({ action: "delete", key: "a.txt" });
  });

  it("test_handleBrowserAction_uses_default_bucket", async () => {
    vi.mocked(listObjects).mockResolvedValueOnce({
      objects: [],
      folders: [],
      isTruncated: false,
    });

    const response = await handleBrowserAction(
      new Request("http://localhost/api/browser?action=list", { method: "GET" }),
      {
        route: { buckets: ["bucket-a", "bucket-b"], defaultBucket: "bucket-b" },
        config,
      },
    );

    expect(response.status).toBe(200);
    expect(listObjects).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      bucket: "bucket-b",
    }));
  });

  it("test_handleBrowserAction_rejects_disallowed_bucket", async () => {
    const response = await handleBrowserAction(
      new Request("http://localhost/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", bucket: "other-bucket" }),
      }),
      {
        route: { buckets: ["bucket-a"] },
        config,
      },
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toContain("Bucket is not allowed");
  });

  it("test_handleList_rejects_tag_filter_without_athena", async () => {
    const response = await handleBrowserAction(
      new Request("http://localhost/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "list",
          filters: { tags: [{ key: "type", value: "invoice" }] },
        }),
      }),
      {
        route: {},
        config,
      },
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toContain("Tag filtering is not available without Athena");
  });

  it("test_handleBrowserAction_runs_middleware", async () => {
    vi.mocked(listObjects).mockResolvedValueOnce({
      objects: [],
      folders: [],
      isTruncated: false,
    });
    const middleware = vi.fn().mockResolvedValue({ userId: "u1" });

    const response = await handleBrowserAction(
      new Request("http://localhost/api/browser?action=list", { method: "GET" }),
      {
        route: { middleware },
        config,
      },
    );

    expect(response.status).toBe(200);
    expect(middleware).toHaveBeenCalledOnce();
  });

  it("test_handleBrowserAction_checks_permissions", async () => {
    const response = await handleBrowserAction(
      new Request("http://localhost/api/browser?action=list", { method: "GET" }),
      {
        route: {
          middleware: vi.fn().mockResolvedValue({ userId: "u1" }),
          permissions: vi.fn().mockResolvedValue(false),
        },
        config,
      },
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toBe("Permission denied");
  });

  it("test_handleBrowserAction_validates_allowed_actions", async () => {
    const response = await handleBrowserAction(
      new Request("http://localhost/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", key: "x.txt" }),
      }),
      {
        route: { allowedActions: ["list"] },
        config,
      },
    );

    expect(response.status).toBe(403);
  });

  it("test_handleBrowserAction_enforces_root_prefix", async () => {
    const response = await handleBrowserAction(
      new Request("http://localhost/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", key: "other/file.txt" }),
      }),
      {
        route: { rootPrefix: "uploads/" },
        config,
      },
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toContain("outside the configured root prefix");
  });

  it("test_handleList_returns_items_and_search_filter", async () => {
    vi.mocked(listObjects).mockResolvedValueOnce({
      objects: [
        {
          key: "uploads/photo-cat.jpg",
          size: 10,
          lastModified: new Date("2026-01-01"),
          etag: '"1"',
        },
        {
          key: "uploads/notes.txt",
          size: 5,
          lastModified: new Date("2026-01-01"),
          etag: '"2"',
        },
      ],
      folders: ["uploads/folder-a/"],
      isTruncated: false,
      nextContinuationToken: undefined,
    });

    const response = await handleBrowserAction(
      new Request("http://localhost/api/browser?action=list&prefix=uploads/&search=cat", {
        method: "GET",
      }),
      {
        route: {},
        config,
      },
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.action).toBe("list");
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toContain("cat");
    expect(body.meta).toEqual({ mode: "s3-list", bucket: "bucket" });
  });

  it("test_handleDelete_removes_file", async () => {
    vi.mocked(deleteObject).mockResolvedValueOnce();

    const response = await handleBrowserAction(
      new Request("http://localhost/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", key: "uploads/a.txt" }),
      }),
      { route: { rootPrefix: "uploads/" }, config },
    );

    expect(response.status).toBe(200);
    expect(deleteObject).toHaveBeenCalledWith(expect.anything(), {
      bucket: "bucket",
      key: "uploads/a.txt",
    });
  });

  it("test_handleDelete_uses_explicit_allowed_bucket", async () => {
    vi.mocked(deleteObject).mockResolvedValueOnce();

    const response = await handleBrowserAction(
      new Request("http://localhost/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", key: "uploads/a.txt", bucket: "bucket-b" }),
      }),
      { route: { rootPrefix: "uploads/", buckets: ["bucket", "bucket-b"] }, config },
    );

    expect(response.status).toBe(200);
    expect(deleteObject).toHaveBeenCalledWith(expect.anything(), {
      bucket: "bucket-b",
      key: "uploads/a.txt",
    });
  });

  it("test_handleDeleteMany_removes_files", async () => {
    vi.mocked(deleteObjects).mockResolvedValueOnce({
      deleted: ["uploads/a.txt", "uploads/b.txt"],
      errors: [],
    });

    const response = await handleBrowserAction(
      new Request("http://localhost/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-many", keys: ["uploads/a.txt", "uploads/b.txt"] }),
      }),
      { route: { rootPrefix: "uploads/" }, config },
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.deleted).toEqual(["uploads/a.txt", "uploads/b.txt"]);
  });

  it("test_handleRename_copies_and_deletes", async () => {
    vi.mocked(copyObject).mockResolvedValueOnce();
    vi.mocked(deleteObject).mockResolvedValueOnce();

    const response = await handleBrowserAction(
      new Request("http://localhost/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", key: "uploads/old.txt", newName: "new.txt" }),
      }),
      { route: { rootPrefix: "uploads/" }, config },
    );

    expect(response.status).toBe(200);
    expect(copyObject).toHaveBeenCalledWith(expect.anything(), {
      bucket: "bucket",
      sourceKey: "uploads/old.txt",
      destinationKey: "uploads/new.txt",
    });
    expect(deleteObject).toHaveBeenCalled();
  });

  it("test_handleMove_and_copy", async () => {
    vi.mocked(copyObject).mockResolvedValue(undefined);
    vi.mocked(deleteObject).mockResolvedValue(undefined);

    const moveResponse = await handleBrowserAction(
      new Request("http://localhost/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "move", key: "uploads/a.txt", destination: "uploads/folder/" }),
      }),
      { route: { rootPrefix: "uploads/" }, config },
    );

    const copyResponse = await handleBrowserAction(
      new Request("http://localhost/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copy", key: "uploads/a.txt", destination: "uploads/copy.txt" }),
      }),
      { route: { rootPrefix: "uploads/" }, config },
    );

    expect(moveResponse.status).toBe(200);
    expect(copyResponse.status).toBe(200);
    expect(copyObject).toHaveBeenNthCalledWith(1, expect.anything(), {
      bucket: "bucket",
      sourceKey: "uploads/a.txt",
      destinationKey: "uploads/folder/a.txt",
    });
  });

  it("test_handleCreateFolder_creates_empty_object", async () => {
    vi.mocked(putEmptyObject).mockResolvedValueOnce();

    const response = await handleBrowserAction(
      new Request("http://localhost/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-folder", prefix: "uploads/", folderName: "new" }),
      }),
      { route: { rootPrefix: "uploads/" }, config },
    );

    expect(response.status).toBe(200);
    expect(putEmptyObject).toHaveBeenCalledWith(expect.anything(), {
      bucket: "bucket",
      key: "uploads/new/",
    });
  });

  it("test_handleGetDownloadUrl_and_preview", async () => {
    vi.mocked(generatePresignedGetUrl)
      .mockResolvedValueOnce("https://download-url")
      .mockResolvedValueOnce("https://preview-url");

    const downloadResponse = await handleBrowserAction(
      new Request("http://localhost/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-download-url", key: "uploads/file.txt" }),
      }),
      { route: { rootPrefix: "uploads/" }, config },
    );

    const previewResponse = await handleBrowserAction(
      new Request("http://localhost/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-preview-url", key: "uploads/file.txt" }),
      }),
      { route: { rootPrefix: "uploads/" }, config },
    );

    expect((await downloadResponse.json()).url).toBe("https://download-url");
    expect((await previewResponse.json()).url).toBe("https://preview-url");
    expect(generatePresignedGetUrl).toHaveBeenNthCalledWith(1, expect.anything(), {
      bucket: "bucket",
      key: "uploads/file.txt",
      forceDownload: true,
    });
    expect(generatePresignedGetUrl).toHaveBeenNthCalledWith(2, expect.anything(), {
      bucket: "bucket",
      key: "uploads/file.txt",
      forceDownload: false,
    });
  });

  it("test_handleBrowserAction_error_handling", async () => {
    const response = await handleBrowserAction(
      new Request("http://localhost/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete" }),
      }),
      {
        route: {} as BrowserRouteConfig,
        config,
      },
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });
});
