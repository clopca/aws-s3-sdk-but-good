import { describe, it, expect, expectTypeOf } from "vitest";
import { z } from "zod";
import { createUploader, createRouteRegistry } from "../server";
import type {
  inferEndpointInput,
  inferEndpointOutput,
  inferEndpoints,
  FileRouter,
} from "../_internal/types";

// Build a test router for type-level assertions
const f = createUploader();

const testRouter = {
  withInput: f({ image: { maxFileSize: "4MB" } })
    .input(z.object({ tag: z.string() }))
    .middleware(({ input }) => ({ userId: "user_123", tag: input.tag }))
    .onUploadComplete(({ metadata }) => ({
      url: "https://example.com",
      userId: metadata.userId,
    })),

  withoutInput: f({ pdf: { maxFileSize: "16MB" } })
    .middleware(() => ({ orgId: "org_456" }))
    .onUploadComplete(() => ({ processed: true })),

  blobRoute: f({ blob: { maxFileSize: "32MB" } })
    .middleware(() => ({}))
    .onUploadComplete(() => undefined),
} satisfies FileRouter;

describe("Type inference: inferEndpointInput", () => {
  it("infers input type for route with .input()", () => {
    type Input = inferEndpointInput<typeof testRouter, "withInput">;
    expectTypeOf<Input>().toEqualTypeOf<{ tag: string }>();
  });

  it("resolves to undefined for route without .input()", () => {
    type Input = inferEndpointInput<typeof testRouter, "withoutInput">;
    expectTypeOf<Input>().toEqualTypeOf<undefined>();
  });
});

describe("Type inference: inferEndpointOutput", () => {
  it("infers output type from onUploadComplete return", () => {
    type Output = inferEndpointOutput<typeof testRouter, "withInput">;
    expectTypeOf<Output>().toEqualTypeOf<{
      url: string;
      userId: string;
    }>();
  });

  it("infers void output for route returning undefined", () => {
    type Output = inferEndpointOutput<typeof testRouter, "blobRoute">;
    expectTypeOf<Output>().toEqualTypeOf<undefined>();
  });
});

describe("Type inference: inferEndpoints", () => {
  it("infers all endpoint names as string union", () => {
    type Endpoints = inferEndpoints<typeof testRouter>;
    expectTypeOf<Endpoints>().toEqualTypeOf<
      "withInput" | "withoutInput" | "blobRoute"
    >();
  });
});

describe("createRouteRegistry", () => {
  it("maps route names to themselves (identity proxy)", () => {
    const registry = createRouteRegistry(testRouter);

    expect(registry.withInput).toBe("withInput");
    expect(registry.withoutInput).toBe("withoutInput");
    expect(registry.blobRoute).toBe("blobRoute");
  });

  it("has correct type: keys map to their own string literal", () => {
    const registry = createRouteRegistry(testRouter);

    expectTypeOf(registry.withInput).toEqualTypeOf<"withInput">();
    expectTypeOf(registry.withoutInput).toEqualTypeOf<"withoutInput">();
    expectTypeOf(registry.blobRoute).toEqualTypeOf<"blobRoute">();
  });

  it("only contains keys from the router", () => {
    const registry = createRouteRegistry(testRouter);
    expect(Object.keys(registry)).toEqual(["withInput", "withoutInput", "blobRoute"]);
  });
});
