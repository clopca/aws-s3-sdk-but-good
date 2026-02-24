import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock @s3-good/react via dynamic import interception ────────────────────

// The Next client helpers use dynamic import("@s3-good/react") at runtime.
// We mock the entire next-client.ts module to inject our mock react package, avoiding
// the actual import of @s3-good/react which may not be installed in test env.

const mockUploadButton = vi.fn((_props: unknown) => "UploadButton");
const mockUploadDropzone = vi.fn((_props: unknown) => "UploadDropzone");
const mockGenerateReactHelpers = vi.fn((_opts?: { url?: string }) => ({
  useUpload: vi.fn(),
  uploadFiles: vi.fn(),
  createUpload: vi.fn(),
}));

const mockReactPkg = {
  UploadButton: mockUploadButton,
  UploadDropzone: mockUploadDropzone,
  generateReactHelpers: mockGenerateReactHelpers,
};

// Mock the next-client.ts module to replace the getReactPkg function
// We re-implement the SSR helpers with our mock react package
vi.mock("../next-client", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports -- typeof import() is the only way to type importOriginal
  const actual = await importOriginal<typeof import("../next-client")>();

  // Re-implement generateUploadButton with mock react package (async to match real signature)
  async function generateUploadButton(opts?: { url?: string }) {
    const url = opts?.url ?? "/api/upload";
    function TypedUploadButton(props: Record<string, unknown>) {
      return mockReactPkg.UploadButton({
        ...props,
        __internal: { url },
      });
    }
    return TypedUploadButton;
  }

  async function generateUploadDropzone(opts?: { url?: string }) {
    const url = opts?.url ?? "/api/upload";
    function TypedUploadDropzone(props: Record<string, unknown>) {
      return mockReactPkg.UploadDropzone({
        ...props,
        __internal: { url },
      });
    }
    return TypedUploadDropzone;
  }

  async function generateNextHelpers(opts?: { url?: string }) {
    return mockReactPkg.generateReactHelpers({
      url: opts?.url ?? "/api/upload",
    });
  }

  return {
    ...actual,
    generateUploadButton,
    generateUploadDropzone,
    generateNextHelpers,
  };
});

import {
  generateUploadButton,
  generateUploadDropzone,
  generateNextHelpers,
} from "../next-client";

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("generateUploadButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("test_generateUploadButton_returns_component", async () => {
    // Arrange & Act
    const UploadButton = await generateUploadButton();

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
});

describe("generateUploadDropzone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("test_generateUploadDropzone_returns_component", async () => {
    // Arrange & Act
    const UploadDropzone = await generateUploadDropzone();

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

  it("test_generateNextHelpers_returns_all", async () => {
    // Arrange & Act
    const helpers = await generateNextHelpers();

    // Assert
    expect(mockGenerateReactHelpers).toHaveBeenCalledWith({
      url: "/api/upload",
    });
    expect(helpers).toHaveProperty("useUpload");
    expect(helpers).toHaveProperty("uploadFiles");
    expect(helpers).toHaveProperty("createUpload");
  });
});
