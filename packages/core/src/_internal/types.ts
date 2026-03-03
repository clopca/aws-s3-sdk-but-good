import type { ZodType } from "zod";
import type {
  UploadError,
  UploadedFile,
  ExpandedRouteConfig,
} from "@s3-good-internal/shared";

// ─── Step 1: UnsetMarker ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentional: unique symbol used only as a type
declare const unsetMarker: unique symbol;
/**
 * Brand type used to mark builder parameters that have not been set.
 * Uses `unique symbol` to be truly unique in the type system —
 * not assignable to `undefined`, `null`, `never`, or any other type.
 */
export type UnsetMarker = typeof unsetMarker;

// ─── Step 2: AnyParams & UploadBuilderParams ────────────────────────────────

/**
 * Erased parameter interface used as a constraint for generic builder types.
 * All phantom fields use `any` so any concrete params satisfy this shape.
 */
export interface AnyParams {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _input: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _metadata: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _output: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _errorShape: any;
}

/**
 * Concrete parameter interface that tracks what has been configured
 * in the builder chain via phantom type parameters.
 */
export interface UploadBuilderParams<
  TInput = UnsetMarker,
  TMetadata = UnsetMarker,
  TOutput = UnsetMarker,
> {
  _input: TInput;
  _metadata: TMetadata;
  _output: TOutput;
  _errorShape: UploadError;
}

// ─── Step 3: Function types ─────────────────────────────────────────────────

/** Utility: a value that may be synchronous or wrapped in a Promise. */
export type MaybePromise<T> = T | Promise<T>;

/**
 * Middleware function type.
 * When `TInput` is `UnsetMarker` the `input` parameter resolves to `undefined`.
 */
export type MiddlewareFn<TInput, TMetadata> = (opts: {
  req: Request;
  input: TInput extends UnsetMarker ? undefined : TInput;
}) => MaybePromise<TMetadata>;

/**
 * Callback invoked after a successful upload.
 */
export type OnUploadCompleteFn<TMetadata, TOutput> = (opts: {
  metadata: TMetadata;
  file: UploadedFile;
}) => MaybePromise<TOutput>;

/**
 * Callback invoked when an upload fails.
 */
export type UploadErrorFn = (opts: {
  error: UploadError;
  fileKey: string;
}) => MaybePromise<void>;

// ─── Step 4: FileRoute & FileRouter ─────────────────────────────────────────

/**
 * A finalized route definition produced by the builder.
 * `_def` holds runtime data; `_input`, `_metadata`, `_output` are phantom
 * type carriers that are never accessed at runtime.
 */
export interface FileRoute<TParams extends AnyParams = AnyParams> {
  _def: {
    routerConfig: ExpandedRouteConfig;
    inputParser: ZodType | undefined;
    middleware: MiddlewareFn<TParams["_input"], TParams["_metadata"]>;
    onUploadComplete: OnUploadCompleteFn<
      TParams["_metadata"],
      TParams["_output"]
    >;
    onUploadError?: UploadErrorFn;
  };
  // Phantom type carriers (never accessed at runtime)
  _input: TParams["_input"];
  _metadata: TParams["_metadata"];
  _output: TParams["_output"];
}

/** A record of named file routes — the top-level router shape. */
export type FileRouter = Record<string, FileRoute<AnyParams>>;

// ─── Step 5: Inference utility types ────────────────────────────────────────

/**
 * Infer the input type for a specific endpoint.
 * Resolves to `undefined` when the route has no input parser (UnsetMarker).
 */
export type inferEndpointInput<
  TRouter extends FileRouter,
  TEndpoint extends keyof TRouter,
> = TRouter[TEndpoint]["_input"] extends UnsetMarker
  ? undefined
  : TRouter[TEndpoint]["_input"];

/**
 * Infer the output type for a specific endpoint.
 */
export type inferEndpointOutput<
  TRouter extends FileRouter,
  TEndpoint extends keyof TRouter,
> = TRouter[TEndpoint]["_output"];

/**
 * Infer all endpoint names from a router as string literal types.
 */
export type inferEndpoints<TRouter extends FileRouter> = keyof TRouter &
  string;

/** Extract the server data type from a FileRoute */
export type inferServerData<TRoute extends FileRoute<AnyParams>> =
  TRoute["_output"];

/** Extract the metadata type from a FileRoute */
export type inferMetadata<TRoute extends FileRoute<AnyParams>> =
  TRoute["_metadata"];

/** Helper to get permitted file info for a route */
export interface PermittedFileInfo {
  slug: string;
  config: ExpandedRouteConfig;
  fileTypes: string[];
  maxFileSize: string;
  maxFileCount: number;
}
