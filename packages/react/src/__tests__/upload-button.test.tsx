import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import React from "react";

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

import { UploadButton } from "../components/button";

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

describe("UploadButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookReturnOverride = {};
    mockStartUpload.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it("test_renders_button", () => {
    render(
      <UploadButton<TestRouter, "imageUploader"> endpoint="imageUploader" />,
    );

    // Should render the default "Choose File" text
    expect(screen.getByText("Choose File")).toBeTruthy();
  });

  it("test_auto_mode_uploads_on_select", async () => {
    render(
      <UploadButton<TestRouter, "imageUploader">
        endpoint="imageUploader"
        mode="auto"
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    const file = new File(["hello"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockStartUpload).toHaveBeenCalledTimes(1);
      expect(mockStartUpload).toHaveBeenCalledWith([file], undefined);
    });
  });

  it("test_manual_mode_stages_files", async () => {
    render(
      <UploadButton<TestRouter, "imageUploader">
        endpoint="imageUploader"
        mode="manual"
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["hello"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });

    // In manual mode, startUpload should NOT be called on file select
    expect(mockStartUpload).not.toHaveBeenCalled();

    // An upload button should appear
    await waitFor(() => {
      expect(screen.getByText("Upload 1 file")).toBeTruthy();
    });
  });

  it("test_disabled_state", () => {
    render(
      <UploadButton<TestRouter, "imageUploader">
        endpoint="imageUploader"
        disabled={true}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it("test_custom_content_string", () => {
    render(
      <UploadButton<TestRouter, "imageUploader">
        endpoint="imageUploader"
        content={{ button: "Go" }}
      />,
    );

    expect(screen.getByText("Go")).toBeTruthy();
  });

  it("test_custom_content_function", () => {
    render(
      <UploadButton<TestRouter, "imageUploader">
        endpoint="imageUploader"
        content={{
          button: (opts) => (opts.ready ? "Ready to upload" : "Not ready"),
        }}
      />,
    );

    expect(screen.getByText("Ready to upload")).toBeTruthy();
  });

  it("test_progress_display", () => {
    hookReturnOverride = {
      isUploading: true,
      progress: 42,
    };

    render(
      <UploadButton<TestRouter, "imageUploader"> endpoint="imageUploader" />,
    );

    // Default text shows progress percentage
    expect(screen.getByText("Uploading... 42%")).toBeTruthy();
  });
});
