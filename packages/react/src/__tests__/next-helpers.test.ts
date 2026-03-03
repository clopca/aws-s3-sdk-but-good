import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock components and generateReactHelpers ───────────────────────────────

// vi.mock calls are hoisted above all imports, so we use vi.hoisted to
// create the mock functions that the factories reference.
const { mockUploadButton, mockUploadDropzone, mockGenerateReactHelpers } =
  vi.hoisted(() => ({
    mockUploadButton: vi.fn((_props: unknown) => "UploadButton"),
    mockUploadDropzone: vi.fn((_props: unknown) => "UploadDropzone"),
    mockGenerateReactHelpers: vi.fn((_opts?: { url?: string }) => ({
      useUpload: vi.fn(),
      uploadFiles: vi.fn(),
      createUpload: vi.fn(),
    })),
  }));

vi.mock("../components/button", () => ({
  UploadButton: mockUploadButton,
}));

vi.mock("../components/dropzone", () => ({
  UploadDropzone: mockUploadDropzone,
}));

vi.mock("../index", () => ({
  generateReactHelpers: mockGenerateReactHelpers,
}));

import {
  generateUploadButton,
  generateUploadDropzone,
  generateNextHelpers,
} from "../next";

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("generateUploadButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("test_generateUploadButton_returns_component", () => {
    // Arrange & Act
    const UploadButton = generateUploadButton();

    // Assert — factory returns a function (component)
    expect(typeof UploadButton).toBe("function");

    // Verify it calls through to the react package when invoked
    UploadButton({ endpoint: "imageUploader" } as never);
    expect(mockUploadButton).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "imageUploader",
        __internal: { url: "/api/upload" },
      }),
    );
  });

  it("test_generateUploadButton_custom_url", () => {
    const UploadButton = generateUploadButton({ url: "/custom/upload" });

    UploadButton({ endpoint: "imageUploader" } as never);
    expect(mockUploadButton).toHaveBeenCalledWith(
      expect.objectContaining({
        __internal: { url: "/custom/upload" },
      }),
    );
  });
});

describe("generateUploadDropzone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("test_generateUploadDropzone_returns_component", () => {
    // Arrange & Act
    const UploadDropzone = generateUploadDropzone();

    // Assert — factory returns a function (component)
    expect(typeof UploadDropzone).toBe("function");

    // Verify it calls through to the react package when invoked
    UploadDropzone({ endpoint: "imageUploader" } as never);
    expect(mockUploadDropzone).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "imageUploader",
        __internal: { url: "/api/upload" },
      }),
    );
  });
});

describe("generateNextHelpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("test_generateNextHelpers_returns_all", () => {
    // Arrange & Act
    const helpers = generateNextHelpers();

    // Assert
    expect(mockGenerateReactHelpers).toHaveBeenCalledWith({
      url: "/api/upload",
    });
    expect(helpers).toHaveProperty("useUpload");
    expect(helpers).toHaveProperty("uploadFiles");
    expect(helpers).toHaveProperty("createUpload");
  });

  it("test_generateNextHelpers_custom_url", () => {
    generateNextHelpers({ url: "/custom/upload" });

    expect(mockGenerateReactHelpers).toHaveBeenCalledWith({
      url: "/custom/upload",
    });
  });
});
