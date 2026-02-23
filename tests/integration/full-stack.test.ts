import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "../infrastructure/yaml-helper.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function readJson(relativePath: string): Record<string, unknown> {
  const content = readFileSync(resolve(ROOT, relativePath), "utf-8");
  return JSON.parse(content);
}

function readFile(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf-8");
}

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

describe("Full Stack Integration (Phase 7)", () => {
  it("full monorepo build succeeds", () => {
    const result = runCommand("pnpm build");

    expect(
      result.exitCode,
      `Build failed.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
    ).toBe(0);
  }, 120_000);

  it("full monorepo typecheck succeeds", () => {
    const result = runCommand("pnpm typecheck");

    expect(
      result.exitCode,
      `Typecheck failed.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
    ).toBe(0);
  }, 120_000);

  it("full monorepo tests pass", () => {
    const result = runCommand("pnpm test");

    expect(
      result.exitCode,
      `Tests failed.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
    ).toBe(0);
  }, 180_000);

  it("all packages have dist directories after build", () => {
    const packages = ["core", "react", "shared"];

    for (const pkg of packages) {
      const distPath = resolve(ROOT, `packages/${pkg}/dist`);

      expect(
        existsSync(distPath),
        `packages/${pkg}/dist should exist`,
      ).toBe(true);
    }
  });

  it("core dist has all 5 entry points", () => {
    const entryPoints = [
      "packages/core/dist/server.js",
      "packages/core/dist/client.js",
      "packages/core/dist/next.js",
      "packages/core/dist/types.js",
      "packages/core/dist/sdk/index.js",
    ];

    for (const entryPoint of entryPoints) {
      const fullPath = resolve(ROOT, entryPoint);

      expect(
        existsSync(fullPath),
        `${entryPoint} should exist`,
      ).toBe(true);
    }
  });
});

// ─── Phase 6 Final Integration (Task 22) ───────────────────────────────────

describe("Phase 6 — Final Integration (Task 22)", () => {
  // Cross-Phase Integration Tests

  it("Hono entry point builds — hono.js and hono.d.ts exist", () => {
    const honoJs = resolve(ROOT, "packages/core/dist/hono.js");
    const honoDts = resolve(ROOT, "packages/core/dist/hono.d.ts");

    expect(
      existsSync(honoJs),
      "packages/core/dist/hono.js should exist after build",
    ).toBe(true);
    expect(
      existsSync(honoDts),
      "packages/core/dist/hono.d.ts should exist after build",
    ).toBe(true);
  });

  it("React new components build — index.js contains new exports", () => {
    const indexJs = resolve(ROOT, "packages/react/dist/index.js");

    expect(
      existsSync(indexJs),
      "packages/react/dist/index.js should exist",
    ).toBe(true);

    const content = readFile("packages/react/dist/index.js");

    // New components added during expansion (FilePreview, ProgressBar, FileList)
    expect(content).toContain("FilePreview");
    expect(content).toContain("ProgressBar");
    expect(content).toContain("FileList");
  });

  it("Full build succeeds — all dist/ directories populated", () => {
    const packages = ["core", "react", "shared"];

    for (const pkg of packages) {
      const distPath = resolve(ROOT, `packages/${pkg}/dist`);

      expect(
        existsSync(distPath),
        `packages/${pkg}/dist should exist after full build`,
      ).toBe(true);
    }

    // Verify each dist has actual JS output (not empty)
    expect(existsSync(resolve(ROOT, "packages/core/dist/server.js"))).toBe(true);
    expect(existsSync(resolve(ROOT, "packages/react/dist/index.js"))).toBe(true);
    expect(existsSync(resolve(ROOT, "packages/shared/dist/index.js"))).toBe(true);
  });

  it("Docs workspace configured — 'docs' in pnpm-workspace.yaml packages", () => {
    const content = readFile("pnpm-workspace.yaml");
    const workspace = parseYaml(content);
    const packages = workspace.packages as string[];

    expect(packages).toContain("docs");
  });

  it("E2E script available — test:e2e script defined in root package.json", () => {
    const pkg = readJson("package.json");
    const scripts = pkg.scripts as Record<string, string>;

    expect(
      scripts["test:e2e"],
      'Root package.json should have a "test:e2e" script',
    ).toBeDefined();
  });

  it("Release workflow ready — release.yml exists", () => {
    const releasePath = resolve(ROOT, ".github/workflows/release.yml");

    expect(
      existsSync(releasePath),
      ".github/workflows/release.yml should exist",
    ).toBe(true);
  });

  // Regression Tests

  it("No regression on Next.js adapter — next.js and next.d.ts exist", () => {
    const nextJs = resolve(ROOT, "packages/core/dist/next.js");
    const nextDts = resolve(ROOT, "packages/core/dist/next.d.ts");

    expect(
      existsSync(nextJs),
      "packages/core/dist/next.js should still exist (regression check)",
    ).toBe(true);
    expect(
      existsSync(nextDts),
      "packages/core/dist/next.d.ts should still exist (regression check)",
    ).toBe(true);
  });

  it("No regression on existing components — UploadButton and UploadDropzone in index", () => {
    const indexJs = resolve(ROOT, "packages/react/dist/index.js");

    expect(
      existsSync(indexJs),
      "packages/react/dist/index.js should exist",
    ).toBe(true);

    const content = readFile("packages/react/dist/index.js");

    // Original components that must still be exported
    expect(
      content.includes("UploadButton"),
      "UploadButton should be exported from @s3-good/react (regression check)",
    ).toBe(true);
    expect(
      content.includes("UploadDropzone"),
      "UploadDropzone should be exported from @s3-good/react (regression check)",
    ).toBe(true);
  });
});
