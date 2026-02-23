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

describe("Shared Tooling (Task 02)", () => {
  describe("base tsconfig", () => {
    it("has strict mode enabled", () => {
      const config = readJson("tooling/tsconfig/base.json");
      const compilerOptions = config.compilerOptions as Record<string, unknown>;

      expect(compilerOptions.strict).toBe(true);
    });

    it("uses bundler module resolution for tsup compatibility", () => {
      const config = readJson("tooling/tsconfig/base.json");
      const compilerOptions = config.compilerOptions as Record<string, unknown>;

      expect(compilerOptions.moduleResolution).toBe("bundler");
    });
  });

  describe("library tsconfig", () => {
    it("extends base.json", () => {
      const config = readJson("tooling/tsconfig/library.json");

      expect(config.extends).toBe("./base.json");
    });
  });

  describe("react-library tsconfig", () => {
    it("has JSX transform set to react-jsx", () => {
      const config = readJson("tooling/tsconfig/react-library.json");
      const compilerOptions = config.compilerOptions as Record<string, unknown>;

      expect(compilerOptions.jsx).toBe("react-jsx");
    });

    it("includes DOM types in lib", () => {
      const config = readJson("tooling/tsconfig/react-library.json");
      const compilerOptions = config.compilerOptions as Record<string, unknown>;
      const lib = compilerOptions.lib as string[];

      expect(lib).toContain("DOM");
    });
  });
});
