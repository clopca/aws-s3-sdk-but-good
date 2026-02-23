import { describe, it, expect } from "vitest";
import { parseFileSize, formatFileSize } from "../utils";

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
