import { describe, it, expect } from "vitest";
import { parseFileSize, formatFileSize, computeSHA256 } from "../utils";

describe("parseFileSize", () => {
  it("parses MB correctly", () => {
    expect(parseFileSize("4MB")).toBe(4_194_304);
  });

  it("parses KB correctly", () => {
    expect(parseFileSize("500KB")).toBe(512_000);
  });

  it("parses GB correctly", () => {
    expect(parseFileSize("1GB")).toBe(1_073_741_824);
  });

  it("parses B correctly", () => {
    expect(parseFileSize("100B")).toBe(100);
  });

  it("parses TB correctly", () => {
    expect(parseFileSize("1TB")).toBe(1_099_511_627_776);
  });

  it("throws on invalid format", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => parseFileSize("invalid" as any)).toThrow();
  });
});

describe("formatFileSize", () => {
  it("formats MB correctly", () => {
    expect(formatFileSize(4_194_304)).toBe("4 MB");
  });

  it("formats KB correctly", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
  });

  it("formats bytes correctly", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats zero bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });

  it("formats GB correctly", () => {
    expect(formatFileSize(1_073_741_824)).toBe("1 GB");
  });
});

describe("computeSHA256", () => {
  it("computes correct base64-encoded SHA-256 for known input", async () => {
    // SHA-256 of "hello" is well-known
    const encoder = new TextEncoder();
    const data = encoder.encode("hello").buffer as ArrayBuffer;
    const result = await computeSHA256(data);
    // SHA-256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    // Base64 of that hash = LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=
    expect(result).toBe("LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=");
  });

  it("computes correct SHA-256 for empty input", async () => {
    const data = new ArrayBuffer(0);
    const result = await computeSHA256(data);
    // SHA-256("") = 47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=
    expect(result).toBe("47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=");
  });

  it("returns a base64 string (not hex)", async () => {
    const encoder = new TextEncoder();
    const data = encoder.encode("test data").buffer as ArrayBuffer;
    const result = await computeSHA256(data);
    // Base64 strings contain only [A-Za-z0-9+/=]
    expect(result).toMatch(/^[A-Za-z0-9+/=]+$/);
    // Should NOT be hex (which would be longer and only [0-9a-f])
    expect(result.length).toBeLessThan(65); // hex SHA-256 is 64 chars
  });
});
