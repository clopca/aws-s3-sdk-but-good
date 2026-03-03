import { describe, expect, it, vi } from "vitest";

vi.mock("@s3-good-internal/shared", () => ({
  getPreviewType: vi.fn(),
  getCodeLanguage: vi.fn(),
}));

describe("browser package exports", () => {
  it("test_exports_getPreviewType", async () => {
    const mod = await import("../index");
    expect(mod).toHaveProperty("getPreviewType");
    expect(typeof mod.getPreviewType).toBe("function");
  });

  it("test_exports_getCodeLanguage", async () => {
    const mod = await import("../index");
    expect(mod).toHaveProperty("getCodeLanguage");
    expect(typeof mod.getCodeLanguage).toBe("function");
  });
});
