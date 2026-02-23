import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function runCommand(command: string): {
  exitCode: number;
  stdout: string;
  stderr: string;
} {
  try {
    const stdout = execSync(command, { cwd: ROOT, stdio: "pipe" }).toString();
    return { exitCode: 0, stdout, stderr: "" };
  } catch (error) {
    const err = error as {
      status?: number;
      stdout?: Buffer;
      stderr?: Buffer;
    };
    return {
      exitCode: err.status ?? 1,
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? "",
    };
  }
}

describe("Example App (Task 38)", () => {
  it("example app builds successfully", () => {
    const result = runCommand("pnpm --filter nextjs-example build");

    expect(
      result.exitCode,
      `Build failed.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
    ).toBe(0);
  }, 120_000);

  it("example app typechecks successfully", () => {
    const result = runCommand("pnpm --filter nextjs-example typecheck");

    expect(
      result.exitCode,
      `Typecheck failed.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
    ).toBe(0);
  }, 60_000);

  it("example app has API route", () => {
    const apiRoutePath = resolve(
      ROOT,
      "examples/nextjs/src/app/api/upload/route.ts",
    );

    expect(existsSync(apiRoutePath)).toBe(true);
  });

  it("example app has upload router", () => {
    const uploadRouterPath = resolve(
      ROOT,
      "examples/nextjs/src/server/upload-router.ts",
    );

    expect(existsSync(uploadRouterPath)).toBe(true);
  });
});
