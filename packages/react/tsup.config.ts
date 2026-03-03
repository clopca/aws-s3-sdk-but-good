import { defineConfig } from "tsup";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    next: "src/next.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  treeshake: true,
  external: ["react", "react-dom", "s3-good"],
  onSuccess: async () => {
    // Rollup's treeshake pass strips the "use client" banner directive,
    // so we prepend it after the build completes.
    for (const file of ["index.js", "index.cjs", "next.js", "next.cjs"]) {
      const filePath = join("dist", file);
      const content = readFileSync(filePath, "utf-8");
      writeFileSync(filePath, `"use client";\n${content}`);
    }
  },
});
