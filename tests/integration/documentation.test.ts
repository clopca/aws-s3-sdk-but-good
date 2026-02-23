import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "../infrastructure/yaml-helper.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function readJson(relativePath: string): Record<string, unknown> {
  const content = readFileSync(resolve(ROOT, relativePath), "utf-8");
  return JSON.parse(content);
}

describe("Documentation (Tasks 39-40)", () => {
  it("S3 setup documentation exists", () => {
    // Migrated from docs/s3-setup.md to Starlight docs site
    const docPath = resolve(
      ROOT,
      "docs/src/content/docs/getting-started/s3-setup.mdx",
    );

    expect(existsSync(docPath)).toBe(true);
  });

  it("root README exists", () => {
    const readmePath = resolve(ROOT, "README.md");

    expect(existsSync(readmePath)).toBe(true);
  });

  it("core package README exists", () => {
    const readmePath = resolve(ROOT, "packages/core/README.md");

    expect(existsSync(readmePath)).toBe(true);
  });

  it("react package README exists", () => {
    const readmePath = resolve(ROOT, "packages/react/README.md");

    expect(existsSync(readmePath)).toBe(true);
  });

  it("shared package README exists", () => {
    const readmePath = resolve(ROOT, "packages/shared/README.md");

    expect(existsSync(readmePath)).toBe(true);
  });

  it("all READMEs have meaningful content (> 100 bytes)", () => {
    const readmePaths = [
      "README.md",
      "packages/core/README.md",
      "packages/react/README.md",
      "packages/shared/README.md",
      // Migrated from docs/s3-setup.md to Starlight docs site
      "docs/src/content/docs/getting-started/s3-setup.mdx",
    ];

    for (const relativePath of readmePaths) {
      const fullPath = resolve(ROOT, relativePath);
      const stat = statSync(fullPath);

      expect(
        stat.size,
        `${relativePath} should be > 100 bytes but was ${stat.size}`,
      ).toBeGreaterThan(100);
    }
  });
});

describe("Docs Site — Starlight Setup (Task 09)", () => {
  it("docs workspace is configured in pnpm-workspace.yaml", () => {
    // Arrange
    const content = readFileSync(
      resolve(ROOT, "pnpm-workspace.yaml"),
      "utf-8",
    );
    const workspace = parseYaml(content);

    // Act
    const packages = workspace.packages as string[];

    // Assert
    expect(packages).toContain("docs");
  });

  it("docs package is private", () => {
    // Arrange
    const pkg = readJson("docs/package.json");

    // Act & Assert
    expect(pkg.private).toBe(true);
  });

  it("docs package has a build script", () => {
    // Arrange
    const pkg = readJson("docs/package.json");

    // Act
    const scripts = pkg.scripts as Record<string, string>;

    // Assert
    expect(scripts.build).toBeDefined();
  });
});

describe("Docs Site — Content Pages (Tasks 10-11)", () => {
  const DOCS_DIR = "docs/src/content/docs";

  const GETTING_STARTED_PAGES = [
    "getting-started/installation.mdx",
    "getting-started/quick-start.mdx",
    "getting-started/s3-setup.mdx",
  ];

  const COMPONENT_PAGES = [
    "components/upload-button.mdx",
    "components/upload-dropzone.mdx",
    "components/file-list.mdx",
    "components/file-preview.mdx",
    "components/progress-bar.mdx",
  ];

  const ALL_EXPECTED_PAGES = [
    "index.mdx",
    ...GETTING_STARTED_PAGES,
    ...COMPONENT_PAGES,
    "server/file-router.mdx",
    "server/next.mdx",
    "server/hono.mdx",
    "client/upload-files.mdx",
    "client/hooks.mdx",
    "api/core.mdx",
    "api/react.mdx",
    "theming/appearance.mdx",
  ];

  it("all expected docs pages exist", () => {
    // Arrange & Act & Assert
    for (const page of ALL_EXPECTED_PAGES) {
      const fullPath = resolve(ROOT, DOCS_DIR, page);

      expect(
        existsSync(fullPath),
        `Expected docs page to exist: ${DOCS_DIR}/${page}`,
      ).toBe(true);
    }
  });

  it("all docs pages have title in frontmatter", () => {
    // Arrange
    const titleRegex = /^---\s*\n[\s\S]*?title:\s*.+[\s\S]*?\n---/;

    // Act & Assert
    for (const page of ALL_EXPECTED_PAGES) {
      const fullPath = resolve(ROOT, DOCS_DIR, page);
      const content = readFileSync(fullPath, "utf-8");

      expect(
        titleRegex.test(content),
        `Expected frontmatter with title in: ${DOCS_DIR}/${page}`,
      ).toBe(true);
    }
  });

  it("getting started pages exist", () => {
    // Arrange & Act & Assert
    for (const page of GETTING_STARTED_PAGES) {
      const fullPath = resolve(ROOT, DOCS_DIR, page);

      expect(
        existsSync(fullPath),
        `Expected getting started page: ${DOCS_DIR}/${page}`,
      ).toBe(true);
    }
  });

  it("all 5 component pages exist", () => {
    // Arrange & Act & Assert
    expect(COMPONENT_PAGES).toHaveLength(5);

    for (const page of COMPONENT_PAGES) {
      const fullPath = resolve(ROOT, DOCS_DIR, page);

      expect(
        existsSync(fullPath),
        `Expected component page: ${DOCS_DIR}/${page}`,
      ).toBe(true);
    }
  });

  it("server pages include Hono adapter", () => {
    // Arrange
    const honoPath = resolve(ROOT, DOCS_DIR, "server/hono.mdx");

    // Act & Assert
    expect(
      existsSync(honoPath),
      "Expected Hono adapter page at server/hono.mdx",
    ).toBe(true);
  });
});
