import { describe, expect, it } from "vitest";
import { getCodeLanguage, getPreviewType } from "../types";

describe("getPreviewType", () => {
  it("test_getPreviewType_image", () => {
    expect(getPreviewType("image/png", "photo.png")).toBe("image");
  });

  it("test_getPreviewType_video", () => {
    expect(getPreviewType("video/mp4", "clip.mp4")).toBe("video");
  });

  it("test_getPreviewType_audio", () => {
    expect(getPreviewType("audio/mpeg", "song.mp3")).toBe("audio");
  });

  it("test_getPreviewType_pdf", () => {
    expect(getPreviewType("application/pdf", "doc.pdf")).toBe("pdf");
  });

  it("test_getPreviewType_json", () => {
    expect(getPreviewType("application/json", "data.json")).toBe("json");
  });

  it("test_getPreviewType_csv", () => {
    expect(getPreviewType("text/csv", "data.csv")).toBe("csv");
  });

  it("test_getPreviewType_code_typescript", () => {
    expect(getPreviewType("text/plain", "app.ts")).toBe("code");
  });

  it("test_getPreviewType_code_python", () => {
    expect(getPreviewType("text/plain", "script.py")).toBe("code");
  });

  it("test_getPreviewType_text_fallback", () => {
    expect(getPreviewType("text/plain", "readme.txt")).toBe("text");
  });

  it("test_getPreviewType_unknown", () => {
    expect(getPreviewType("application/octet-stream", "file.bin")).toBe("unknown");
  });

  it("test_getPreviewType_fallback_to_extension_for_image", () => {
    expect(getPreviewType("application/octet-stream", "photo.png")).toBe("image");
  });

  it("test_getPreviewType_handles_mime_parameters", () => {
    expect(getPreviewType("application/json; charset=utf-8", "data.txt")).toBe("json");
  });
});

describe("getCodeLanguage", () => {
  it("test_getCodeLanguage_typescript", () => {
    expect(getCodeLanguage("app.ts")).toBe("typescript");
  });

  it("test_getCodeLanguage_python", () => {
    expect(getCodeLanguage("script.py")).toBe("python");
  });

  it("test_getCodeLanguage_unknown_ext", () => {
    expect(getCodeLanguage("file.xyz")).toBe("plaintext");
  });
});
