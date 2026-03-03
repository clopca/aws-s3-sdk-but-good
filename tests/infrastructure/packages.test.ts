import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
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

describe("Publish Readiness (Task 18)", () => {
  const publishablePackages = [
    { name: "core", scope: "s3-good" },
    { name: "react", scope: "@s3-good/react" },
    { name: "browser", scope: "@s3-good/browser" },
  ] as const;

  describe("Publishable packages have publishConfig", () => {
    for (const pkg of publishablePackages) {
      it(`${pkg.scope} has publishConfig.access = "public"`, () => {
        const pkgJson = readJson(`packages/${pkg.name}/package.json`);
        const publishConfig = pkgJson.publishConfig as Record<string, string>;

        expect(publishConfig).toBeDefined();
        expect(publishConfig.access).toBe("public");
      });
    }
  });

  describe("Publishable packages have files field", () => {
    for (const pkg of publishablePackages) {
      it(`${pkg.scope} has files: ["dist"]`, () => {
        const pkgJson = readJson(`packages/${pkg.name}/package.json`);
        const files = pkgJson.files as string[];

        expect(files).toBeDefined();
        expect(files).toContain("dist");
      });
    }
  });

  describe("Publishable packages have correct exports", () => {
    for (const pkg of publishablePackages) {
      it(`${pkg.scope} exports all have import and types fields`, () => {
        const pkgJson = readJson(`packages/${pkg.name}/package.json`);
        const exports = pkgJson.exports as Record<
          string,
          Record<string, string>
        >;

        expect(exports).toBeDefined();
        for (const [entryPoint, config] of Object.entries(exports)) {
          // CSS exports are plain strings (e.g. "./styles.css": "./dist/styles.css")
          if (typeof config === "string") {
            expect(config).toMatch(/\.css$/);
            continue;
          }
          expect(
            config.import,
            `${pkg.scope} ${entryPoint} should have "import" field`,
          ).toBeDefined();
          expect(config.import).toMatch(/\.js$/);
          expect(
            config.types,
            `${pkg.scope} ${entryPoint} should have "types" field`,
          ).toBeDefined();
          expect(config.types).toMatch(/\.d\.ts$/);
        }
      });
    }
  });

  describe("Publishable packages have correct name and version", () => {
    for (const pkg of publishablePackages) {
      it(`${pkg.scope} has correct name`, () => {
        const pkgJson = readJson(`packages/${pkg.name}/package.json`);
        expect(pkgJson.name).toBe(pkg.scope);
      });

      it(`${pkg.scope} has a version field`, () => {
        const pkgJson = readJson(`packages/${pkg.name}/package.json`);
        expect(pkgJson.version).toBeDefined();
        expect(typeof pkgJson.version).toBe("string");
      });
    }
  });

  describe("Internal shared package release policy", () => {
    it("@s3-good-internal/shared is private", () => {
      const pkgJson = readJson("packages/shared/package.json");
      expect(pkgJson.private).toBe(true);
    });

    it("@s3-good-internal/shared is not configured as publicly publishable", () => {
      const pkgJson = readJson("packages/shared/package.json");
      const publishConfig = pkgJson.publishConfig as
        | Record<string, string>
        | undefined;

      expect(publishConfig?.access).not.toBe("public");
    });
  });

  describe("Changeset configuration", () => {
    it("has access set to public", () => {
      const config = readJson(".changeset/config.json");
      expect(config.access).toBe("public");
    });

    it("has linked array including only public packages", () => {
      const config = readJson(".changeset/config.json");
      const linked = config.linked as string[][];
      const publicPackages = ["s3-good", "@s3-good/react", "@s3-good/browser"];

      expect(linked).toBeDefined();
      expect(linked.length).toBeGreaterThanOrEqual(1);
      expect(
        linked.some(
          (group) =>
            publicPackages.every((pkg) => group.includes(pkg)) &&
            !group.includes("@s3-good-internal/shared"),
        ),
      ).toBe(true);
    });

    it("has baseBranch set to main", () => {
      const config = readJson(".changeset/config.json");
      expect(config.baseBranch).toBe("main");
    });

    it("has updateInternalDependencies set to patch", () => {
      const config = readJson(".changeset/config.json");
      expect(config.updateInternalDependencies).toBe("patch");
    });
  });

  describe("Workspace dependencies", () => {
    it("s3-good uses @s3-good-internal/shared as a dev workspace dependency", () => {
      const pkg = readJson("packages/core/package.json");
      const deps = pkg.dependencies as Record<string, string>;
      const devDeps = pkg.devDependencies as Record<string, string>;

      expect(deps["@s3-good-internal/shared"]).toBeUndefined();
      expect(devDeps["@s3-good-internal/shared"]).toBe("workspace:*");
    });

    it("@s3-good/react depends on s3-good via workspace:*", () => {
      const pkg = readJson("packages/react/package.json");
      const deps = pkg.dependencies as Record<string, string>;

      expect(deps["s3-good"]).toBe("workspace:*");
      expect(deps["@s3-good-internal/shared"]).toBeUndefined();
    });

    it("@s3-good/browser depends on s3-good via workspace:*", () => {
      const pkg = readJson("packages/browser/package.json");
      const deps = pkg.dependencies as Record<string, string>;

      expect(deps["s3-good"]).toBe("workspace:*");
      expect(deps["@s3-good-internal/shared"]).toBeUndefined();
    });
  });
});

describe("Package Scaffolds (Tasks 03-05)", () => {
  describe("s3-good (Task 03)", () => {
    it("has 6 entry points including hono", () => {
      const pkg = readJson("packages/core/package.json");
      const exports = pkg.exports as Record<string, unknown>;

      expect(exports["./server"]).toBeDefined();
      expect(exports["./client"]).toBeDefined();
      expect(exports["./next"]).toBeDefined();
      expect(exports["./hono"]).toBeDefined();
      expect(exports["./types"]).toBeDefined();
      expect(exports["./sdk"]).toBeDefined();
    });

    it("each export has a types field for TypeScript support", () => {
      const pkg = readJson("packages/core/package.json");
      const exports = pkg.exports as Record<string, Record<string, string>>;

      for (const [entryPoint, config] of Object.entries(exports)) {
        expect(
          config.types,
          `${entryPoint} should have a "types" field`,
        ).toBeDefined();
        expect(config.types).toMatch(/\.d\.ts$/);
      }
    });
  });

  describe("s3-good Hono adapter (exp-02)", () => {
    it("test_core_has_hono_export", () => {
      const pkg = readJson("packages/core/package.json");
      const exports = pkg.exports as Record<string, unknown>;

      expect(exports["./hono"]).toBeDefined();
    });

    it("test_hono_export_has_types", () => {
      const pkg = readJson("packages/core/package.json");
      const exports = pkg.exports as Record<string, Record<string, string>>;
      const honoExport = exports["./hono"];

      expect(honoExport).toBeDefined();
      expect(honoExport.types).toBeDefined();
      expect(honoExport.types).toMatch(/\.d\.ts$/);
    });

    it("test_hono_is_optional_peer_dep", () => {
      const pkg = readJson("packages/core/package.json");
      const peerDeps = pkg.peerDependencies as Record<string, string>;
      const peerDepsMeta = pkg.peerDependenciesMeta as Record<
        string,
        { optional?: boolean }
      >;

      expect(peerDeps.hono).toBeDefined();
      expect(peerDepsMeta.hono).toBeDefined();
      expect(peerDepsMeta.hono.optional).toBe(true);
    });
  });

  describe("@s3-good/react (Task 04)", () => {
    it("has react and react-dom as peer dependencies", () => {
      const pkg = readJson("packages/react/package.json");
      const peerDeps = pkg.peerDependencies as Record<string, string>;

      expect(peerDeps.react).toBeDefined();
      expect(peerDeps.react).toMatch(/>=?\s*18/);
      expect(peerDeps["react-dom"]).toBeDefined();
      expect(peerDeps["react-dom"]).toMatch(/>=?\s*18/);
    });

    it("tsup config externals include react to avoid bundling it", () => {
      const tsupConfig = readFile("packages/react/tsup.config.ts");

      expect(tsupConfig).toContain("react");
      // Verify "react" appears in the external array
      const externalMatch = tsupConfig.match(/external:\s*\[([^\]]+)\]/);
      expect(externalMatch).not.toBeNull();
      const externals = externalMatch![1];
      expect(externals).toContain('"react"');
    });
  });

  describe("@s3-good-internal/shared (Task 05)", () => {
    it("has no framework dependencies (react, next, aws-sdk)", () => {
      const pkg = readJson("packages/shared/package.json");
      const deps = (pkg.dependencies ?? {}) as Record<string, string>;
      const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;

      // Should not have framework deps in dependencies
      expect(deps.react).toBeUndefined();
      expect(deps["react-dom"]).toBeUndefined();
      expect(deps.next).toBeUndefined();
      expect(deps["@aws-sdk/client-s3"]).toBeUndefined();
      expect(deps["aws-sdk"]).toBeUndefined();

      // Should not have framework deps in devDependencies either
      expect(devDeps.react).toBeUndefined();
      expect(devDeps["react-dom"]).toBeUndefined();
      expect(devDeps.next).toBeUndefined();
    });
  });

  describe("All packages", () => {
    const packages = ["core", "react", "shared"];

    it("all packages have a build script", () => {
      for (const pkg of packages) {
        const pkgJson = readJson(`packages/${pkg}/package.json`);
        const scripts = pkgJson.scripts as Record<string, string>;

        expect(
          scripts.build,
          `packages/${pkg} should have a build script`,
        ).toBeDefined();
      }
    });

    it("all packages have a typecheck script", () => {
      for (const pkg of packages) {
        const pkgJson = readJson(`packages/${pkg}/package.json`);
        const scripts = pkgJson.scripts as Record<string, string>;

        expect(
          scripts.typecheck,
          `packages/${pkg} should have a typecheck script`,
        ).toBeDefined();
      }
    });
  });
});
