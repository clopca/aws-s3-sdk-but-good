import { describe, it, expect } from "vitest";
import {
  validateFileForRoute,
  validateFilesForRoute,
  routeConfigToAcceptString,
} from "../_internal/file-types";

describe("validateFileForRoute", () => {
  it("accepts a valid image file", () => {
    const result = validateFileForRoute(
      { name: "photo.jpg", size: 1_000_000, type: "image/jpeg" },
      { image: { maxFileSize: "4MB" } },
    );

    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects an invalid file type", () => {
    const result = validateFileForRoute(
      { name: "document.pdf", size: 1_000, type: "application/pdf" },
      { image: { maxFileSize: "4MB" } },
    );

    expect(result.isValid).toBe(false);
    expect(result.error?.code).toBe("INVALID_FILE_TYPE");
  });

  it("rejects a file that is too large", () => {
    const result = validateFileForRoute(
      { name: "large.jpg", size: 10_000_000, type: "image/jpeg" },
      { image: { maxFileSize: "4MB" } },
    );

    expect(result.isValid).toBe(false);
    expect(result.error?.code).toBe("FILE_TOO_LARGE");
  });

  it("accepts any file type with blob config", () => {
    const result = validateFileForRoute(
      { name: "data.bin", size: 100, type: "application/octet-stream" },
      { blob: { maxFileSize: "32MB" } },
    );

    expect(result.isValid).toBe(true);
  });

  it("accepts a file within size limit", () => {
    const result = validateFileForRoute(
      { name: "small.jpg", size: 1024, type: "image/jpeg" },
      { image: { maxFileSize: "4MB" } },
    );

    expect(result.isValid).toBe(true);
  });
});

describe("validateFilesForRoute", () => {
  it("rejects too many files", () => {
    const files = [
      { name: "a.jpg", size: 100, type: "image/jpeg" },
      { name: "b.jpg", size: 100, type: "image/jpeg" },
      { name: "c.jpg", size: 100, type: "image/jpeg" },
      { name: "d.jpg", size: 100, type: "image/jpeg" },
      { name: "e.jpg", size: 100, type: "image/jpeg" },
    ];

    const result = validateFilesForRoute(files, {
      image: { maxFileSize: "4MB", maxFileCount: 3 },
    });

    expect(result.isValid).toBe(false);
    expect(result.error?.code).toBe("TOO_MANY_FILES");
  });

  it("rejects too few files", () => {
    const result = validateFilesForRoute([], {
      image: { maxFileSize: "4MB", minFileCount: 1 },
    });

    expect(result.isValid).toBe(false);
    expect(result.error?.code).toBe("TOO_FEW_FILES");
  });

  it("accepts valid batch of files", () => {
    const files = [
      { name: "a.jpg", size: 100, type: "image/jpeg" },
      { name: "b.jpg", size: 200, type: "image/jpeg" },
    ];

    const result = validateFilesForRoute(files, {
      image: { maxFileSize: "4MB", maxFileCount: 5, minFileCount: 1 },
    });

    expect(result.isValid).toBe(true);
  });

  it("validates individual files in batch", () => {
    const files = [
      { name: "a.jpg", size: 100, type: "image/jpeg" },
      { name: "b.pdf", size: 100, type: "application/pdf" },
    ];

    const result = validateFilesForRoute(files, {
      image: { maxFileSize: "4MB", maxFileCount: 5 },
    });

    expect(result.isValid).toBe(false);
    expect(result.error?.code).toBe("INVALID_FILE_TYPE");
  });

  it("uses default maxFileCount of 1 per type entry", () => {
    const files = [
      { name: "a.jpg", size: 100, type: "image/jpeg" },
      { name: "b.jpg", size: 100, type: "image/jpeg" },
    ];

    // No maxFileCount specified → defaults to 1
    const result = validateFilesForRoute(files, {
      image: { maxFileSize: "4MB" },
    });

    expect(result.isValid).toBe(false);
    expect(result.error?.code).toBe("TOO_MANY_FILES");
  });
});

describe("routeConfigToAcceptString", () => {
  it("converts route config to accept string", () => {
    const result = routeConfigToAcceptString({ image: {}, pdf: {} });
    expect(result).toBe("image/*,application/pdf");
  });

  it("returns empty string for blob (accept all)", () => {
    const result = routeConfigToAcceptString({ blob: {} });
    expect(result).toBe("");
  });

  it("handles single type", () => {
    const result = routeConfigToAcceptString({ image: {} });
    expect(result).toBe("image/*");
  });

  it("handles multiple types", () => {
    const result = routeConfigToAcceptString({
      image: {},
      video: {},
      audio: {},
    });
    expect(result).toBe("image/*,video/*,audio/*");
  });
});
