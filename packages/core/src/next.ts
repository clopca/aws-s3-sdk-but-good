import type { FileRouter } from "./_internal/types";
import type { S3Config } from "@s3-good/shared";
import { handleUploadAction } from "./_internal/handler";
import type { BrowserBuilder } from "./_internal/browser-builder";
import { handleBrowserAction } from "./_internal/browser-handler";
import { errorToResponse } from "./_internal/error-response";
import { getRouteConfig } from "./_internal/get-route-config";
export { createBrowser } from "./server";
export type { FileRouter } from "./_internal/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NextRouteHandlerOptions {
  router: FileRouter;
  config: S3Config;
}

export interface NextBrowserRouteHandlerOptions {
  browser: BrowserBuilder<unknown>;
  config: S3Config;
}

type NextRequest = Request;
type NextResponse = Response;

// ─── Route Handler ──────────────────────────────────────────────────────────

/**
 * Creates a Next.js App Router route handler for file uploads.
 *
 * Returns `{ GET, POST }` handlers designed for use in a Next.js
 * `app/api/.../route.ts` file.
 *
 * - **GET** — Returns route configuration (file types, limits) for client discovery.
 * - **POST** — Processes upload requests (presigned URL generation, multipart completion).
 *
 * @example
 * ```ts
 * // app/api/upload/route.ts
 * import { createRouteHandler } from "@s3-good/core/next";
 * import { uploadRouter } from "~/server/upload-router";
 *
 * export const { GET, POST } = createRouteHandler({
 *   router: uploadRouter,
 *   config: {
 *     region: process.env.AWS_REGION!,
 *     bucket: process.env.AWS_BUCKET!,
 *     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
 *     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
 *   },
 * });
 * ```
 */
export function createRouteHandler(opts: NextRouteHandlerOptions) {
  const routerConfig = {
    router: opts.router,
    config: opts.config,
  };

  async function handleRequest(req: NextRequest): Promise<NextResponse> {
    try {
      return await handleUploadAction(req, routerConfig);
    } catch (error) {
      return errorToResponse(error);
    }
  }

  // GET handler — returns router configuration (for client discovery)
  async function GET(req: NextRequest): Promise<NextResponse> {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    return getRouteConfig(opts.router, slug);
  }

  // POST handler — processes upload requests
  async function POST(req: NextRequest): Promise<NextResponse> {
    return handleRequest(req);
  }

  return { GET, POST };
}

/**
 * Creates a Next.js App Router route handler for browser actions.
 */
export function createBrowserRouteHandler(opts: NextBrowserRouteHandlerOptions) {
  const routeConfig = opts.browser._build();

  async function handleRequest(req: NextRequest): Promise<NextResponse> {
    try {
      return await handleBrowserAction(req, {
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

  async function GET(req: NextRequest): Promise<NextResponse> {
    return handleRequest(req);
  }

  async function POST(req: NextRequest): Promise<NextResponse> {
    return handleRequest(req);
  }

  return { GET, POST };
}
