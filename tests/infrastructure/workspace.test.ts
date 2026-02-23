import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "./yaml-helper.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function readJson(relativePath: string): Record<string, unknown> {
  const content = readFileSync(resolve(ROOT, relativePath), "utf-8");
  return JSON.parse(content);
}

function readFile(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf-8");
}

function readYaml(relativePath: string): Record<string, unknown> {
  const content = readFileSync(resolve(ROOT, relativePath), "utf-8");
  return parseYaml(content);
}

describe("Root Workspace (Task 01)", () => {
  it("root package.json exists and has workspace scripts", () => {
    const pkg = readJson("package.json");

    expect(pkg.private).toBe(true);
    const scripts = pkg.scripts as Record<string, string>;
    expect(scripts.build).toBeDefined();
    expect(scripts.dev).toBeDefined();
    expect(scripts.lint).toBeDefined();
    expect(scripts.typecheck).toBeDefined();
    expect(scripts.test).toBeDefined();
    expect(scripts.clean).toBeDefined();
  });

  it("pnpm-workspace.yaml defines packages, tooling, and examples directories", () => {
    const workspace = readYaml("pnpm-workspace.yaml");

    const packages = workspace.packages as string[];
    expect(packages).toContain("packages/*");
    expect(packages).toContain("tooling/*");
    expect(packages).toContain("examples/*");
  });

  it("turbo.json has required tasks: build, test, lint, typecheck", () => {
    const turbo = readJson("turbo.json");

    const tasks = turbo.tasks as Record<string, unknown>;
    expect(tasks.build).toBeDefined();
    expect(tasks.test).toBeDefined();
    expect(tasks.lint).toBeDefined();
    expect(tasks.typecheck).toBeDefined();
  });

  it("turbo.json build task depends on ^build for correct build order", () => {
    const turbo = readJson("turbo.json");

    const tasks = turbo.tasks as Record<string, Record<string, unknown>>;
    const buildTask = tasks.build;
    const dependsOn = buildTask.dependsOn as string[];
    expect(dependsOn).toContain("^build");
  });
});

describe("E2E Infrastructure (Task 13)", () => {
  it("test_e2e_config_exists", () => {
    const exists = existsSync(resolve(ROOT, "tests/e2e/vitest.config.ts"));
    expect(exists).toBe(true);
  });

  it("test_e2e_helpers_exist", () => {
    const exists = existsSync(resolve(ROOT, "tests/e2e/helpers.ts"));
    expect(exists).toBe(true);
  });

  it("test_e2e_setup_exists", () => {
    const exists = existsSync(resolve(ROOT, "tests/e2e/setup.ts"));
    expect(exists).toBe(true);
  });

  it("test_e2e_not_in_default_tests", () => {
    const config = readFile("vitest.config.ts");
    // Root config must exclude tests/e2e/ so E2E tests don't run with `pnpm test`
    expect(config).toContain("tests/e2e/**");
    // Verify it's in the exclude array, not the include
    const excludeIndex = config.indexOf("exclude");
    const e2ePatternIndex = config.indexOf("tests/e2e/**");
    expect(excludeIndex).toBeGreaterThan(-1);
    expect(e2ePatternIndex).toBeGreaterThan(excludeIndex);
  });

  it("test_root_has_test_e2e_script", () => {
    const pkg = readJson("package.json");
    const scripts = pkg.scripts as Record<string, string>;
    expect(scripts["test:e2e"]).toBeDefined();
    expect(scripts["test:e2e"]).toContain("vitest");
  });
});

describe("E2E Test Files (Task 14)", () => {
  it("test_e2e_test_files_exist", () => {
    const testFiles = [
      "tests/e2e/smoke.test.ts",
      "tests/e2e/upload-flow.test.ts",
      "tests/e2e/multipart-upload.test.ts",
      "tests/e2e/error-scenarios.test.ts",
    ];

    for (const file of testFiles) {
      expect(
        existsSync(resolve(ROOT, file)),
        `Expected ${file} to exist`,
      ).toBe(true);
    }
  });
});

describe("E2E CI Integration (Task 15)", () => {
  const ciPath = ".github/workflows/ci.yml";

  it("test_ci_has_e2e_job", () => {
    const content = readFile(ciPath);
    // The CI workflow must define an "e2e" job
    expect(content).toContain("e2e:");
    expect(content).toContain("pnpm test:e2e");
  });

  it("test_ci_e2e_continue_on_error", () => {
    const content = readFile(ciPath);
    // E2E job must not block PRs
    expect(content).toContain("continue-on-error: true");
  });
});

describe("Release Workflow (Task 17)", () => {
  const workflowPath = ".github/workflows/release.yml";

  it("test_release_workflow_exists", () => {
    const exists = existsSync(resolve(ROOT, workflowPath));
    expect(exists).toBe(true);
  });

  it("test_release_workflow_uses_changesets", () => {
    const content = readFile(workflowPath);
    expect(content).toContain("changesets/action");
  });

  it("test_release_workflow_builds_first", () => {
    const content = readFile(workflowPath);

    // "pnpm build" must appear before "changesets/action" in the workflow
    const buildIndex = content.indexOf("pnpm build");
    const changesetsIndex = content.indexOf("changesets/action");

    expect(buildIndex).toBeGreaterThan(-1);
    expect(changesetsIndex).toBeGreaterThan(-1);
    expect(buildIndex).toBeLessThan(changesetsIndex);
  });
});
