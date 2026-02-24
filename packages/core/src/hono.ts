/**
 * @s3-good/core/hono — Hono framework adapter
 *
 * Creates route handlers for Hono that bridge to the core upload handler.
 * Hono natively uses Web API Request/Response, making this the simplest
 * possible adapter — `c.req.raw` gives the standard Web `Request`.
 *
 * @module
 */

import type { FileRouter } from "./_internal/types";
import type { S3Config } from "@s3-good/shared";
import { handleUploadAction } from "./_internal/handler";
import type { BrowserBuilder } from "./_internal/browser-builder";
import { handleBrowserAction } from "./_internal/browser-handler";
import { errorToResponse } from "./_internal/error-response";
import { getRouteConfig } from "./_internal/get-route-config";
export { createBrowser } from "./server";

// Import Hono types only — no runtime dependency
import type { Context } from "hono";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HonoRouteHandlerOptions {
  router: FileRouter;
  config: S3Config;
}

export interface HonoBrowserRouteHandlerOptions {
  browser: BrowserBuilder<unknown>;
  config: S3Config;
}

// ─── Route Handler ──────────────────────────────────────────────────────────

/**
 * Creates a Hono route handler for file uploads.
 *
 * Returns `{ GET, POST }` handlers designed for use with Hono's routing.
 *
 * - **GET** — Returns route configuration (file types, limits) for client discovery.
 * - **POST** — Processes upload requests (presigned URL generation, multipart completion).
 *
 * @example
 * ```ts
 * // src/routes/upload.ts
 * import { Hono } from "hono";
 * import { createRouteHandler } from "@s3-good/core/hono";
 * import { uploadRouter } from "../server/upload-router";
 *
 * const app = new Hono();
 * const { GET, POST } = createRouteHandler({
 *   router: uploadRouter,
 *   config: {
 *     region: process.env.AWS_REGION!,
 *     bucket: process.env.AWS_BUCKET!,
 *     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
 *     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
 *   },
 * });
 *
 * app.get("/api/upload", (c) => GET(c));
 * app.post("/api/upload", (c) => POST(c));
 * ```
 */
export function createRouteHandler(opts: HonoRouteHandlerOptions) {
  const routerConfig = {
    router: opts.router,
    config: opts.config,
  };

  // GET handler — returns router configuration (for client discovery)
  async function GET(c: Context): Promise<Response> {
    const req = c.req.raw;
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    return getRouteConfig(opts.router, slug);
  }

  // POST handler — delegates to core handler
  async function POST(c: Context): Promise<Response> {
    try {
      return await handleUploadAction(c.req.raw, routerConfig);
    } catch (error) {
      return errorToResponse(error);
    }
  }

  return { GET, POST };
}

/**
 * Creates a Hono route handler for browser actions.
 */
export function createBrowserRouteHandler(opts: HonoBrowserRouteHandlerOptions) {
  const routeConfig = opts.browser._build();

  async function GET(c: Context): Promise<Response> {
    try {
      return await handleBrowserAction(c.req.raw, {
        route: routeConfig,
        config: opts.config,
      });
    } catch (error) {
      console.error("[s3-good/browser] Internal error:", error);
      return Response.json(
        { success: false, error: "Internal server error", action: "unknown" },
        { status: 500 },
      );
    }
  }

  async function POST(c: Context): Promise<Response> {
    try {
      return await handleBrowserAction(c.req.raw, {
        route: routeConfig,
        config: opts.config,
      });
    } catch (error) {
      console.error("[s3-good/browser] Internal error:", error);
      return Response.json(
        { success: false, error: "Internal server error", action: "unknown" },
        { status: 500 },
      );
    }
  }

  return { GET, POST };
}
