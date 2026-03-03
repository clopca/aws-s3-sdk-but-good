import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function readJson(relativePath: string): Record<string, unknown> {
  const content = readFileSync(resolve(ROOT, relativePath), "utf-8");
  return JSON.parse(content);
}

function readFile(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf-8");
}

function collectFiles(relativePath: string): string[] {
  const absPath = resolve(ROOT, relativePath);
  const entries = readdirSync(absPath);
  const files: string[] = [];

  for (const entry of entries) {
    const rel = `${relativePath}/${entry}`;
    const abs = resolve(ROOT, rel);
    if (statSync(abs).isDirectory()) {
      files.push(...collectFiles(rel));
    } else {
      files.push(rel);
    }
  }

  return files;
}

describe("Architecture Boundaries", () => {
  it("keeps s3-good as the canonical base package", () => {
    const corePkg = readJson("packages/core/package.json");
    expect(corePkg.name).toBe("s3-good");
  });

  it("keeps internal shared package out of public docs and examples", () => {
    const publicFacingFiles = [
      "README.md",
      "packages/core/README.md",
      "packages/react/README.md",
      "packages/browser/README.md",
      ...collectFiles("docs/src/content/docs"),
      ...collectFiles("examples/nextjs/src"),
    ];

    for (const file of publicFacingFiles) {
      const content = readFile(file);
      expect(content.includes("@s3-good-internal/shared"), file).toBe(false);
    }
  });

  it("enforces one-way dependency graph from integrations to base package", () => {
    const corePkg = readJson("packages/core/package.json");
    const reactPkg = readJson("packages/react/package.json");
    const browserPkg = readJson("packages/browser/package.json");

    const coreDeps = {
      ...(corePkg.dependencies as Record<string, string>),
      ...(corePkg.devDependencies as Record<string, string>),
      ...(corePkg.peerDependencies as Record<string, string>),
    };
    const reactDeps = reactPkg.dependencies as Record<string, string>;
    const browserDeps = browserPkg.dependencies as Record<string, string>;

    expect(coreDeps["@s3-good/react"]).toBeUndefined();
    expect(coreDeps["@s3-good/browser"]).toBeUndefined();
    expect(reactDeps["s3-good"]).toBe("workspace:*");
    expect(browserDeps["s3-good"]).toBe("workspace:*");
  });

  it("uses canonical docs slug for base API", () => {
    const astroConfig = readFile("docs/astro.config.mjs");
    expect(astroConfig).toMatch(
      /label:\s*["']s3-good["']\s*,\s*slug:\s*["']api\/s3-good["']/,
    );
  });
});
