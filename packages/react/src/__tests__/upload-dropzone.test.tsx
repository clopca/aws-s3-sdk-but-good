import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import React from "react";

// ─── Mock URL.createObjectURL / revokeObjectURL ─────────────────────────────

vi.stubGlobal("URL", {
  ...globalThis.URL,
  createObjectURL: vi.fn((file: File) => `blob:mock-${file.name}`),
  revokeObjectURL: vi.fn(),
});

// ─── Mock useUpload ─────────────────────────────────────────────────────────

const mockStartUpload = vi.fn();
const mockAbort = vi.fn();

const defaultHookReturn = {
  startUpload: mockStartUpload,
  isUploading: false,
  progress: 0,
  abort: mockAbort,
  permittedFileInfo: {
    slug: "imageUploader",
    config: { image: { maxFileSize: "4MB", maxFileCount: 5 } },
    fileTypes: ["image"],
    maxFileSize: "4MB",
    maxFileCount: 5,
  },
};

let hookReturnOverride: Partial<typeof defaultHookReturn> = {};

vi.mock("../use-upload", () => ({
  useUpload: () => ({
    ...defaultHookReturn,
    ...hookReturnOverride,
  }),
}));

import { UploadDropzone } from "../components/dropzone";

// ─── Test Router Type ───────────────────────────────────────────────────────

type TestRouter = {
  imageUploader: {
    _def: any;
    _input: undefined;
    _metadata: { userId: string };
    _output: { url: string };
  };
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function createDataTransfer(files: File[]): DataTransfer {
  return {
    files,
    items: files.map((f) => ({ kind: "file", type: f.type, getAsFile: () => f })),
    types: ["Files"],
  } as unknown as DataTransfer;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("UploadDropzone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookReturnOverride = {};
    mockStartUpload.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it("test_renders_dropzone", () => {
    render(
      <UploadDropzone<TestRouter, "imageUploader">
        endpoint="imageUploader"
      />,
    );

    // Should render the default label text
    expect(
      screen.getByText("Drag & drop files here, or click to browse"),
    ).toBeTruthy();
    // Should have the dropzone with aria-label
    expect(screen.getByLabelText("Upload dropzone")).toBeTruthy();
  });

  it("test_drag_over_visual", () => {
    render(
      <UploadDropzone<TestRouter, "imageUploader">
        endpoint="imageUploader"
      />,
    );

    const dropzone = screen.getByLabelText("Upload dropzone");

    // Simulate drag over
    fireEvent.dragOver(dropzone, {
      dataTransfer: createDataTransfer([]),
    });

    // data-state should change to "dragover"
    expect(dropzone.getAttribute("data-state")).toBe("dragover");
  });

  it("test_drop_triggers_upload", async () => {
    render(
      <UploadDropzone<TestRouter, "imageUploader">
        endpoint="imageUploader"
        mode="auto"
      />,
    );

    const dropzone = screen.getByLabelText("Upload dropzone");
    const file = new File(["hello"], "photo.jpg", { type: "image/jpeg" });

    fireEvent.drop(dropzone, {
      dataTransfer: createDataTransfer([file]),
    });

    await waitFor(() => {
      expect(mockStartUpload).toHaveBeenCalledTimes(1);
    });
  });

  it("test_click_opens_file_dialog", () => {
    render(
      <UploadDropzone<TestRouter, "imageUploader">
        endpoint="imageUploader"
      />,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    const dropzone = screen.getByLabelText("Upload dropzone");
    fireEvent.click(dropzone);

    // click() is called at least once (may be called more due to event bubbling)
    expect(clickSpy).toHaveBeenCalled();
  });

  it("test_image_previews", async () => {
    render(
      <UploadDropzone<TestRouter, "imageUploader">
        endpoint="imageUploader"
        mode="manual"
      />,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const imageFile = new File(["img-data"], "photo.jpg", {
      type: "image/jpeg",
    });

    fireEvent.change(input, { target: { files: [imageFile] } });

    // Previews should appear (using mocked URL.createObjectURL)
    await waitFor(() => {
      const imgs = document.querySelectorAll("img");
      expect(imgs.length).toBeGreaterThan(0);
      expect(imgs[0]!.src).toContain("blob:mock-photo.jpg");
    });
  });

  it("test_paste_support", async () => {
    render(
      <UploadDropzone<TestRouter, "imageUploader">
        endpoint="imageUploader"
        mode="auto"
        onPaste={true}
      />,
    );

    const file = new File(["hello"], "pasted.png", { type: "image/png" });

    // Simulate paste event on document
    const pasteEvent = new Event("paste", { bubbles: true }) as any;
    pasteEvent.clipboardData = {
      files: [file],
    };
    pasteEvent.preventDefault = vi.fn();
    document.dispatchEvent(pasteEvent);

    await waitFor(() => {
      expect(mockStartUpload).toHaveBeenCalledTimes(1);
    });
  });

  it("test_progress_bar", () => {
    hookReturnOverride = {
      isUploading: true,
      progress: 65,
    };

    render(
      <UploadDropzone<TestRouter, "imageUploader">
        endpoint="imageUploader"
      />,
    );

    // The label should show uploading text
    expect(screen.getByText("Uploading... 65%")).toBeTruthy();

    // A progress bar should be visible (div with width style)
    const dropzone = screen.getByLabelText("Upload dropzone");
    // Find the progress fill element by its style
    const progressFill = dropzone.querySelector(
      '[style*="width: 65%"]',
    ) as HTMLElement;
    expect(progressFill).toBeTruthy();
  });
});
