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

describe("createS3GoodClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
