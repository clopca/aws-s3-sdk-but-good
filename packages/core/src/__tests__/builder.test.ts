import { describe, it, expect } from "vitest";
import { z } from "zod";
import { UploadBuilder, createBuilder } from "../_internal/upload-builder";

describe("UploadBuilder", () => {
  it("produces a FileRoute with full chain including .input()", () => {
    const route = createBuilder({ image: { maxFileSize: "4MB" } })
      .input(z.object({ tag: z.string() }))
      .middleware(({ input }) => ({ userId: "user_123", tag: input.tag }))
      .onUploadComplete(({ metadata, file }) => {
        return { url: file.url, userId: metadata.userId };
      });

    expect(route).toHaveProperty("_def");
    expect(route._def.routerConfig).toEqual({ image: { maxFileSize: "4MB" } });
    expect(route._def.inputParser).toBeDefined();
    expect(typeof route._def.middleware).toBe("function");
    expect(typeof route._def.onUploadComplete).toBe("function");
  });

  it("produces a FileRoute without .input()", () => {
    const route = createBuilder({ image: { maxFileSize: "4MB" } })
      .middleware(() => ({ userId: "user_123" }))
      .onUploadComplete(({ file }) => {
        return { url: file.url };
      });

    expect(route).toHaveProperty("_def");
    expect(route._def.inputParser).toBeUndefined();
    expect(typeof route._def.middleware).toBe("function");
    expect(typeof route._def.onUploadComplete).toBe("function");
  });

  it("stores the router config correctly", () => {
    const config = { image: { maxFileSize: "4MB" as const }, pdf: { maxFileCount: 3 } };
    const route = createBuilder(config)
      .middleware(() => ({}))
      .onUploadComplete(() => undefined);

    expect(route._def.routerConfig).toEqual(config);
  });

  it("stores the middleware function", () => {
    const middlewareFn = () => ({ userId: "user_123" });
    const route = createBuilder({ image: {} })
      .middleware(middlewareFn)
      .onUploadComplete(() => undefined);

    expect(typeof route._def.middleware).toBe("function");
  });

  it("stores the input parser (Zod schema)", () => {
    const schema = z.object({ tag: z.string() });
    const route = createBuilder({ image: {} })
      .input(schema)
      .middleware(() => ({}))
      .onUploadComplete(() => undefined);

    expect(route._def.inputParser).toBe(schema);
  });

  it("createBuilder returns an UploadBuilder instance", () => {
    const builder = createBuilder({ image: {} });
    expect(builder).toBeInstanceOf(UploadBuilder);
  });

  it("stores onUploadError handler", () => {
    const errorHandler = () => undefined;
    const route = createBuilder({ image: {} })
      .onUploadError(errorHandler)
      .middleware(() => ({}))
      .onUploadComplete(() => undefined);

    expect(route._def.onUploadError).toBeDefined();
  });
});
