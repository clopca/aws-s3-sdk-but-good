import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    server: "src/server.ts",
    client: "src/client.ts",
    next: "src/next.ts",
    hono: "src/hono.ts",
    types: "src/types.ts",
    "sdk/index": "src/sdk/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: true,
  clean: true,
  treeshake: true,
  external: ["react", "next", "hono", "zod", "@s3-good-internal/shared"],
});
