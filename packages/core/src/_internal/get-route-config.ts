import type { FileRouter } from "./types";

/**
 * Build the route configuration response for a GET request.
 *
 * - When `slug` is `undefined` (or `null`), returns **all** route configs
 *   so the client can discover allowed file types and limits.
 * - When `slug` is provided, returns the config for that single route,
 *   or a 404 `Response` if the route doesn't exist.
 *
 * Shared between the Next.js and Hono adapters to avoid duplicating the
 * same iteration / lookup logic.
 */
export function getRouteConfig(
  router: FileRouter,
  slug: string | null | undefined,
): Response {
  if (!slug) {
    // Return all route configs (for client to know allowed file types)
    const routeConfigs = Object.entries(router).reduce(
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

  const route = router[slug];
  if (!route) {
    return Response.json(
      { error: { code: "ROUTE_NOT_FOUND", message: `Route "${slug}" not found` } },
      { status: 404 },
    );
  }

  return Response.json({ config: route._def.routerConfig });
}
