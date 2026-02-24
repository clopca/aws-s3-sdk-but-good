import { describe, it, expect } from "vitest";
import {
  resolveStyle,
  resolveClassName,
  renderContent,
} from "../components/shared";
import {
  defaultButtonClasses,
  uploadButtonVariants,
  defaultDropzoneClasses,
  uploadDropzoneVariants,
  progressBarFillVariants,
  fileListItemVariants,
  fileListStatusVariants,
} from "../styles";
import * as stylesModule from "../styles";

// ─── resolveStyle ───────────────────────────────────────────────────────────

describe("resolveStyle", () => {
  const defaultStyle = { color: "blue", fontSize: "14px" };
  const opts = { ready: true };

  it("test_resolveStyle_undefined", () => {
    const result = resolveStyle(undefined, opts, defaultStyle);
    expect(result).toEqual(defaultStyle);
  });

  it("test_resolveStyle_object_merges", () => {
    const result = resolveStyle({ color: "red" }, opts, defaultStyle);
    expect(result).toEqual({ color: "red", fontSize: "14px" });
  });

  it("test_resolveStyle_string_returns_undefined", () => {
    const result = resolveStyle("my-class", opts, defaultStyle);
    expect(result).toBeUndefined();
  });

  it("test_resolveStyle_function", () => {
    const styleFn = (o: { ready: boolean }) =>
      o.ready ? { color: "green" } : {};
    const result = resolveStyle(styleFn, opts, defaultStyle);
    expect(result).toEqual({ color: "green", fontSize: "14px" });
  });

  it("test_resolveStyle_function_returning_string", () => {
    const styleFn = () => "dynamic-class";
    const result = resolveStyle(styleFn, opts, defaultStyle);
    expect(result).toBeUndefined();
  });
});

// ─── resolveClassName ───────────────────────────────────────────────────────

describe("resolveClassName", () => {
  const opts = { ready: true };

  it("test_resolveClassName_string", () => {
    const result = resolveClassName("my-class", opts);
    expect(result).toBe("my-class");
  });

  it("test_resolveClassName_undefined", () => {
    const result = resolveClassName(undefined, opts);
    expect(result).toBeUndefined();
  });

  it("test_resolveClassName_object_returns_undefined", () => {
    const result = resolveClassName({ color: "red" }, opts);
    expect(result).toBeUndefined();
  });

  it("test_resolveClassName_function_returning_string", () => {
    const fn = (o: { ready: boolean }) => (o.ready ? "active" : "inactive");
    const result = resolveClassName(fn, opts);
    expect(result).toBe("active");
  });
});

// ─── uploadDropzoneVariants (cva) ───────────────────────────────────────────

describe("uploadDropzoneVariants", () => {
  it("test_dropzone_dragOver_variant", () => {
    const result = uploadDropzoneVariants({ state: "dragOver" });
    expect(result).toContain("border-primary");
    expect(result).toContain("bg-primary/10");
  });

  it("test_dropzone_disabled_variant", () => {
    const result = uploadDropzoneVariants({ state: "disabled" });
    expect(result).toContain("cursor-not-allowed");
    expect(result).toContain("opacity-60");
  });

  it("test_dropzone_uploading_variant", () => {
    const result = uploadDropzoneVariants({ state: "uploading" });
    expect(result).toContain("border-primary/60");
    expect(result).toContain("cursor-default");
  });

  it("test_dropzone_idle_variant_is_default", () => {
    const result = uploadDropzoneVariants();
    expect(result).toContain("border-border");
    expect(result).toContain("cursor-pointer");
  });
});

// ─── uploadButtonVariants (cva) ─────────────────────────────────────────────

describe("uploadButtonVariants", () => {
  it("test_button_idle_variant", () => {
    const result = uploadButtonVariants({ state: "idle" });
    expect(result).toContain("bg-primary");
    expect(result).toContain("cursor-pointer");
  });

  it("test_button_disabled_variant", () => {
    const result = uploadButtonVariants({ state: "disabled" });
    expect(result).toContain("bg-primary/60");
    expect(result).toContain("cursor-not-allowed");
  });

  it("test_button_uploading_variant", () => {
    const result = uploadButtonVariants({ state: "uploading" });
    expect(result).toContain("bg-primary");
    expect(result).toContain("cursor-default");
  });
});

// ─── Default Classes ────────────────────────────────────────────────────────

describe("defaultButtonClasses", () => {
  it("test_default_button_classes_exist", () => {
    expect(defaultButtonClasses).toHaveProperty("container");
    expect(defaultButtonClasses).toHaveProperty("allowedContent");
    expect(defaultButtonClasses).toHaveProperty("uploadButton");
  });
});

describe("defaultDropzoneClasses", () => {
  it("test_default_dropzone_classes_exist", () => {
    expect(defaultDropzoneClasses).toHaveProperty("uploadIcon");
    expect(defaultDropzoneClasses).toHaveProperty("label");
    expect(defaultDropzoneClasses).toHaveProperty("allowedContent");
    expect(defaultDropzoneClasses).toHaveProperty("button");
    expect(defaultDropzoneClasses).toHaveProperty("progressBar");
    expect(defaultDropzoneClasses).toHaveProperty("progressFill");
    expect(defaultDropzoneClasses).toHaveProperty("previewContainer");
    expect(defaultDropzoneClasses).toHaveProperty("previewImage");
    expect(defaultDropzoneClasses).toHaveProperty("fileList");
  });
});

// ─── renderContent ──────────────────────────────────────────────────────────

describe("renderContent", () => {
  it("returns default when content is undefined", () => {
    const result = renderContent(undefined, {}, "default text");
    expect(result).toBe("default text");
  });

  it("returns static content when provided", () => {
    const result = renderContent("custom text", {}, "default text");
    expect(result).toBe("custom text");
  });

  it("calls function content with opts", () => {
    const fn = (opts: { ready: boolean }) =>
      opts.ready ? "ready!" : "not ready";
    const result = renderContent(fn, { ready: true }, "default");
    expect(result).toBe("ready!");
  });
});

// ─── Task 04: Dead Code Removal ─────────────────────────────────────────────

describe("dead CSS-in-JS exports removed", () => {
  it("test dead CSS-in-JS exports removed", () => {
    // These old CSS-in-JS style objects should no longer be exported from styles.ts
    const exports = stylesModule as Record<string, unknown>;
    expect(exports).not.toHaveProperty("defaultButtonStyles");
    expect(exports).not.toHaveProperty("defaultDropzoneStyles");
    expect(exports).not.toHaveProperty("defaultProgressBarStyles");
    expect(exports).not.toHaveProperty("defaultFilePreviewStyles");
    expect(exports).not.toHaveProperty("defaultFileListStyles");
    // Old inline style objects should be gone
    expect(exports).not.toHaveProperty("buttonStyles");
    expect(exports).not.toHaveProperty("dropzoneStyles");
  });

  it("test active class exports preserved", () => {
    // All Tailwind class objects and cva variants should still be exported
    expect(stylesModule).toHaveProperty("defaultButtonClasses");
    expect(stylesModule).toHaveProperty("uploadButtonVariants");
    expect(stylesModule).toHaveProperty("defaultDropzoneClasses");
    expect(stylesModule).toHaveProperty("uploadDropzoneVariants");
    expect(stylesModule).toHaveProperty("defaultProgressBarClasses");
    expect(stylesModule).toHaveProperty("progressBarFillVariants");
    expect(stylesModule).toHaveProperty("defaultFilePreviewClasses");
    expect(stylesModule).toHaveProperty("defaultFileListClasses");
    expect(stylesModule).toHaveProperty("fileListItemVariants");
    expect(stylesModule).toHaveProperty("fileListStatusVariants");
  });
});

// ─── Task 04: cva variants produce correct classes ──────────────────────────

describe("cva variants produce correct classes", () => {
  it("test progressBarFillVariants active state", () => {
    const result = progressBarFillVariants({ state: "active" });
    expect(result).toContain("bg-primary");
  });

  it("test progressBarFillVariants complete state", () => {
    const result = progressBarFillVariants({ state: "complete" });
    expect(result).toContain("bg-emerald-500");
  });

  it("test fileListItemVariants default status", () => {
    const result = fileListItemVariants({ status: "default" });
    expect(result).toContain("border-border");
    expect(result).toContain("bg-card");
  });

  it("test fileListItemVariants error status", () => {
    const result = fileListItemVariants({ status: "error" });
    expect(result).toContain("border-destructive/30");
    expect(result).toContain("bg-destructive/10");
  });

  it("test fileListItemVariants complete status", () => {
    const result = fileListItemVariants({ status: "complete" });
    expect(result).toContain("border-emerald-500/30");
    expect(result).toContain("bg-emerald-500/10");
  });

  it("test fileListStatusVariants pending", () => {
    const result = fileListStatusVariants({ status: "pending" });
    expect(result).toContain("text-muted-foreground");
  });

  it("test fileListStatusVariants uploading", () => {
    const result = fileListStatusVariants({ status: "uploading" });
    expect(result).toContain("text-primary");
  });

  it("test fileListStatusVariants complete", () => {
    const result = fileListStatusVariants({ status: "complete" });
    expect(result).toContain("text-emerald-500");
  });

  it("test fileListStatusVariants error", () => {
    const result = fileListStatusVariants({ status: "error" });
    expect(result).toContain("text-destructive");
  });
});
