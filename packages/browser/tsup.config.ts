import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  treeshake: true,
  external: ["react", "react-dom", "@s3-good/core", "@s3-good/shared"],
});
