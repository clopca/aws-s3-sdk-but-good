import type { ZodType, z } from "zod";
import type {
  AnyParams,
  UploadBuilderParams,
  FileRoute,
  MiddlewareFn,
  OnUploadCompleteFn,
  UploadErrorFn,
} from "./types";
import type { ExpandedRouteConfig } from "@s3-good/shared";

/**
 * Chainable builder for defining upload routes with full type inference.
 *
 * The generic `TParams` tracks what has been configured at each step:
 * - `.input()` sets `_input`
 * - `.middleware()` sets `_metadata` and removes `.input()` / `.middleware()` from the chain
 * - `.onUploadComplete()` is terminal — it returns a `FileRoute`, not a builder
 *
 * @example
 * ```ts
 * const route = createBuilder({ image: { maxFileSize: "4MB" } })
 *   .input(z.object({ tag: z.string() }))
 *   .middleware(({ input }) => ({ userId: "123", tag: input.tag }))
 *   .onUploadComplete(({ metadata, file }) => {
 *     console.log(metadata.userId, file.url);
 *   });
 * ```
 */
export class UploadBuilder<TParams extends AnyParams> {
  /** @internal */
  private _def: {
    routerConfig: ExpandedRouteConfig;
    inputParser?: ZodType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    middleware?: MiddlewareFn<any, any>;
    onUploadError?: UploadErrorFn;
  };

  constructor(routerConfig: ExpandedRouteConfig) {
    this._def = { routerConfig };
  }

  /**
   * Attach a Zod schema to validate client-provided input for this route.
   * Must be called **before** `.middleware()`.
   */
  input<TInput extends ZodType>(
    schema: TInput,
  ): UploadBuilder<{
    _input: z.infer<TInput>;
    _metadata: TParams["_metadata"];
    _output: TParams["_output"];
    _errorShape: TParams["_errorShape"];
  }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newBuilder = new UploadBuilder<any>(this._def.routerConfig);
    newBuilder._def = { ...this._def, inputParser: schema };
    return newBuilder;
  }

  /**
   * Attach middleware that runs before the upload.
   * Receives the validated input (if `.input()` was called) and the raw `Request`.
   * Must return metadata that will be passed to `.onUploadComplete()`.
   *
   * After calling `.middleware()`, `.input()` and `.middleware()` are no longer
   * available on the chain (enforced via `Omit`).
   */
  middleware<TMetadata>(
    fn: MiddlewareFn<TParams["_input"], TMetadata>,
  ): Omit<
    UploadBuilder<{
      _input: TParams["_input"];
      _metadata: TMetadata;
      _output: TParams["_output"];
      _errorShape: TParams["_errorShape"];
    }>,
    "input" | "middleware"
  > {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newBuilder = new UploadBuilder<any>(this._def.routerConfig);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    newBuilder._def = { ...this._def, middleware: fn as any };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return newBuilder as any;
  }

  /**
   * Terminal method — defines the callback invoked after a successful upload.
   * Returns a finalized `FileRoute` object (not a builder).
   */
  onUploadComplete<TOutput>(
    fn: OnUploadCompleteFn<TParams["_metadata"], TOutput>,
  ): FileRoute<{
    _input: TParams["_input"];
    _metadata: TParams["_metadata"];
    _output: TOutput;
    _errorShape: TParams["_errorShape"];
  }> {
    return {
      _def: {
        routerConfig: this._def.routerConfig,
        inputParser: this._def.inputParser,
        middleware: this._def.middleware!,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onUploadComplete: fn as any,
        onUploadError: this._def.onUploadError,
      },
      // Phantom type carriers (never used at runtime)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _input: undefined as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _metadata: undefined as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _output: undefined as any,
    };
  }

  /**
   * Optionally attach an error handler for upload failures.
   * This method is chainable and can be called at any point before `.onUploadComplete()`.
   */
  onUploadError(fn: UploadErrorFn): this {
    this._def.onUploadError = fn;
    return this;
  }
}

/**
 * Create a new `UploadBuilder` for the given route configuration.
 * This is the internal factory used by `createUploader()`.
 */
export function createBuilder(
  routerConfig: ExpandedRouteConfig,
): UploadBuilder<UploadBuilderParams> {
  return new UploadBuilder<UploadBuilderParams>(routerConfig);
}
