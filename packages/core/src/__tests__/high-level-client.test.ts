import { beforeEach, describe, expect, it, vi } from "vitest";
import { UploadError } from "@s3-good/shared";
import { createS3GoodClient } from "../_internal/high-level-client";

const mockUploadFiles = vi.fn();
const mockCreateUpload = vi.fn();

vi.mock("../_internal/client-factory", () => ({
  genUploader: () => ({
    uploadFiles: mockUploadFiles,
    createUpload: mockCreateUpload,
  }),
}));

function createIndexedDbMock() {
  const store = new Map<string, unknown>();
  return {
    open: vi.fn((_name: string, _version: number) => {
      const request: {
        result?: any;
        onupgradeneeded?: () => void;
        onsuccess?: () => void;
        onerror?: () => void;
      } = {};

      queueMicrotask(() => {
        const db = {
          createObjectStore: (_storeName: string) => ({}),
          transaction: (_storeName: string, _mode: "readonly" | "readwrite") => {
            const tx: { oncomplete?: () => void; onerror?: () => void } = {};
            const objectStore = {
              put: (value: unknown, key: string) => {
                store.set(key, value);
              },
              get: (key: string) => {
                const getRequest: {
                  result?: unknown;
                  onsuccess?: () => void;
                  onerror?: () => void;
                } = {};
                queueMicrotask(() => {
                  getRequest.result = store.get(key);
                  getRequest.onsuccess?.();
                });
                return getRequest;
              },
            };
            queueMicrotask(() => tx.oncomplete?.());
            return {
              objectStore: () => objectStore,
              get oncomplete() {
                return tx.oncomplete;
              },
              set oncomplete(cb) {
                tx.oncomplete = cb;
              },
              get onerror() {
                return tx.onerror;
              },
              set onerror(cb) {
                tx.onerror = cb;
              },
            };
          },
          close: () => undefined,
        };
        request.result = db;
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });

      return request;
    }),
  };
}

describe("createS3GoodClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as Record<string, unknown>).indexedDB;
  });

  it("enqueues and uploads files with autoStart", async () => {
    mockUploadFiles.mockResolvedValue([{ key: "k", url: "u", name: "a.png", size: 1, type: "image/png", serverData: {} }]);
    const client = createS3GoodClient<any>({
      queue: { concurrency: 1, autoStart: true },
      retry: { maxAttempts: 1 },
    });

    const handle = client.uploads.enqueueUpload("imageUploader", {
      files: [new File(["x"], "a.png", { type: "image/png" })],
    });
    const result = await handle.result;

    expect(result).toBeDefined();
    expect(mockUploadFiles).toHaveBeenCalledTimes(1);
    const state = client.uploads.getQueueState();
    expect(state.jobs[0]?.state).toBe("completed");
  });

  it("retries retryable failures before succeeding", async () => {
    mockUploadFiles
      .mockRejectedValueOnce(
        new UploadError({
          code: "NETWORK_ERROR",
          message: "temp network issue",
          retryable: true,
        }),
      )
      .mockResolvedValueOnce([{ key: "k", url: "u", name: "a.png", size: 1, type: "image/png", serverData: {} }]);

    const client = createS3GoodClient<any>({
      queue: { concurrency: 1, autoStart: true },
      retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0, jitter: false },
    });

    const handle = client.uploads.enqueueUpload("imageUploader", {
      files: [new File(["x"], "a.png", { type: "image/png" })],
    });

    await handle.result;
    expect(mockUploadFiles).toHaveBeenCalledTimes(2);
    expect(client.uploads.getQueueState().jobs[0]?.state).toBe("completed");
  });

  it("pauses an active upload and resumes it later", async () => {
    mockUploadFiles
      .mockImplementationOnce((_endpoint, opts) => {
        return new Promise((_resolve, reject) => {
          opts.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        });
      })
      .mockResolvedValueOnce([{ key: "k", url: "u", name: "a.png", size: 1, type: "image/png", serverData: {} }]);

    const client = createS3GoodClient<any>({
      queue: { concurrency: 1, autoStart: true },
      retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0, jitter: false },
    });

    const handle = client.uploads.enqueueUpload("imageUploader", {
      files: [new File(["x"], "a.png", { type: "image/png" })],
    });

    handle.pause();
    await Promise.resolve();
    expect(client.uploads.getQueueState().jobs[0]?.state).toBe("paused");

    handle.resume();
    await handle.result;
    expect(mockUploadFiles).toHaveBeenCalledTimes(2);
    expect(client.uploads.getQueueState().jobs[0]?.state).toBe("completed");
  });

  it("cancels a queued upload and resolves undefined", async () => {
    const client = createS3GoodClient<any>({
      queue: { concurrency: 1, autoStart: false },
      retry: { maxAttempts: 1 },
    });

    const handle = client.uploads.enqueueUpload("imageUploader", {
      files: [new File(["x"], "a.png", { type: "image/png" })],
    });
    handle.cancel();

    await expect(handle.result).resolves.toBeUndefined();
    expect(mockUploadFiles).toHaveBeenCalledTimes(0);
    expect(client.uploads.getQueueState().jobs[0]?.state).toBe("canceled");
  });

  it("rehydrates queued jobs from indexedDB on resumePending", async () => {
    (globalThis as Record<string, unknown>).indexedDB = createIndexedDbMock();

    const storageKey = "test-resume";
    const file = new File(["x"], "persisted.png", { type: "image/png" });

    const producer = createS3GoodClient<any>({
      queue: { autoStart: false },
      resume: { enabled: true, storageKey },
    });
    producer.uploads.enqueueUpload("imageUploader", { files: [file] });
    await Promise.resolve();

    mockUploadFiles.mockResolvedValueOnce([
      { key: "k", url: "u", name: "persisted.png", size: 1, type: "image/png", serverData: {} },
    ]);
    const consumer = createS3GoodClient<any>({
      queue: { autoStart: false },
      resume: { enabled: true, storageKey },
      retry: { maxAttempts: 1 },
    });

    await consumer.uploads.resumePending();

    expect(mockUploadFiles).toHaveBeenCalledTimes(1);
    const state = consumer.uploads.getQueueState();
    expect(state.jobs.some((job) => job.state === "completed")).toBe(true);
  });

  it("clamps invalid retry.maxAttempts and queue.concurrency values", async () => {
    mockUploadFiles.mockResolvedValue([
      { key: "k", url: "u", name: "a.png", size: 1, type: "image/png", serverData: {} },
    ]);

    const client = createS3GoodClient<any>({
      queue: { concurrency: 0, autoStart: true },
      retry: { maxAttempts: 0, baseDelayMs: 0, maxDelayMs: 0, jitter: false },
    });

    const handle = client.uploads.enqueueUpload("imageUploader", {
      files: [new File(["x"], "a.png", { type: "image/png" })],
    });

    await expect(handle.result).resolves.toBeDefined();
    expect(mockUploadFiles).toHaveBeenCalledTimes(1);
    expect(client.uploads.getQueueState().jobs[0]?.state).toBe("completed");
  });
});
