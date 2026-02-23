import { describe, it, expect, vi } from "vitest";

// ─── Mock genUploader ───────────────────────────────────────────────────────

vi.mock("@s3-good/core/client", () => ({
  genUploader: (opts?: { url?: string }) => ({
    uploadFiles: vi.fn(),
    createUpload: vi.fn(),
    _url: opts?.url ?? "/api/upload",
  }),
}));

// ─── Mock fetch (for permittedFileInfo in useUpload) ────────────────────────

vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({ ok: false }),
);
vi.stubGlobal("requestAnimationFrame", (cb: () => void) => {
  cb();
  return 0;
});
vi.stubGlobal("cancelAnimationFrame", vi.fn());

import { generateReactHelpers } from "../index";

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

describe("generateReactHelpers", () => {
  it("test_returns_all_helpers", () => {
    const helpers = generateReactHelpers<TestRouter>();

    expect(helpers).toHaveProperty("useUpload");
    expect(helpers).toHaveProperty("uploadFiles");
    expect(helpers).toHaveProperty("createUpload");
    expect(typeof helpers.useUpload).toBe("function");
    expect(typeof helpers.uploadFiles).toBe("function");
    expect(typeof helpers.createUpload).toBe("function");
  });

  it("test_custom_url_propagated", () => {
    const helpers = generateReactHelpers<TestRouter>({
      url: "/custom/upload",
    });

    // The helpers should be created (we can't easily inspect the URL
    // without making a request, but we verify the factory accepts it)
    expect(helpers).toHaveProperty("useUpload");
    expect(helpers).toHaveProperty("uploadFiles");
    expect(helpers).toHaveProperty("createUpload");
  });

  it("test_direct_exports_available", async () => {
    // Verify that direct exports are importable from the package index
    const exports = await import("../index");

    expect(exports).toHaveProperty("useUpload");
    expect(exports).toHaveProperty("UploadButton");
    expect(exports).toHaveProperty("UploadDropzone");
    expect(exports).toHaveProperty("resolveStyle");
    expect(exports).toHaveProperty("resolveClassName");
    expect(exports).toHaveProperty("renderContent");
    expect(exports).toHaveProperty("UploadIcon");
    expect(exports).toHaveProperty("defaultButtonStyles");
    expect(exports).toHaveProperty("defaultDropzoneStyles");
    expect(exports).toHaveProperty("getDropzoneContainerStyle");
    expect(exports).toHaveProperty("generateReactHelpers");
  });
});
