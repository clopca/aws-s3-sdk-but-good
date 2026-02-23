import { describe, it, expect } from "vitest";
import {
  resolveStyle,
  resolveClassName,
  renderContent,
} from "../components/shared";
import {
  defaultButtonStyles,
  defaultDropzoneStyles,
  getDropzoneContainerStyle,
} from "../styles";

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

// ─── getDropzoneContainerStyle ──────────────────────────────────────────────

describe("getDropzoneContainerStyle", () => {
  it("test_dropzone_dragover_style", () => {
    const result = getDropzoneContainerStyle({
      ready: true,
      isDragOver: true,
      isUploading: false,
    });
    // Should include the dragOver overlay (blue border)
    expect(result).toMatchObject({
      borderColor: defaultDropzoneStyles.containerDragOver.borderColor,
      backgroundColor:
        defaultDropzoneStyles.containerDragOver.backgroundColor,
    });
  });

  it("test_dropzone_disabled_style", () => {
    const result = getDropzoneContainerStyle({
      ready: false,
      isDragOver: false,
      isUploading: false,
    });
    expect(result).toEqual(defaultDropzoneStyles.containerDisabled);
  });

  it("test_dropzone_uploading_style", () => {
    const result = getDropzoneContainerStyle({
      ready: true,
      isDragOver: false,
      isUploading: true,
    });
    expect(result).toMatchObject({
      borderColor: defaultDropzoneStyles.containerUploading.borderColor,
    });
  });
});

// ─── Default Styles ─────────────────────────────────────────────────────────

describe("defaultButtonStyles", () => {
  it("test_default_button_styles_exist", () => {
    expect(defaultButtonStyles).toHaveProperty("container");
    expect(defaultButtonStyles).toHaveProperty("button");
    expect(defaultButtonStyles).toHaveProperty("buttonDisabled");
    expect(defaultButtonStyles).toHaveProperty("buttonUploading");
    expect(defaultButtonStyles).toHaveProperty("allowedContent");
    expect(defaultButtonStyles).toHaveProperty("uploadButton");
  });
});

describe("defaultDropzoneStyles", () => {
  it("test_default_dropzone_styles_exist", () => {
    expect(defaultDropzoneStyles).toHaveProperty("container");
    expect(defaultDropzoneStyles).toHaveProperty("containerDragOver");
    expect(defaultDropzoneStyles).toHaveProperty("containerUploading");
    expect(defaultDropzoneStyles).toHaveProperty("containerDisabled");
    expect(defaultDropzoneStyles).toHaveProperty("uploadIcon");
    expect(defaultDropzoneStyles).toHaveProperty("label");
    expect(defaultDropzoneStyles).toHaveProperty("allowedContent");
    expect(defaultDropzoneStyles).toHaveProperty("button");
    expect(defaultDropzoneStyles).toHaveProperty("progressBar");
    expect(defaultDropzoneStyles).toHaveProperty("progressFill");
    expect(defaultDropzoneStyles).toHaveProperty("previewContainer");
    expect(defaultDropzoneStyles).toHaveProperty("previewImage");
    expect(defaultDropzoneStyles).toHaveProperty("fileList");
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
