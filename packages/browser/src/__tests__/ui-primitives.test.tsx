import { describe, it, expect } from "vitest";
import { buttonVariants } from "../components/ui/button";
import { inputVariants } from "../components/ui/input";
import * as uiExports from "../components/ui/index";

// ─── buttonVariants cva tests ───────────────────────────────────────────────

describe("buttonVariants", () => {
  it("test buttonVariants produces correct classes for default variant and size", () => {
    const result = buttonVariants({ variant: "default", size: "default" });
    expect(result).toContain("bg-primary");
    expect(result).toContain("text-primary-foreground");
    expect(result).toContain("h-8");
    expect(result).toContain("px-3");
  });

  it("test buttonVariants destructive variant", () => {
    const result = buttonVariants({ variant: "destructive" });
    expect(result).toContain("bg-destructive");
    expect(result).toContain("text-white");
  });

  it("test buttonVariants outline variant", () => {
    const result = buttonVariants({ variant: "outline" });
    expect(result).toContain("border");
    expect(result).toContain("bg-background");
  });

  it("test buttonVariants ghost variant", () => {
    const result = buttonVariants({ variant: "ghost" });
    expect(result).toContain("hover:bg-accent");
  });

  it("test buttonVariants sm size", () => {
    const result = buttonVariants({ size: "sm" });
    expect(result).toContain("h-7");
    expect(result).toContain("text-xs");
  });

  it("test buttonVariants lg size", () => {
    const result = buttonVariants({ size: "lg" });
    expect(result).toContain("h-9");
    expect(result).toContain("px-4");
  });

  it("test buttonVariants icon size", () => {
    const result = buttonVariants({ size: "icon" });
    expect(result).toContain("h-8");
    expect(result).toContain("w-8");
  });

  it("test buttonVariants defaults when called with no args", () => {
    const result = buttonVariants();
    // Should use defaultVariants: variant: "default", size: "default"
    expect(result).toContain("bg-primary");
    expect(result).toContain("h-8");
  });
});

// ─── inputVariants cva tests ────────────────────────────────────────────────

describe("inputVariants", () => {
  it("test inputVariants produces correct base classes", () => {
    const result = inputVariants();
    expect(result).toContain("rounded-lg");
    expect(result).toContain("border");
    expect(result).toContain("bg-background");
    expect(result).toContain("text-sm");
  });
});

// ─── No backward-compatible aliases ─────────────────────────────────────────

describe("no backward-compatible aliases in exports", () => {
  it("test no backward-compatible aliases in exports", () => {
    const exports = uiExports as Record<string, unknown>;

    // Old aliases that should NOT exist (backward-compatible names from before refactor)
    // Dialog aliases
    expect(exports).not.toHaveProperty("DialogTrigger");
    // Alert dialog aliases
    expect(exports).not.toHaveProperty("AlertDialogTrigger");
    expect(exports).not.toHaveProperty("AlertDialogAction");
    expect(exports).not.toHaveProperty("AlertDialogCancel");
    // Context menu aliases
    expect(exports).not.toHaveProperty("ContextMenuSeparator");
    expect(exports).not.toHaveProperty("ContextMenuLabel");

    // Verify the actual exports DO exist (positive check)
    expect(exports).toHaveProperty("Dialog");
    expect(exports).toHaveProperty("DialogContent");
    expect(exports).toHaveProperty("DialogClose");
    expect(exports).toHaveProperty("AlertDialog");
    expect(exports).toHaveProperty("AlertDialogContent");
    expect(exports).toHaveProperty("AlertDialogClose");
    expect(exports).toHaveProperty("ContextMenu");
    expect(exports).toHaveProperty("ContextMenuTrigger");
    expect(exports).toHaveProperty("ContextMenuContent");
    expect(exports).toHaveProperty("ContextMenuItem");
    expect(exports).toHaveProperty("Button");
    expect(exports).toHaveProperty("buttonVariants");
    expect(exports).toHaveProperty("Input");
    expect(exports).toHaveProperty("inputVariants");
    expect(exports).toHaveProperty("cn");
  });
});
