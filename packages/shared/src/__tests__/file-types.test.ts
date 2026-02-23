import { describe, it, expect } from "vitest";
import { matchesFileType, getAcceptedMimeTypes, getFileExtension } from "../file-types";

describe("matchesFileType", () => {
  it("matches image MIME types against image category", () => {
    expect(matchesFileType("image/jpeg", ["image"])).toBe(true);
  });

  it("matches PDF MIME type against pdf category", () => {
    expect(matchesFileType("application/pdf", ["pdf"])).toBe(true);
  });

  it("matches any MIME type against blob (catch-all)", () => {
    expect(matchesFileType("application/octet-stream", ["blob"])).toBe(true);
  });

  it("rejects wrong file type", () => {
    expect(matchesFileType("image/jpeg", ["pdf"])).toBe(false);
  });

  it("matches video MIME types against video category", () => {
    expect(matchesFileType("video/mp4", ["video"])).toBe(true);
  });

  it("matches audio MIME types against audio category", () => {
    expect(matchesFileType("audio/mpeg", ["audio"])).toBe(true);
  });
});

describe("getAcceptedMimeTypes", () => {
  it("returns MIME patterns for given types", () => {
    const result = getAcceptedMimeTypes(["image", "pdf"]);
    expect(result).toEqual(["image/*", "application/pdf"]);
  });

  it("returns catch-all for blob", () => {
    const result = getAcceptedMimeTypes(["blob"]);
    expect(result).toEqual(["*/*"]);
  });
});

describe("getFileExtension", () => {
  it("extracts extension from filename", () => {
    expect(getFileExtension("photo.jpg")).toBe("jpg");
  });

  it("returns empty string when no extension", () => {
    expect(getFileExtension("README")).toBe("");
  });

  it("extracts last extension from multi-dot filename", () => {
    expect(getFileExtension("archive.tar.gz")).toBe("gz");
  });

  it("lowercases the extension", () => {
    expect(getFileExtension("photo.JPG")).toBe("jpg");
  });
});
