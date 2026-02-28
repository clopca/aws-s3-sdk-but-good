import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function readFile(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf-8");
}

describe("Release Readiness", () => {
  it("root package.json defines release:verify script", () => {
    const packageJson = JSON.parse(readFile("package.json")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["release:verify"]).toBeDefined();
    expect(packageJson.scripts?.["release:verify"]).toContain(
      "tooling/scripts/release-readiness-check.sh",
    );
  });

  it("CI workflow runs publish readiness verification", () => {
    const ci = readFile(".github/workflows/ci.yml");
    expect(ci).toContain("publish-readiness:");
    expect(ci).toContain("pnpm release:verify");
  });

  it("release readiness script validates pack + dry-run publish", () => {
    const script = readFile("tooling/scripts/release-readiness-check.sh");
    expect(script).toContain("pnpm --filter");
    expect(script).toContain("pack --pack-destination");
    expect(script).toContain("publish --dry-run --no-git-checks");
  });
});
