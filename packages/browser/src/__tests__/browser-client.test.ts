import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBrowserClient } from "../client";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("browser client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("test_list_sends_POST_with_bucket_and_filters", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      action: "list",
      success: true,
      items: [],
      isTruncated: false,
    }), { status: 200 }));

    const client = createBrowserClient({ url: "/api/browser" });
    await client.list({
      bucket: "assets-a",
      prefix: "photos/",
      filters: {
        search: "cat",
        contentTypes: ["image/jpeg"],
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/browser",
      expect.objectContaining({
        method: "POST",
        body: expect.stringMatching(/"action":"list"/),
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? "{}"));
    expect(body).toMatchObject({
      action: "list",
      bucket: "assets-a",
      prefix: "photos/",
      filters: {
        search: "cat",
        contentTypes: ["image/jpeg"],
        prefix: "photos/",
      },
    });
  });

  it("test_list_deserializes_dates", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      action: "list",
      success: true,
      items: [
        {
          kind: "file",
          key: "a.txt",
          name: "a.txt",
          size: 1,
          contentType: "text/plain",
          lastModified: "2026-01-01T00:00:00.000Z",
        },
      ],
      isTruncated: false,
    }), { status: 200 }));

    const client = createBrowserClient();
    const result = await client.list();

    expect(result.items[0]?.kind).toBe("file");
    if (result.items[0]?.kind === "file") {
      expect(result.items[0].lastModified).toBeInstanceOf(Date);
    }
  });

  it("test_mutation_methods_send_POST", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ action: "delete", success: true }), { status: 200 }));

    const client = createBrowserClient();
    await client.deleteFile("a.txt");
    await client.rename("a.txt", "b.txt");
    await client.move("a.txt", "folder/");
    await client.copy("a.txt", "copy.txt");
    await client.createFolder("root/", "new");

    fetchMock.mock.calls.forEach(([, init]) => {
      expect(init.method).toBe("POST");
    });
  });

  it("test_deleteMany_returns_deleted", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      action: "delete-many",
      success: true,
      deleted: ["a.txt", "b.txt"],
    }), { status: 200 }));

    const client = createBrowserClient();
    const result = await client.deleteMany(["a.txt", "b.txt"]);

    expect(result.deleted).toEqual(["a.txt", "b.txt"]);
  });

  it("test_getDownloadUrl_and_getPreviewUrl", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ action: "get-download-url", success: true, url: "https://d" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ action: "get-preview-url", success: true, url: "https://p" }), { status: 200 }));

    const client = createBrowserClient();

    await expect(client.getDownloadUrl("a.txt")).resolves.toBe("https://d");
    await expect(client.getPreviewUrl("a.txt")).resolves.toBe("https://p");
  });

  it("test_custom_headers_included_static_and_async", async () => {
    fetchMock
      .mockResolvedValue(new Response(JSON.stringify({ action: "delete", success: true }), { status: 200 }));

    const staticClient = createBrowserClient({ headers: { Authorization: "Bearer 1" } });
    await staticClient.deleteFile("a.txt");

    const asyncClient = createBrowserClient({ headers: async () => ({ Authorization: "Bearer 2" }) });
    await asyncClient.deleteFile("b.txt");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const staticCall = fetchMock.mock.calls[0];
    const asyncCall = fetchMock.mock.calls[1];
    const staticHeaders = (staticCall?.[1]?.headers ?? {}) as Record<string, string>;
    const asyncHeaders = (asyncCall?.[1]?.headers ?? {}) as Record<string, string>;

    expect(staticHeaders["Content-Type"]).toBe("application/json");
    expect(staticHeaders.Authorization ?? staticHeaders.authorization).toBe("Bearer 1");

    expect(asyncHeaders["Content-Type"]).toBe("application/json");
    expect(asyncHeaders.Authorization ?? asyncHeaders.authorization).toBe("Bearer 2");
  });

  it("test_error_includes_status_and_action", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      action: "delete",
      success: false,
      error: "forbidden",
    }), { status: 403 }));

    const client = createBrowserClient();

    await expect(client.deleteFile("a.txt")).rejects.toMatchObject({
      name: "BrowserClientError",
      status: 403,
      action: "delete",
      message: "forbidden",
    });
  });
});
