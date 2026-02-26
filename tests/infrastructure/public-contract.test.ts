import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

function readJson(path: string): any {
  return JSON.parse(readFileSync(resolve(ROOT, path), "utf8"));
}

const expectedExports: Record<string, string[]> = {
  core: [".", "./server", "./client", "./next", "./next-client", "./types", "./hono", "./sdk"],
  react: [".", "./styles.css"],
  browser: [".", "./styles.css"],
  shared: ["."],
};

describe("public package contract", () => {
  for (const [pkgName, requiredKeys] of Object.entries(expectedExports)) {
    it(`${pkgName} exports surface remains stable`, () => {
      const pkg = readJson(`packages/${pkgName}/package.json`);
      const exportsField = pkg.exports as Record<string, unknown>;
      expect(exportsField).toBeDefined();

      for (const key of requiredKeys) {
        expect(exportsField[key]).toBeDefined();
      }
    });
  }

  for (const pkgName of ["core", "react", "browser", "shared"]) {
    it(`${pkgName} export targets exist in dist`, () => {
      const pkg = readJson(`packages/${pkgName}/package.json`);
      const exportsField = pkg.exports as Record<
        string,
        | string
        | Record<string, string>
        | {
            import?: { types?: string; default?: string };
            require?: { types?: string; default?: string };
          }
      >;

      for (const [entry, target] of Object.entries(exportsField)) {
        if (typeof target === "string") {
          expect(
            existsSync(resolve(ROOT, `packages/${pkgName}`, target)),
            `${pkgName} export ${entry} target missing: ${target}`,
          ).toBe(true);
          continue;
        }

        if (
          target.import &&
          typeof target.import === "object" &&
          "default" in target.import
        ) {
          for (const [condition, value] of [
            ["import.types", target.import.types],
            ["import.default", target.import.default],
            ["require.types", target.require?.types],
            ["require.default", target.require?.default],
          ] as const) {
            expect(value, `${pkgName} export ${entry} missing ${condition}`).toBeDefined();
            expect(
              existsSync(resolve(ROOT, `packages/${pkgName}`, value as string)),
              `${pkgName} export ${entry}.${condition} target missing: ${value}`,
            ).toBe(true);
          }
          continue;
        }

        for (const condition of ["types", "import", "require"] as const) {
          const value = (target as Record<string, string>)[condition];
          expect(value, `${pkgName} export ${entry} missing ${condition}`).toBeDefined();
          expect(
            existsSync(resolve(ROOT, `packages/${pkgName}`, value)),
            `${pkgName} export ${entry}.${condition} target missing: ${value}`,
          ).toBe(true);
        }
      }
    });
  }
});
