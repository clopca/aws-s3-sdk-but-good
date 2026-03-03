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

    const result = UploadButton({ endpoint: "imageUploader" } as never);
    expect(result.type).toBe(mockUploadButton);
    expect(result.props).toMatchObject({
      endpoint: "imageUploader",
      __internal: { url: "/api/upload" },
    });
  });

  it("test_generateUploadButton_custom_url", () => {
    const UploadButton = generateUploadButton({ url: "/custom/upload" });

    const result = UploadButton({ endpoint: "imageUploader" } as never);
    expect(result.type).toBe(mockUploadButton);
    expect(result.props).toMatchObject({
      endpoint: "imageUploader",
      __internal: { url: "/custom/upload" },
    });
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

    const result = UploadDropzone({ endpoint: "imageUploader" } as never);
    expect(result.type).toBe(mockUploadDropzone);
    expect(result.props).toMatchObject({
      endpoint: "imageUploader",
      __internal: { url: "/api/upload" },
    });
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
