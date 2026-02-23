import { describe, it, expectTypeOf } from "vitest";
import { z } from "zod";
import { createBuilder } from "../_internal/upload-builder";
import type { FileRoute, UnsetMarker } from "../_internal/types";

describe("Builder type inference", () => {
  it("infers input type from Zod schema", () => {
    const route = createBuilder({ image: { maxFileSize: "4MB" } })
      .input(z.object({ tag: z.string() }))
      .middleware(({ input }) => {
        expectTypeOf(input).toEqualTypeOf<{ tag: string }>();
        return { userId: "user_123" };
      })
      .onUploadComplete(() => undefined);

    // The route's _input phantom type should be { tag: string }
    expectTypeOf(route._input).toEqualTypeOf<{ tag: string }>();
  });

  it("resolves input to undefined when no .input() is called", () => {
    const route = createBuilder({ image: {} })
      .middleware(({ input }) => {
        expectTypeOf(input).toEqualTypeOf<undefined>();
        return { userId: "user_123" };
      })
      .onUploadComplete(() => undefined);

    // The route's _input phantom type should be UnsetMarker
    expectTypeOf(route._input).toEqualTypeOf<UnsetMarker>();
  });

  it("propagates metadata type from middleware to onUploadComplete", () => {
    createBuilder({ image: {} })
      .middleware(() => ({ userId: "user_123", role: "admin" as const }))
      .onUploadComplete(({ metadata }) => {
        expectTypeOf(metadata).toEqualTypeOf<{
          userId: string;
          role: "admin";
        }>();
      });
  });

  it("infers output type from onUploadComplete return", () => {
    const route = createBuilder({ image: {} })
      .middleware(() => ({}))
      .onUploadComplete(({ file }) => {
        return { url: file.url, processed: true };
      });

    expectTypeOf(route._output).toEqualTypeOf<{
      url: string;
      processed: boolean;
    }>();
  });

  it("route satisfies FileRoute shape", () => {
    const route = createBuilder({ image: {} })
      .middleware(() => ({ userId: "123" }))
      .onUploadComplete(() => ({ done: true }));

    expectTypeOf(route).toMatchTypeOf<FileRoute>();
  });
});
