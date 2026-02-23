import { UploadBuilder } from "./_internal/upload-builder";
import type { UploadBuilderParams, FileRouter } from "./_internal/types";
import type { ExpandedRouteConfig, S3Config } from "@s3-good/shared";
import { UploadError } from "@s3-good/shared";
import { handleUploadAction } from "./_internal/handler";

export interface CreateUploaderOptions {
  /**
   * Custom error formatter (optional)
   */
  errorFormatter?: (error: Error) => unknown;
}

/**
 * Factory function that returns the `f()` builder function.
 *
 * @example
 * ```ts
 * import { createUploader } from "@s3-good/core/server";
 *
 * const f = createUploader();
 *
 * const uploadRouter = {
 *   imageUploader: f({ image: { maxFileSize: "4MB" } })
 *     .middleware(async ({ req }) => ({ userId: "user_123" }))
 *     .onUploadComplete(async ({ metadata, file }) => {
 *       console.log("Upload complete:", metadata.userId, file.url);
 *     }),
 * };
 * ```
 */
export function createUploader(
  _opts?: CreateUploaderOptions,
): (config: ExpandedRouteConfig) => UploadBuilder<UploadBuilderParams> {
  const f = (config: ExpandedRouteConfig) => {
    return new UploadBuilder<UploadBuilderParams>(config);
  };
  return f;
}

export { createRouteRegistry } from "./_internal/route-registry";

export type { FileRouter, FileRoute } from "./_internal/types";

// ─── Middleware Helpers ─────────────────────────────────────────────────────

export { getCookie, getBearerToken, getHeader } from "./_internal/middleware-helpers";

// ─── Route Handler ──────────────────────────────────────────────────────────

export interface RouteHandlerOptions {
  router: FileRouter;
  config: S3Config;
}

/**
 * Creates a framework-agnostic route handler for upload operations.
 *
 * Returns `{ GET, POST }` handlers that can be wired into any framework
 * (Next.js App Router, Express, Hono, etc.).
 *
 * @example
 * ```ts
 * import { createRouteHandler } from "@s3-good/core/server";
 *
 * const handler = createRouteHandler({
 *   router: uploadRouter,
 *   config: { region: "us-east-1", bucket: "my-bucket", ... },
 * });
 *
 * // Next.js App Router
 * export const { GET, POST } = handler;
 * ```
 */
export function createRouteHandler(opts: RouteHandlerOptions) {
  const handler = async (req: Request): Promise<Response> => {
    try {
      return await handleUploadAction(req, {
        router: opts.router,
        config: opts.config,
      });
    } catch (error) {
      if (error instanceof UploadError) {
        return Response.json(
          { error: { code: error.code, message: error.message } },
          { status: error.status },
        );
      }
      return Response.json(
        { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
        { status: 500 },
      );
    }
  };

  return { GET: handler, POST: handler };
}
