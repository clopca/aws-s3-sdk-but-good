import { UploadError } from "@s3-good-internal/shared";

/**
 * Convert an unknown error into a structured JSON `Response`.
 *
 * - `UploadError` instances produce a response with the error's code, message,
 *   and HTTP status.
 * - All other errors are logged and produce a generic 500 response.
 *
 * This is shared across all framework adapters (Next.js, Hono, generic server)
 * to avoid duplicating the same error-to-Response conversion logic.
 */
export function errorToResponse(error: unknown): Response {
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
