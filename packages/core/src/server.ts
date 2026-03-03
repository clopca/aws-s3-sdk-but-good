import { UploadBuilder } from "./_internal/upload-builder";
import type { UploadBuilderParams, FileRouter } from "./_internal/types";
import type { ExpandedRouteConfig, S3Config } from "./types";
import { handleUploadAction } from "./_internal/handler";
import { BrowserBuilder } from "./_internal/browser-builder";
import { handleBrowserAction } from "./_internal/browser-handler";
import { errorToResponse } from "./_internal/error-response";

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
 * import { createUploader } from "s3-good/server";
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

export interface BrowserRouteHandlerOptions {
  browser: BrowserBuilder<unknown>;
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
 * import { createRouteHandler } from "s3-good/server";
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
      return errorToResponse(error);
    }
  };

  return { GET: handler, POST: handler };
}

/**
 * Creates a browser route builder for configuring S3 browser behavior.
 */
export function createBrowser(): BrowserBuilder<unknown> {
  return new BrowserBuilder();
}

/**
 * Creates a framework-agnostic route handler for browser actions.
 */
export function createBrowserRouteHandler(opts: BrowserRouteHandlerOptions) {
  const route = opts.browser._build();

  const handler = async (req: Request): Promise<Response> => {
    return handleBrowserAction(req, {
      route,
      config: opts.config,
    });
  };

  return { GET: handler, POST: handler };
}
