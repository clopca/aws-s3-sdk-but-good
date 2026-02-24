import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";

// ─── Mock useUpload ─────────────────────────────────────────────────────────

vi.mock("../use-upload", () => ({
  useUpload: () => ({
    startUpload: vi.fn(),
    isUploading: false,
    progress: 0,
    abort: vi.fn(),
    permittedFileInfo: {
      slug: "imageUploader",
      config: { image: { maxFileSize: "4MB", maxFileCount: 5 } },
      fileTypes: ["image"],
      maxFileSize: "4MB",
      maxFileCount: 5,
    },
  }),
}));

import { UploadButton } from "../components/button";
import { UploadDropzone } from "../components/dropzone";
import { FilePreview } from "../components/file-preview";
import { ProgressBar } from "../components/progress-bar";
import { FileList } from "../components/file-list";

// ─── Test Router Type ───────────────────────────────────────────────────────

type TestRouter = {
  imageUploader: {
    _def: any;
    _input: undefined;
    _metadata: { userId: string };
    _output: { url: string };
  };
};

// ─── forwardRef Tests ───────────────────────────────────────────────────────

describe("forwardRef", () => {
  afterEach(() => {
    cleanup();
  });

  it("test UploadButton forwards ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <UploadButton<TestRouter, "imageUploader">
        endpoint="imageUploader"
        ref={ref}
      />,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("test UploadDropzone forwards ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <UploadDropzone<TestRouter, "imageUploader">
        endpoint="imageUploader"
        ref={ref}
      />,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("test FilePreview forwards ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<FilePreview file="https://example.com/test.pdf" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("test ProgressBar forwards ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ProgressBar progress={50} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("test FileList forwards ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <FileList
        files={[
          {
            id: "1",
            name: "test.txt",
            size: 1024,
            type: "text/plain",
            progress: 0,
            status: "pending",
          },
        ]}
        ref={ref}
      />,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

// ─── displayName Tests ──────────────────────────────────────────────────────

describe("components have displayName", () => {
  it("test components have displayName", () => {
    expect((UploadButton as React.FC).displayName).toBe("UploadButton");
    expect((UploadDropzone as React.FC).displayName).toBe("UploadDropzone");
    expect(FilePreview.displayName).toBe("FilePreview");
    expect(ProgressBar.displayName).toBe("ProgressBar");
    expect(FileList.displayName).toBe("FileList");
  });
});
