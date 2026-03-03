import { describe, it, expect, vi, beforeEach } from "vitest";
import { UploadError } from "@s3-good-internal/shared";

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
  // Helpers for triggering events in tests
  _triggerUploadProgress: (loaded: number, total: number) => void;
  _triggerLoad: (status: number, etag?: string) => void;
  _triggerError: () => void;
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
    _triggerUploadProgress(loaded: number, total: number) {
      const handlers = uploadListeners["progress"] ?? [];
      for (const h of handlers) {
        h({ lengthComputable: true, loaded, total });
      }
    },
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
    _triggerError() {
      const handlers = listeners["error"] ?? [];
      for (const h of handlers) {
        h({});
      }
    },
  };

  mockXhrInstances.push(instance);
  return instance;
}

// Install mock XMLHttpRequest globally
const MockXMLHttpRequest = vi.fn(() => createMockXhr());
vi.stubGlobal("XMLHttpRequest", MockXMLHttpRequest);

import {
  uploadFileViaXhr,
  uploadMultipartViaXhr,
  uploadFile,
} from "../_internal/upload-browser";

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("uploadFileViaXhr", () => {
  beforeEach(() => {
    mockXhrInstances = [];
    vi.clearAllMocks();
  });

  it("test_uploadFileViaXhr_success", async () => {
    const file = new Blob(["hello"], { type: "text/plain" });
    const promise = uploadFileViaXhr({
      url: "https://s3.example.com/presigned",
      file,
      contentType: "text/plain",
    });

    // Simulate successful upload
    const xhr = mockXhrInstances[0]!;
    xhr._triggerLoad(200, '"etag-123"');

    const result = await promise;
    expect(result.etag).toBe('"etag-123"');
    expect(xhr.open).toHaveBeenCalledWith("PUT", "https://s3.example.com/presigned");
    expect(xhr.setRequestHeader).toHaveBeenCalledWith("Content-Type", "text/plain");
  });

  it("test_uploadFileViaXhr_no_checksum_header_sent", async () => {
    const file = new Blob(["hello"], { type: "text/plain" });
    const promise = uploadFileViaXhr({
      url: "https://s3.example.com/presigned",
      file,
      contentType: "text/plain",
    });

    const xhr = mockXhrInstances[0]!;
    xhr._triggerLoad(200, '"etag-789"');

    await promise;
    // Should only have Content-Type header, not checksum
    expect(xhr.setRequestHeader).toHaveBeenCalledTimes(1);
    expect(xhr.setRequestHeader).toHaveBeenCalledWith("Content-Type", "text/plain");
  });

  it("test_uploadFileViaXhr_progress", async () => {
    const file = new Blob(["hello world"], { type: "text/plain" });
    const progressEvents: Array<{ loaded: number; total: number; percentage: number }> = [];

    const promise = uploadFileViaXhr({
      url: "https://s3.example.com/presigned",
      file,
      contentType: "text/plain",
      onProgress: (e) => progressEvents.push(e),
    });

    const xhr = mockXhrInstances[0]!;
    xhr._triggerUploadProgress(50, 100);
    xhr._triggerUploadProgress(100, 100);
    xhr._triggerLoad(200);

    await promise;

    expect(progressEvents).toHaveLength(2);
    expect(progressEvents[0]).toEqual({ loaded: 50, total: 100, percentage: 50 });
    expect(progressEvents[1]).toEqual({ loaded: 100, total: 100, percentage: 100 });
  });

  it("test_uploadFileViaXhr_abort", async () => {
    const file = new Blob(["hello"], { type: "text/plain" });
    const controller = new AbortController();

    const promise = uploadFileViaXhr({
      url: "https://s3.example.com/presigned",
      file,
      contentType: "text/plain",
      signal: controller.signal,
    });

    // Abort the upload
    controller.abort();

    await expect(promise).rejects.toThrow(UploadError);
    await expect(promise).rejects.toMatchObject({
      code: "UPLOAD_FAILED",
      message: "Upload aborted",
    });
  });

  it("test_uploadFileViaXhr_network_error", async () => {
    const file = new Blob(["hello"], { type: "text/plain" });

    const promise = uploadFileViaXhr({
      url: "https://s3.example.com/presigned",
      file,
      contentType: "text/plain",
    });

    const xhr = mockXhrInstances[0]!;
    xhr._triggerError();

    await expect(promise).rejects.toThrow(UploadError);
    await expect(promise).rejects.toMatchObject({
      code: "UPLOAD_FAILED",
      message: "Network error during upload",
    });
  });
});

describe("uploadMultipartViaXhr", () => {
  beforeEach(() => {
    mockXhrInstances = [];
    vi.clearAllMocks();
  });

  it("test_uploadMultipartViaXhr_concurrency", async () => {
    // Create 10 parts
    const parts = Array.from({ length: 10 }, (_, i) => ({
      partNumber: i + 1,
      url: `https://s3.example.com/part-${i + 1}`,
    }));

    const fileContent = new Uint8Array(10 * 1024); // 10KB file
    const file = new File([fileContent], "test.bin", { type: "application/octet-stream" });

    const promise = uploadMultipartViaXhr({
      file,
      parts,
      chunkSize: 1024, // 1KB chunks
    });

    // Wait for XHR instances to be created (workers start immediately)
    await vi.waitFor(() => {
      expect(mockXhrInstances.length).toBeGreaterThanOrEqual(1);
    });

    // Resolve all XHR instances as they appear
    // The concurrency limit is 6, so at most 6 should be active initially
    const resolveAll = async () => {
      let resolved = 0;
      while (resolved < 10) {
        await vi.waitFor(() => {
          expect(mockXhrInstances.length).toBeGreaterThan(resolved);
        });
        const xhr = mockXhrInstances[resolved]!;
        xhr._triggerLoad(200, `"etag-${resolved + 1}"`);
        resolved++;
        // Yield to allow workers to pick up next part
        await new Promise((r) => setTimeout(r, 0));
      }
    };

    await resolveAll();
    const result = await promise;

    expect(result).toHaveLength(10);
    // Verify sorted by partNumber
    for (let i = 0; i < result.length; i++) {
      expect(result[i]!.partNumber).toBe(i + 1);
      expect(result[i]!.etag).toBeDefined();
    }

    // Verify max concurrency: at most 6 XHR instances should have been created
    // before any completed (we can't easily test this precisely with async,
    // but we verify all 10 completed)
    expect(mockXhrInstances).toHaveLength(10);
  });

  it("test_uploadMultipartViaXhr_aggregated_progress", async () => {
    const parts = Array.from({ length: 3 }, (_, i) => ({
      partNumber: i + 1,
      url: `https://s3.example.com/part-${i + 1}`,
    }));

    const fileContent = new Uint8Array(3 * 1024);
    const file = new File([fileContent], "test.bin", { type: "application/octet-stream" });
    const progressEvents: Array<{ loaded: number; total: number; percentage: number }> = [];

    const promise = uploadMultipartViaXhr({
      file,
      parts,
      chunkSize: 1024,
      onProgress: (e) => progressEvents.push(e),
    });

    // Resolve all parts
    for (let i = 0; i < 3; i++) {
      await vi.waitFor(() => {
        expect(mockXhrInstances.length).toBeGreaterThan(i);
      });
      const xhr = mockXhrInstances[i]!;
      // Trigger progress then complete
      xhr._triggerUploadProgress(512, 1024);
      xhr._triggerLoad(200, `"etag-${i + 1}"`);
      await new Promise((r) => setTimeout(r, 0));
    }

    await promise;

    // Progress should have been reported with aggregated values
    expect(progressEvents.length).toBeGreaterThan(0);
    // Each progress event should have total = file.size
    for (const e of progressEvents) {
      expect(e.total).toBe(file.size);
    }
  });
});

describe("uploadFile (unified)", () => {
  beforeEach(() => {
    mockXhrInstances = [];
    vi.clearAllMocks();
  });

  it("test_uploadFile_simple", async () => {
    const file = new File(["hello"], "test.txt", { type: "text/plain" });

    const promise = uploadFile({
      file,
      presignedData: {
        key: "abc123.txt",
        url: "https://s3.example.com/presigned",
      },
    });

    await vi.waitFor(() => {
      expect(mockXhrInstances.length).toBe(1);
    });
    mockXhrInstances[0]!._triggerLoad(200, '"etag-simple"');

    const result = await promise;
    expect(result.key).toBe("abc123.txt");
    expect(result.etags).toBeUndefined();
  });

  it("test_uploadFile_simple_with_checksum_does_not_send_header", async () => {
    const file = new File(["hello"], "test.txt", { type: "text/plain" });

    const promise = uploadFile({
      file,
      presignedData: {
        key: "abc123.txt",
        url: "https://s3.example.com/presigned",
        checksumSHA256: "LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=",
      },
    });

    await vi.waitFor(() => {
      expect(mockXhrInstances.length).toBe(1);
    });

    const xhr = mockXhrInstances[0]!;
    xhr._triggerLoad(200, '"etag-checksum"');

    const result = await promise;
    expect(result.key).toBe("abc123.txt");
    // Verify the checksum header is NOT sent (it's not part of the presigned URL)
    expect(xhr.setRequestHeader).not.toHaveBeenCalledWith(
      "x-amz-checksum-sha256",
      expect.anything(),
    );
    // Only Content-Type should be set
    expect(xhr.setRequestHeader).toHaveBeenCalledTimes(1);
    expect(xhr.setRequestHeader).toHaveBeenCalledWith("Content-Type", "text/plain");
  });

  it("test_uploadFile_multipart", async () => {
    const fileContent = new Uint8Array(2 * 1024);
    const file = new File([fileContent], "test.bin", { type: "application/octet-stream" });

    const promise = uploadFile({
      file,
      presignedData: {
        key: "abc123.bin",
        parts: [
          { partNumber: 1, url: "https://s3.example.com/part-1" },
          { partNumber: 2, url: "https://s3.example.com/part-2" },
        ],
        chunkSize: 1024,
        chunkCount: 2,
      },
    });

    // Resolve both parts
    for (let i = 0; i < 2; i++) {
      await vi.waitFor(() => {
        expect(mockXhrInstances.length).toBeGreaterThan(i);
      });
      mockXhrInstances[i]!._triggerLoad(200, `"etag-${i + 1}"`);
      await new Promise((r) => setTimeout(r, 0));
    }

    const result = await promise;
    expect(result.key).toBe("abc123.bin");
    expect(result.etags).toHaveLength(2);
    expect(result.etags![0]!.partNumber).toBe(1);
    expect(result.etags![1]!.partNumber).toBe(2);
  });
});
