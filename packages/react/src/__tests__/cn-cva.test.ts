import { describe, it, expect } from "vitest";
import { cn } from "../components/shared";
import * as sharedModule from "../components/shared";
import { uploadButtonVariants, uploadDropzoneVariants } from "../styles";

// ─── cn() utility tests ─────────────────────────────────────────────────────

describe("cn utility", () => {
  it("test cn merges conflicting tailwind classes", () => {
    // tailwind-merge should resolve px-2 vs px-4 to px-4
    const result = cn("px-2", "px-4");
    expect(result).toBe("px-4");
  });

  it("test cn handles conditional classes", () => {
    // clsx conditional: false values should be excluded
    const result = cn("base", false && "hidden");
    expect(result).toBe("base");
  });

  it("test cn merges multiple conflicting classes", () => {
    const result = cn("text-red-500 bg-blue-500", "text-green-500");
    expect(result).toContain("text-green-500");
    expect(result).not.toContain("text-red-500");
    expect(result).toContain("bg-blue-500");
  });

  it("test cn returns undefined for empty input", () => {
    const result = cn("");
    expect(result).toBeUndefined();
  });

  it("test cn handles null and undefined values", () => {
    const result = cn("base", null, undefined, "extra");
    expect(result).toBe("base extra");
  });
});

// ─── cx() removal test ──────────────────────────────────────────────────────

describe("cx function removed", () => {
  it("test cx function removed", () => {
    // cx should no longer be exported from shared.ts (replaced by cn)
    const exports = sharedModule as Record<string, unknown>;
    expect(exports).not.toHaveProperty("cx");
  });
});

// ─── uploadButtonVariants cva tests ─────────────────────────────────────────

describe("uploadButtonVariants cva", () => {
  it("test uploadButtonVariants idle", () => {
    const result = uploadButtonVariants({ state: "idle" });
    expect(result).toContain("cursor-pointer");
    expect(result).toContain("bg-primary");
    expect(result).toContain("text-primary-foreground");
  });

  it("test uploadButtonVariants disabled", () => {
    const result = uploadButtonVariants({ state: "disabled" });
    expect(result).toContain("cursor-not-allowed");
    expect(result).toContain("bg-primary/60");
  });

  it("test uploadButtonVariants uploading", () => {
    const result = uploadButtonVariants({ state: "uploading" });
    expect(result).toContain("cursor-default");
    expect(result).toContain("bg-primary");
  });

  it("test uploadButtonVariants default is idle", () => {
    // When called with no arguments, should use defaultVariants (idle)
    const result = uploadButtonVariants();
    expect(result).toContain("cursor-pointer");
  });
});

// ─── uploadDropzoneVariants cva tests ───────────────────────────────────────

describe("uploadDropzoneVariants cva", () => {
  it("test uploadDropzoneVariants idle", () => {
    const result = uploadDropzoneVariants({ state: "idle" });
    expect(result).toContain("border-border");
    expect(result).toContain("cursor-pointer");
  });

  it("test uploadDropzoneVariants dragOver", () => {
    const result = uploadDropzoneVariants({ state: "dragOver" });
    expect(result).toContain("border-primary");
    expect(result).toContain("bg-primary/10");
  });

  it("test uploadDropzoneVariants disabled", () => {
    const result = uploadDropzoneVariants({ state: "disabled" });
    expect(result).toContain("cursor-not-allowed");
    expect(result).toContain("opacity-60");
  });
});
