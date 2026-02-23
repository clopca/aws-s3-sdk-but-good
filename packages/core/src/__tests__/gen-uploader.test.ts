import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock XMLHttpRequest ────────────────────────────────────────────────────

interface MockXhrInstance {
  open: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  setRequestHeader: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
  getResponseHeader: ReturnType<typeof vi.fn>;
  status: number;
  upload: {
    addEventListener: ReturnType<typeof vi.fn>;
    _listeners: Record<string, Array<(e: any) => void>>;
  };
  addEventListener: ReturnType<typeof vi.fn>;
  _listeners: Record<string, Array<(e: any) => void>>;
  _triggerLoad: (status: number, etag?: string) => void;
}

let mockXhrInstances: MockXhrInstance[] = [];

function createMockXhr(): MockXhrInstance {
  const uploadListeners: Record<string, Array<(e: any) => void>> = {};
  const listeners: Record<string, Array<(e: any) => void>> = {};

  const instance: MockXhrInstance = {
    open: vi.fn(),
    send: vi.fn(),
    setRequestHeader: vi.fn(),
    abort: vi.fn(),
    getResponseHeader: vi.fn().mockReturnValue('"mock-etag"'),
    status: 200,
    upload: {
      addEventListener: vi.fn((event: string, handler: (e: any) => void) => {
        if (!uploadListeners[event]) uploadListeners[event] = [];
        uploadListeners[event]!.push(handler);
      }),
      _listeners: uploadListeners,
    },
    addEventListener: vi.fn((event: string, handler: (e: any) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event]!.push(handler);
    }),
    _listeners: listeners,
    _triggerLoad(status: number, etag?: string) {
      instance.status = status;
      if (etag) {
        instance.getResponseHeader = vi.fn().mockReturnValue(etag);
      }
      const handlers = listeners["load"] ?? [];
      for (const h of handlers) {
        h({});
      }
    },
  };

  mockXhrInstances.push(instance);
  return instance;
}

vi.stubGlobal("XMLHttpRequest", vi.fn(() => createMockXhr()));

// ─── Mock fetch ─────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { genUploader } from "../_internal/client-factory";

// ─── Test Router Type ───────────────────────────────────────────────────────

// We define a mock router type for type-level testing
type TestRouter = {
  imageUploader: {
    _def: any;
    _input: undefined;
    _metadata: { userId: string };
    _output: { url: string };
  };
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("genUploader", () => {
  beforeEach(() => {
    mockXhrInstances = [];
    mockFetch.mockReset();
    vi.clearAllMocks();
  });

  it("test_genUploader_returns_functions", () => {
    const uploader = genUploader<TestRouter>();

    expect(uploader).toHaveProperty("uploadFiles");
    expect(uploader).toHaveProperty("createUpload");
    expect(typeof uploader.uploadFiles).toBe("function");
    expect(typeof uploader.createUpload).toBe("function");
  });

  it("test_uploadFiles_requests_presigned_urls", async () => {
    // Mock presigned URL response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          files: [
            {
              key: "abc123.jpg",
              url: "https://s3.example.com/presigned",
            },
          ],
          metadata: "mock-metadata-token",
        }),
    });

    // Mock completion response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          files: [
            {
              key: "abc123.jpg",
              url: "https://bucket.s3.amazonaws.com/abc123.jpg",
              name: "photo.jpg",
              size: 1024,
              type: "image/jpeg",
              serverData: { url: "https://bucket.s3.amazonaws.com/abc123.jpg" },
            },
          ],
        }),
    });

    const { uploadFiles } = genUploader<TestRouter>();
    const file = new File(["hello"], "photo.jpg", { type: "image/jpeg" });

    const promise = uploadFiles("imageUploader", { files: [file] });

    // Wait for XHR to be created and resolve it
    await vi.waitFor(() => {
      expect(mockXhrInstances.length).toBe(1);
    });
    mockXhrInstances[0]!._triggerLoad(200, '"etag-1"');

    const result = await promise;

    // Verify presigned URL request
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const firstCall = mockFetch.mock.calls[0]!;
    expect(firstCall[0]).toBe("/api/upload?slug=imageUploader&actionType=upload");
    expect(firstCall[1]).toMatchObject({ method: "POST" });

    // Verify completion request
    const secondCall = mockFetch.mock.calls[1]!;
    expect(secondCall[0]).toBe(
      "/api/upload?slug=imageUploader&actionType=multipart-complete",
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("key", "abc123.jpg");
  });

  it("test_uploadFiles_custom_url", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          files: [{ key: "abc123.jpg", url: "https://s3.example.com/presigned" }],
          metadata: "mock-token",
        }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          files: [
            {
              key: "abc123.jpg",
              url: "https://bucket.s3.amazonaws.com/abc123.jpg",
              name: "photo.jpg",
              size: 1024,
              type: "image/jpeg",
              serverData: {},
            },
          ],
        }),
    });

    const { uploadFiles } = genUploader<TestRouter>({ url: "/custom/upload" });
    const file = new File(["hello"], "photo.jpg", { type: "image/jpeg" });

    const promise = uploadFiles("imageUploader", { files: [file] });

    await vi.waitFor(() => {
      expect(mockXhrInstances.length).toBe(1);
    });
    mockXhrInstances[0]!._triggerLoad(200, '"etag-1"');

    await promise;

    // Verify custom URL was used
    const firstCall = mockFetch.mock.calls[0]!;
    expect(firstCall[0]).toBe("/custom/upload?slug=imageUploader&actionType=upload");
  });

  it("test_uploadFiles_custom_headers", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          files: [{ key: "abc123.jpg", url: "https://s3.example.com/presigned" }],
          metadata: "mock-token",
        }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          files: [
            {
              key: "abc123.jpg",
              url: "https://bucket.s3.amazonaws.com/abc123.jpg",
              name: "photo.jpg",
              size: 1024,
              type: "image/jpeg",
              serverData: {},
            },
          ],
        }),
    });

    const { uploadFiles } = genUploader<TestRouter>();
    const file = new File(["hello"], "photo.jpg", { type: "image/jpeg" });

    const promise = uploadFiles("imageUploader", {
      files: [file],
      headers: { Authorization: "Bearer token123" },
    });

    await vi.waitFor(() => {
      expect(mockXhrInstances.length).toBe(1);
    });
    mockXhrInstances[0]!._triggerLoad(200, '"etag-1"');

    await promise;

    // Verify custom headers were included
    const firstCall = mockFetch.mock.calls[0]!;
    expect(firstCall[1].headers).toMatchObject({
      Authorization: "Bearer token123",
    });
  });

  it("test_uploadFiles_full_flow", async () => {
    // Step 1: Presign response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          files: [
            {
              key: "abc123.jpg",
              url: "https://s3.example.com/presigned-put",
            },
          ],
          metadata: "encoded-metadata-token",
        }),
    });

    // Step 3: Completion response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          files: [
            {
              key: "abc123.jpg",
              url: "https://bucket.s3.amazonaws.com/abc123.jpg",
              name: "photo.jpg",
              size: 5,
              type: "image/jpeg",
              serverData: { url: "https://bucket.s3.amazonaws.com/abc123.jpg" },
            },
          ],
        }),
    });

    const { uploadFiles } = genUploader<TestRouter>();
    const file = new File(["hello"], "photo.jpg", { type: "image/jpeg" });

    const onBegin = vi.fn();
    const onProgress = vi.fn();

    const promise = uploadFiles("imageUploader", {
      files: [file],
      onUploadBegin: onBegin,
      onUploadProgress: onProgress,
    });

    // Step 2: XHR upload
    await vi.waitFor(() => {
      expect(mockXhrInstances.length).toBe(1);
    });
    const xhr = mockXhrInstances[0]!;
    xhr._triggerLoad(200, '"etag-final"');

    const result = await promise;

    // Verify full flow
    // 1. Presign request was made
    expect(mockFetch.mock.calls[0]![0]).toContain("actionType=upload");
    // 2. XHR upload happened
    expect(xhr.open).toHaveBeenCalledWith("PUT", "https://s3.example.com/presigned-put");
    // 3. Completion request was made
    expect(mockFetch.mock.calls[1]![0]).toContain("actionType=multipart-complete");
    // 4. onUploadBegin was called
    expect(onBegin).toHaveBeenCalledWith("photo.jpg");
    // 5. Result contains server data
    expect(result).toHaveLength(1);
    expect(result[0]!.key).toBe("abc123.jpg");
    expect(result[0]!.serverData).toEqual({
      url: "https://bucket.s3.amazonaws.com/abc123.jpg",
    });
  });
});
