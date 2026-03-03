import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { UploadError } from "s3-good/types";

const mockUploadFiles = vi.fn();
const mockCreateUpload = vi.fn();
const mockEnqueueUpload = vi.fn();
const mockGetQueueState = vi.fn(() => ({ jobs: [], activeCount: 0 }));
const mockResumePending = vi.fn();

vi.mock("s3-good/client", () => ({
  genUploader: () => ({ uploadFiles: mockUploadFiles, createUpload: mockCreateUpload }),
  createS3GoodClient: () => ({
    uploads: {
      uploadFiles: mockUploadFiles,
      createUpload: mockCreateUpload,
      enqueueUpload: mockEnqueueUpload,
      getQueueState: mockGetQueueState,
      resumePending: mockResumePending,
    },
  }),
}));

// ─── Mock fetch (for permittedFileInfo) ─────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Mock requestAnimationFrame ─────────────────────────────────────────────

vi.stubGlobal("requestAnimationFrame", (cb: () => void) => {
  cb();
  return 0;
});
vi.stubGlobal("cancelAnimationFrame", vi.fn());

import { useUpload } from "../use-upload";

// ─── Test Router Type ───────────────────────────────────────────────────────

type TestRouter = {
  imageUploader: {
    _def: any;
    _input: undefined;
    _metadata: { userId: string };
    _output: { url: string };
  };
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("useUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnqueueUpload.mockImplementation((_endpoint, _opts) => ({
      id: "job-default",
      start: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn(),
      result: Promise.resolve([]),
    }));
    mockFetch.mockResolvedValue({
      ok: false,
    });
  });

  it("test_initial_state", () => {
    const { result } = renderHook(() =>
      useUpload<TestRouter, "imageUploader">("imageUploader"),
    );

    expect(result.current.isUploading).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.permittedFileInfo).toBeUndefined();
    expect(typeof result.current.startUpload).toBe("function");
    expect(typeof result.current.abort).toBe("function");
  });

  it("test_startUpload_sets_isUploading", async () => {
    let resolveUpload!: (value: any) => void;
    mockEnqueueUpload.mockImplementation((_endpoint, _opts) => ({
      id: "job-pending",
      start: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn(),
      result: new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    }));

    const { result } = renderHook(() =>
      useUpload<TestRouter, "imageUploader">("imageUploader"),
    );

    const file = new File(["hello"], "photo.jpg", { type: "image/jpeg" });

    // Start upload (don't await)
    let uploadPromise!: Promise<any>;
    act(() => {
      uploadPromise = result.current.startUpload([file]);
    });

    // isUploading should be true while upload is in progress
    await waitFor(() => {
      expect(result.current.isUploading).toBe(true);
    });

    await act(async () => {
      resolveUpload([{ key: "abc.jpg", url: "https://example.com/abc.jpg", name: "photo.jpg", size: 5, type: "image/jpeg", serverData: {} }]);
      await uploadPromise;
    });

    expect(result.current.isUploading).toBe(false);
  });

  it("test_abort_resets_state", async () => {
    const cancel = vi.fn();
    let settleJob!: () => void;
    const jobResult = new Promise<undefined>((resolve) => {
      settleJob = () => resolve(undefined);
    });
    const job = {
      id: "job-abort",
      start: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel,
      result: jobResult,
    };
    mockEnqueueUpload.mockImplementation((_endpoint, _opts) => ({
      ...job,
    }));

    const { result } = renderHook(() =>
      useUpload<TestRouter, "imageUploader">("imageUploader"),
    );

    const file = new File(["hello"], "photo.jpg", { type: "image/jpeg" });

    let uploadPromise: Promise<any>;
    act(() => {
      uploadPromise = result.current.startUpload([file]);
    });

    await waitFor(() => {
      expect(result.current.isUploading).toBe(true);
    });

    act(() => {
      result.current.abort();
    });

    settleJob();
    await act(async () => {
      await job.result;
      await uploadPromise;
    });

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(result.current.isUploading).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it("test_cleanup_on_unmount", async () => {
    const cancel = vi.fn();
    mockEnqueueUpload.mockImplementation((_endpoint, _opts) => ({
      id: "job-unmount",
      start: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel,
      result: new Promise(() => {}),
    }));

    const { result, unmount } = renderHook(() =>
      useUpload<TestRouter, "imageUploader">("imageUploader"),
    );

    const file = new File(["hello"], "photo.jpg", { type: "image/jpeg" });

    act(() => {
      void result.current.startUpload([file]);
    });

    await waitFor(() => {
      expect(result.current.isUploading).toBe(true);
    });

    unmount();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("test_onUploadError_called", async () => {
    const uploadError = new UploadError({
      code: "FILE_TOO_LARGE",
      message: "File exceeds limit",
    });
    mockEnqueueUpload.mockImplementation((_endpoint, _opts) => ({
      id: "job-error",
      start: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn(),
      result: Promise.reject(uploadError),
    }));

    const onUploadError = vi.fn();

    const { result } = renderHook(() =>
      useUpload<TestRouter, "imageUploader">("imageUploader", {
        onUploadError,
      }),
    );

    const file = new File(["hello"], "photo.jpg", { type: "image/jpeg" });

    await act(async () => {
      await result.current.startUpload([file]);
    });

    expect(onUploadError).toHaveBeenCalledTimes(1);
    expect(onUploadError).toHaveBeenCalledWith(uploadError);
    expect(result.current.isUploading).toBe(false);
    expect(result.current.progress).toBe(0);
  });
});
