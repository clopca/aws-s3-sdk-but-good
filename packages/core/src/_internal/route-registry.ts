import type { FileRouter } from "./types";

/**
 * Creates an identity proxy that maps route names to themselves.
 * Enables "Go to Definition" in IDE — clicking a route name
 * navigates to the route definition.
 *
 * @example
 * const routeRegistry = createRouteRegistry(uploadRouter);
 * // routeRegistry.imageUploader → "imageUploader" (with Go-to-Definition)
 */
export function createRouteRegistry<TRouter extends FileRouter>(
  router: TRouter,
): { [K in keyof TRouter]: K } {
  const registry = {} as { [K in keyof TRouter]: K };
  for (const key of Object.keys(router)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (registry as any)[key] = key;
  }
  return registry;
}
