/**
 * Middleware helper utilities for extracting authentication data from requests.
 *
 * These are optional convenience functions — users can extract auth however
 * they want from the standard `Request` object. The middleware pattern is
 * intentionally generic with no framework lock-in.
 *
 * @example NextAuth.js
 * ```typescript
 * import { getServerSession } from "next-auth";
 * import { authOptions } from "~/server/auth";
 *
 * .middleware(async ({ req }) => {
 *   // NextAuth reads cookies from the request
 *   const session = await getServerSession(authOptions);
 *   if (!session) throw new UploadError({ code: "MIDDLEWARE_ERROR", message: "Unauthorized" });
 *   return { userId: session.user.id };
 * })
 * ```
 *
 * @example Clerk
 * ```typescript
 * import { auth } from "@clerk/nextjs/server";
 *
 * .middleware(async ({ req }) => {
 *   const { userId } = await auth();
 *   if (!userId) throw new UploadError({ code: "MIDDLEWARE_ERROR", message: "Unauthorized" });
 *   return { userId };
 * })
 * ```
 *
 * @example Custom JWT
 * ```typescript
 * import { verify } from "jsonwebtoken";
 * import { getBearerToken } from "@s3-good/core/server";
 *
 * .middleware(async ({ req }) => {
 *   const token = getBearerToken(req);
 *   if (!token) throw new UploadError({ code: "MIDDLEWARE_ERROR", message: "No token" });
 *   const payload = verify(token, process.env.JWT_SECRET!);
 *   return { userId: payload.sub };
 * })
 * ```
 *
 * @module
 */

/**
 * Extract a cookie value from a Request by name.
 *
 * Parses the `Cookie` header and returns the value of the named cookie,
 * or `undefined` if the cookie is not present.
 *
 * @param req - Standard Web API Request object
 * @param name - Cookie name to extract
 * @returns The cookie value, or `undefined` if not found
 *
 * @example
 * ```typescript
 * import { getCookie } from "@s3-good/core/server";
 *
 * .middleware(async ({ req }) => {
 *   const sessionToken = getCookie(req, "session-token");
 *   if (!sessionToken) throw new UploadError({ code: "MIDDLEWARE_ERROR", message: "No session" });
 *   const user = await validateSession(sessionToken);
 *   return { userId: user.id };
 * })
 * ```
 */
export function getCookie(req: Request, name: string): string | undefined {
  const cookies = req.headers.get("cookie");
  if (!cookies) return undefined;
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match?.[1];
}

/**
 * Extract a Bearer token from the Authorization header.
 *
 * Returns the token string (without the "Bearer " prefix), or `undefined`
 * if the Authorization header is missing or does not use the Bearer scheme.
 *
 * @param req - Standard Web API Request object
 * @returns The bearer token string, or `undefined` if not found
 *
 * @example
 * ```typescript
 * import { getBearerToken } from "@s3-good/core/server";
 *
 * .middleware(async ({ req }) => {
 *   const token = getBearerToken(req);
 *   if (!token) throw new UploadError({ code: "MIDDLEWARE_ERROR", message: "No token" });
 *   const payload = await verifyJWT(token);
 *   return { userId: payload.sub };
 * })
 * ```
 */
export function getBearerToken(req: Request): string | undefined {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return undefined;
  return auth.slice(7);
}

/**
 * Extract any header value from a Request.
 *
 * A thin convenience wrapper around `req.headers.get()` that returns
 * `undefined` instead of `null` for missing headers, for consistency
 * with the other middleware helpers.
 *
 * @param req - Standard Web API Request object
 * @param name - Header name (case-insensitive)
 * @returns The header value, or `undefined` if not found
 *
 * @example
 * ```typescript
 * import { getHeader } from "@s3-good/core/server";
 *
 * .middleware(async ({ req }) => {
 *   const apiKey = getHeader(req, "x-api-key");
 *   if (!apiKey) throw new UploadError({ code: "MIDDLEWARE_ERROR", message: "Missing API key" });
 *   return { apiKey };
 * })
 * ```
 */
export function getHeader(req: Request, name: string): string | undefined {
  return req.headers.get(name) ?? undefined;
}
