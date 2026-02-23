import type { FileRouter } from "./_internal/types";
import type { S3Config } from "@s3-good/shared";
import { handleUploadAction } from "./_internal/handler";
import { UploadError } from "@s3-good/shared";
import type { BrowserBuilder } from "./_internal/browser-builder";
import { handleBrowserAction } from "./_internal/browser-handler";
export { createBrowser } from "./server";

// ─── Local Type Mirrors ─────────────────────────────────────────────────────
// These duplicate the minimal prop shapes needed for component generation.
// We avoid importing from @s3-good/react to prevent a cyclic dependency
// (core ↔ react) that breaks DTS generation and turbo build ordering.

interface LocalUploadButtonProps {
  endpoint: string;
  input?: Record<string, unknown>;
  onClientUploadComplete?: (res: unknown[]) => void;
  onUploadError?: (error: Error) => void;
  onUploadProgress?: (progress: number) => void;
  appearance?: Record<string, unknown>;
  content?: Record<string, unknown>;
  disabled?: boolean;
  mode?: "auto" | "manual";
  __internal?: { url?: string };
  [key: string]: unknown;
}

interface LocalUploadDropzoneProps extends LocalUploadButtonProps {
  onPaste?: boolean;
}

// ─── SSR Helpers ────────────────────────────────────────────────────────────

// NOTE: @s3-good/react is a peerDependency of @s3-good/core.
// These helpers use a dynamic require() to avoid a hard circular dependency
// at the module level. The react package is only loaded at runtime when
// these helpers are called.
//
// Circular path avoided: core/next → react → core/client

/** Lazily load @s3-good/react at runtime to avoid circular module deps. */
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const getReactPkg = (): any => require("@s3-good/react");

/**
 * Generates a pre-typed UploadButton component bound to a specific FileRouter.
 *
 * The returned component has the `endpoint` prop autocompleted with route names
 * from the provided FileRouter type, and the API URL pre-configured.
 *
 * @example
 * ```ts
 * import type { OurFileRouter } from "~/server/upload-router";
 * import { generateUploadButton } from "@s3-good/core/next";
 *
 * export const UploadButton = generateUploadButton<OurFileRouter>();
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function generateUploadButton<TRouter extends FileRouter>(opts?: {
  url?: string;
}) {
  const reactPkg = getReactPkg();
  const url = opts?.url ?? "/api/upload";

  // Return a typed component with the URL pre-bound via __internal
  function TypedUploadButton(
    props: Omit<LocalUploadButtonProps, "__internal">,
  ) {
    return reactPkg.UploadButton({
      ...props,
      __internal: { url },
    });
  }

  return TypedUploadButton;
}

/**
 * Generates a pre-typed UploadDropzone component bound to a specific FileRouter.
 *
 * The returned component has the `endpoint` prop autocompleted with route names
 * from the provided FileRouter type, and the API URL pre-configured.
 *
 * @example
 * ```ts
 * import type { OurFileRouter } from "~/server/upload-router";
 * import { generateUploadDropzone } from "@s3-good/core/next";
 *
 * export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function generateUploadDropzone<TRouter extends FileRouter>(opts?: {
  url?: string;
}) {
  const reactPkg = getReactPkg();
  const url = opts?.url ?? "/api/upload";

  function TypedUploadDropzone(
    props: Omit<LocalUploadDropzoneProps, "__internal">,
  ) {
    return reactPkg.UploadDropzone({
      ...props,
      __internal: { url },
    });
  }

  return TypedUploadDropzone;
}

/**
 * Convenience re-export of generateReactHelpers with Next.js defaults.
 *
 * Returns all React helpers (useUpload, uploadFiles, createUpload)
 * pre-configured with `/api/upload` as the default API URL.
 *
 * @example
 * ```ts
 * import type { OurFileRouter } from "~/server/upload-router";
 * import { generateNextHelpers } from "@s3-good/core/next";
 *
 * export const { useUpload, uploadFiles } =
 *   generateNextHelpers<OurFileRouter>();
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function generateNextHelpers<TRouter extends FileRouter>(
  opts?: { url?: string },
) {
  const reactPkg = getReactPkg();
  return reactPkg.generateReactHelpers({
    url: opts?.url ?? "/api/upload",
  });
}

// ─── Runtime Check ──────────────────────────────────────────────────────────

/**
 * Ensure we're in a server environment.
 * Throws immediately if called from a browser context.
 */
function assertServerEnvironment(): void {
  if (typeof window !== "undefined") {
    throw new Error(
      "[@s3-good/core/next] createRouteHandler must be used in a server environment. " +
        "Import from '@s3-good/core/next' only in API routes or server components.",
    );
  }
}

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
  assertServerEnvironment();

  const routerConfig = {
    router: opts.router,
    config: opts.config,
  };

  async function handleRequest(req: NextRequest): Promise<NextResponse> {
    try {
      return await handleUploadAction(req, routerConfig);
    } catch (error) {
      if (error instanceof UploadError) {
        return Response.json(
          { error: { code: error.code, message: error.message } },
          { status: error.status },
        );
      }
      console.error("[s3-good] Internal error:", error);
      return Response.json(
        { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
        { status: 500 },
      );
    }
  }

  // GET handler — returns router configuration (for client discovery)
  async function GET(req: NextRequest): Promise<NextResponse> {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      // Return all route configs (for client to know allowed file types)
      const routeConfigs = Object.entries(opts.router).reduce(
        (acc, [key, route]) => {
          acc[key] = {
            config: route._def.routerConfig,
          };
          return acc;
        },
        {} as Record<string, { config: unknown }>,
      );
      return Response.json(routeConfigs);
    }

    const route = opts.router[slug];
    if (!route) {
      return Response.json(
        { error: { code: "ROUTE_NOT_FOUND", message: `Route "${slug}" not found` } },
        { status: 404 },
      );
    }

    return Response.json({ config: route._def.routerConfig });
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
  assertServerEnvironment();

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
