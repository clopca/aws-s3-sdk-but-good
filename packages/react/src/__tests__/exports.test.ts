import { describe, it, expect, vi } from "vitest";

// ─── Mock genUploader (required by generateReactHelpers) ────────────────────

vi.mock("@s3-good/core/client", () => ({
  genUploader: (opts?: { url?: string }) => ({
    uploadFiles: vi.fn(),
    createUpload: vi.fn(),
    _url: opts?.url ?? "/api/upload",
  }),
}));

vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({ ok: false }),
);
vi.stubGlobal("requestAnimationFrame", (cb: () => void) => {
  cb();
  return 0;
});
vi.stubGlobal("cancelAnimationFrame", vi.fn());

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Phase 2 Exports", () => {
  it("test_exports_new_components", async () => {
    const exports = await import("../index");

    // All three new components SHALL be available
    expect(exports).toHaveProperty("FilePreview");
    expect(typeof exports.FilePreview).toBe("function");

    expect(exports).toHaveProperty("ProgressBar");
    expect(typeof exports.ProgressBar).toBe("function");

    expect(exports).toHaveProperty("FileList");
    expect(typeof exports.FileList).toBe("function");
  });

  it("test_exports_new_types", async () => {
    // Type exports are erased at runtime, so we verify the module
    // exports the related runtime values that accompany the types.
    // The actual type-level verification is done by the TypeScript
    // compiler (typecheck). Here we confirm the module shape is correct.
    const exports = await import("../index");

    // Components that carry the associated type exports
    expect(exports).toHaveProperty("FilePreview");
    expect(exports).toHaveProperty("ProgressBar");
    expect(exports).toHaveProperty("FileList");

    // Verify the module has the generateReactHelpers factory
    // (which uses the FileRouter / inferEndpoints types)
    expect(exports).toHaveProperty("generateReactHelpers");
    expect(typeof exports.generateReactHelpers).toBe("function");
  });

  it("test_exports_new_styles", async () => {
    const exports = await import("../index");

    // All new style objects SHALL be available
    expect(exports).toHaveProperty("defaultFilePreviewStyles");
    expect(typeof exports.defaultFilePreviewStyles).toBe("object");
    expect(exports.defaultFilePreviewStyles).toHaveProperty("container");
    expect(exports.defaultFilePreviewStyles).toHaveProperty("thumbnail");
    expect(exports.defaultFilePreviewStyles).toHaveProperty("icon");
    expect(exports.defaultFilePreviewStyles).toHaveProperty("fileInfo");
    expect(exports.defaultFilePreviewStyles).toHaveProperty("fileName");
    expect(exports.defaultFilePreviewStyles).toHaveProperty("fileSize");

    expect(exports).toHaveProperty("defaultProgressBarStyles");
    expect(typeof exports.defaultProgressBarStyles).toBe("object");
    expect(exports.defaultProgressBarStyles).toHaveProperty("container");
    expect(exports.defaultProgressBarStyles).toHaveProperty("track");
    expect(exports.defaultProgressBarStyles).toHaveProperty("fill");
    expect(exports.defaultProgressBarStyles).toHaveProperty("fillComplete");
    expect(exports.defaultProgressBarStyles).toHaveProperty("label");

    expect(exports).toHaveProperty("defaultFileListStyles");
    expect(typeof exports.defaultFileListStyles).toBe("object");
    expect(exports.defaultFileListStyles).toHaveProperty("container");
    expect(exports.defaultFileListStyles).toHaveProperty("item");
    expect(exports.defaultFileListStyles).toHaveProperty("itemError");
    expect(exports.defaultFileListStyles).toHaveProperty("itemComplete");
    expect(exports.defaultFileListStyles).toHaveProperty("removeButton");
  });
});
