import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function runCommand(command: string): { exitCode: number } {
  try {
    execSync(command, { cwd: ROOT, stdio: "pipe" });
    return { exitCode: 0 };
  } catch {
    return { exitCode: 1 };
  }
}

describe("Build Integration (Tasks 03-05)", () => {
  it("@s3-good/shared builds successfully", () => {
    const result = runCommand("pnpm --filter @s3-good/shared build");

    expect(result.exitCode).toBe(0);
    expect(existsSync(resolve(ROOT, "packages/shared/dist"))).toBe(true);
  });

  it("@s3-good/core builds successfully", () => {
    const result = runCommand("pnpm --filter @s3-good/core build");

    expect(result.exitCode).toBe(0);
    expect(existsSync(resolve(ROOT, "packages/core/dist"))).toBe(true);
  });

  it("@s3-good/react builds successfully", () => {
    const result = runCommand("pnpm --filter @s3-good/react build");

    expect(result.exitCode).toBe(0);
    expect(existsSync(resolve(ROOT, "packages/react/dist"))).toBe(true);
  });

  it("full monorepo build succeeds", () => {
    const result = runCommand("pnpm build");

    expect(result.exitCode).toBe(0);
  });
});
