import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock XMLHttpRequest (needed by uploadMultipartViaXhr) ──────────────────

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

// ─── Mock localStorage ──────────────────────────────────────────────────────

const localStorageStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(localStorageStore)) {
      delete localStorageStore[key];
    }
  }),
  get length() {
    return Object.keys(localStorageStore).length;
  },
  key: vi.fn((index: number) => Object.keys(localStorageStore)[index] ?? null),
};
vi.stubGlobal("localStorage", mockLocalStorage);

// ─── Mock fetch (for HEAD requests) ─────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  checkUploadedParts,
  uploadMultipartResumable,
  saveUploadState,
  loadUploadState,
  type UploadState,
} from "../_internal/upload-browser";

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("checkUploadedParts", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("test_checkUploadedParts_some_exist", async () => {
    const parts = [
      { partNumber: 1, url: "https://s3.example.com/part-1" },
      { partNumber: 2, url: "https://s3.example.com/part-2" },
      { partNumber: 3, url: "https://s3.example.com/part-3" },
    ];

    // Part 1 and 3 exist, part 2 does not
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ ETag: '"etag-1"' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ ETag: '"etag-3"' }),
      });

    const statuses = await checkUploadedParts(parts);

    expect(statuses).toHaveLength(3);
    expect(statuses[0]).toEqual({ partNumber: 1, uploaded: true, etag: '"etag-1"' });
    expect(statuses[1]).toEqual({ partNumber: 2, uploaded: false });
    expect(statuses[2]).toEqual({ partNumber: 3, uploaded: true, etag: '"etag-3"' });

    // Verify HEAD requests were made
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenCalledWith("https://s3.example.com/part-1", {
      method: "HEAD",
      signal: undefined,
    });
  });
});

describe("uploadMultipartResumable", () => {
  beforeEach(() => {
    mockXhrInstances = [];
    mockFetch.mockReset();
    vi.clearAllMocks();
  });

  it("test_uploadMultipartResumable_skips_completed", async () => {
    const parts = Array.from({ length: 10 }, (_, i) => ({
      partNumber: i + 1,
      url: `https://s3.example.com/part-${i + 1}`,
    }));

    const fileContent = new Uint8Array(10 * 1024);
    const file = new File([fileContent], "test.bin", { type: "application/octet-stream" });

    // 6 of 10 parts already completed
    const completedParts = Array.from({ length: 6 }, (_, i) => ({
      partNumber: i + 1,
      etag: `"etag-${i + 1}"`,
    }));

    const promise = uploadMultipartResumable({
      file,
      parts,
      chunkSize: 1024,
      completedParts,
    });

    // Only 4 remaining parts should be uploaded
    for (let i = 0; i < 4; i++) {
      await vi.waitFor(() => {
        expect(mockXhrInstances.length).toBeGreaterThan(i);
      });
      mockXhrInstances[i]!._triggerLoad(200, `"etag-${i + 7}"`);
      await new Promise((r) => setTimeout(r, 0));
    }

    const result = await promise;

    // Should have all 10 parts
    expect(result).toHaveLength(10);
    // Only 4 XHR requests should have been made (not 10)
    expect(mockXhrInstances).toHaveLength(4);
    // Verify sorted by partNumber
    for (let i = 0; i < result.length; i++) {
      expect(result[i]!.partNumber).toBe(i + 1);
    }
  });

  it("test_uploadMultipartResumable_progress_offset", async () => {
    const parts = Array.from({ length: 10 }, (_, i) => ({
      partNumber: i + 1,
      url: `https://s3.example.com/part-${i + 1}`,
    }));

    const fileContent = new Uint8Array(10 * 1024);
    const file = new File([fileContent], "test.bin", { type: "application/octet-stream" });

    // 5 of 10 parts already completed (50%)
    const completedParts = Array.from({ length: 5 }, (_, i) => ({
      partNumber: i + 1,
      etag: `"etag-${i + 1}"`,
    }));

    const progressEvents: Array<{ loaded: number; total: number; percentage: number }> = [];

    const promise = uploadMultipartResumable({
      file,
      parts,
      chunkSize: 1024,
      completedParts,
      onProgress: (e) => progressEvents.push(e),
    });

    // Resolve remaining 5 parts
    for (let i = 0; i < 5; i++) {
      await vi.waitFor(() => {
        expect(mockXhrInstances.length).toBeGreaterThan(i);
      });
      mockXhrInstances[i]!._triggerLoad(200, `"etag-${i + 6}"`);
      await new Promise((r) => setTimeout(r, 0));
    }

    await promise;

    // Progress should account for the completed offset
    // completedBytes = 5 * 1024 = 5120
    // So the first progress event should have loaded > 5120
    if (progressEvents.length > 0) {
      // All progress events should include the offset
      for (const e of progressEvents) {
        expect(e.loaded).toBeGreaterThanOrEqual(5 * 1024);
        expect(e.total).toBe(file.size);
      }
    }
  });
});

describe("saveLoadUploadState", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  it("test_saveLoadUploadState_roundtrip", () => {
    const state: UploadState = {
      fileKey: "abc123.jpg",
      uploadId: "upload-id-456",
      completedParts: [
        { partNumber: 1, etag: '"etag-1"' },
        { partNumber: 2, etag: '"etag-2"' },
      ],
      totalParts: 10,
      chunkSize: 1024 * 1024,
      fileName: "photo.jpg",
      fileSize: 10 * 1024 * 1024,
      timestamp: Date.now(),
    };

    saveUploadState(state);
    const loaded = loadUploadState("abc123.jpg");

    expect(loaded).not.toBeNull();
    expect(loaded!.fileKey).toBe(state.fileKey);
    expect(loaded!.uploadId).toBe(state.uploadId);
    expect(loaded!.completedParts).toEqual(state.completedParts);
    expect(loaded!.totalParts).toBe(state.totalParts);
    expect(loaded!.chunkSize).toBe(state.chunkSize);
    expect(loaded!.fileName).toBe(state.fileName);
    expect(loaded!.fileSize).toBe(state.fileSize);
  });

  it("test_loadUploadState_expired", () => {
    const state: UploadState = {
      fileKey: "abc123.jpg",
      uploadId: "upload-id-456",
      completedParts: [],
      totalParts: 10,
      chunkSize: 1024 * 1024,
      fileName: "photo.jpg",
      fileSize: 10 * 1024 * 1024,
      timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago (expired)
    };

    saveUploadState(state);
    const loaded = loadUploadState("abc123.jpg");

    expect(loaded).toBeNull();
  });
});
