import { describe, it, expect, vi } from "vitest";

// ─── Mock genUploader (required by generateReactHelpers) ────────────────────

vi.mock("@s3-good/core/client", () => ({
  genUploader: (opts?: { url?: string }) => ({
    uploadFiles: vi.fn(),
    createUpload: vi.fn(),
    _url: opts?.url ?? "/api/upload",
  }),
}));

vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
vi.stubGlobal("requestAnimationFrame", (cb: () => void) => {
  cb();
  return 0;
});
vi.stubGlobal("cancelAnimationFrame", vi.fn());

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Phase 2 Exports", () => {
  it("test_exports_new_components", async () => {
    const exports = await import("../index");

    // All three new components SHALL be available (forwardRef components are objects)
    expect(exports).toHaveProperty("FilePreview");
    expect(exports.FilePreview).toBeDefined();
    expect((exports.FilePreview as { displayName?: string }).displayName).toBe(
      "FilePreview",
    );

    expect(exports).toHaveProperty("ProgressBar");
    expect(exports.ProgressBar).toBeDefined();
    expect((exports.ProgressBar as { displayName?: string }).displayName).toBe(
      "ProgressBar",
    );

    expect(exports).toHaveProperty("FileList");
    expect(exports.FileList).toBeDefined();
    expect((exports.FileList as { displayName?: string }).displayName).toBe(
      "FileList",
    );
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

  it("test_exports_new_classes", async () => {
    const exports = await import("../index");

    // All new class objects SHALL be available
    expect(exports).toHaveProperty("defaultFilePreviewClasses");
    expect(typeof exports.defaultFilePreviewClasses).toBe("object");
    expect(exports.defaultFilePreviewClasses).toHaveProperty("container");
    expect(exports.defaultFilePreviewClasses).toHaveProperty("thumbnail");
    expect(exports.defaultFilePreviewClasses).toHaveProperty("icon");
    expect(exports.defaultFilePreviewClasses).toHaveProperty("fileInfo");
    expect(exports.defaultFilePreviewClasses).toHaveProperty("fileName");
    expect(exports.defaultFilePreviewClasses).toHaveProperty("fileSize");

    // ProgressBar: fill/fillComplete moved to progressBarFillVariants (cva)
    expect(exports).toHaveProperty("defaultProgressBarClasses");
    expect(typeof exports.defaultProgressBarClasses).toBe("object");
    expect(exports.defaultProgressBarClasses).toHaveProperty("container");
    expect(exports.defaultProgressBarClasses).toHaveProperty("track");
    expect(exports.defaultProgressBarClasses).toHaveProperty("label");
    expect(exports).toHaveProperty("progressBarFillVariants");
    expect(typeof exports.progressBarFillVariants).toBe("function");

    // FileList: item/itemError/itemComplete moved to fileListItemVariants (cva)
    expect(exports).toHaveProperty("defaultFileListClasses");
    expect(typeof exports.defaultFileListClasses).toBe("object");
    expect(exports.defaultFileListClasses).toHaveProperty("container");
    expect(exports.defaultFileListClasses).toHaveProperty("removeButton");
    expect(exports).toHaveProperty("fileListItemVariants");
    expect(typeof exports.fileListItemVariants).toBe("function");
    expect(exports).toHaveProperty("fileListStatusVariants");
    expect(typeof exports.fileListStatusVariants).toBe("function");

    // Button & Dropzone cva variants
    expect(exports).toHaveProperty("uploadButtonVariants");
    expect(typeof exports.uploadButtonVariants).toBe("function");
    expect(exports).toHaveProperty("uploadDropzoneVariants");
    expect(typeof exports.uploadDropzoneVariants).toBe("function");

    // cn utility
    expect(exports).toHaveProperty("cn");
    expect(typeof exports.cn).toBe("function");
  });
});
