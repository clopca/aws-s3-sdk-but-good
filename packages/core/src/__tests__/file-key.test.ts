import { describe, it, expect } from "vitest";
import {
  generateFileKey,
  generateFileKeys,
  isValidFileKey,
} from "../_internal/file-key";

describe("File Key Generation", () => {
  it("test_generateFileKey_preserves_extension", () => {
    const key = generateFileKey("photo.jpg");
    expect(key).toMatch(/\.jpg$/);
  });

  it("test_generateFileKey_no_extension", () => {
    const key = generateFileKey("README");
    expect(key).not.toContain(".");
  });

  it("test_generateFileKey_unique", () => {
    const key1 = generateFileKey("photo.jpg");
    const key2 = generateFileKey("photo.jpg");
    expect(key1).not.toBe(key2);
  });

  it("test_generateFileKey_url_safe", () => {
    const key = generateFileKey("photo.jpg");
    // The ID part (before the extension) should be URL-safe
    const idPart = key.replace(/\.[^.]+$/, "");
    expect(idPart).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it("test_generateFileKey_min_length", () => {
    const key = generateFileKey("photo.jpg");
    // The ID part (before the extension) should be at least 12 chars
    const idPart = key.replace(/\.[^.]+$/, "");
    expect(idPart.length).toBeGreaterThanOrEqual(12);
  });

  it("test_generateFileKeys_batch", () => {
    const files = [{ name: "a.png" }, { name: "b.pdf" }, { name: "c.txt" }];
    const results = generateFileKeys(files);

    expect(results).toHaveLength(3);
    results.forEach((result, i) => {
      expect(result.name).toBe(files[i]!.name);
      expect(typeof result.key).toBe("string");
      expect(result.key.length).toBeGreaterThan(0);
    });

    // All keys should be unique
    const keys = new Set(results.map((r) => r.key));
    expect(keys.size).toBe(3);
  });
});

describe("File Key Validation", () => {
  it("test_isValidFileKey_valid", () => {
    const key = generateFileKey("photo.jpg");
    expect(isValidFileKey(key)).toBe(true);
  });

  it("test_isValidFileKey_invalid", () => {
    expect(isValidFileKey("a")).toBe(false);
    expect(isValidFileKey("")).toBe(false);
    expect(isValidFileKey("short")).toBe(false);
  });
});
