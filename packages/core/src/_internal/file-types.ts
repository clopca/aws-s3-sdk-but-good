import type {
  AllowedFileType,
  ExpandedRouteConfig,
  FileRouteConfig,
} from "@s3-good-internal/shared";
import {
  getAcceptedMimeTypes,
  matchesFileType,
  parseFileSize,
  formatFileSize,
} from "@s3-good-internal/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileValidationResult {
  isValid: boolean;
  error?: {
    code: string;
    message: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Finds the matching {@link FileRouteConfig} entry for a given MIME type
 * within an {@link ExpandedRouteConfig}.
 *
 * Resolution order:
 * 1. Exact category match (e.g. `"image/jpeg"` → `image` key)
 * 2. `blob` catch-all (matches any MIME type)
 */
function findMatchingType(
  fileType: string,
  routeConfig: ExpandedRouteConfig,
): FileRouteConfig | undefined {
  const keys = Object.keys(routeConfig) as AllowedFileType[];

  for (const key of keys) {
    // `blob` is handled last as a fallback
    if (key === "blob") continue;

    if (matchesFileType(fileType, [key])) {
      return routeConfig[key];
    }
  }

  // Fall back to blob if present
  if (routeConfig.blob !== undefined) {
    return routeConfig.blob;
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Single-file validation
// ---------------------------------------------------------------------------

/**
 * Validates a single file against an expanded route configuration.
 *
 * Checks:
 * 1. File type is among the allowed types
 * 2. File size does not exceed the per-type `maxFileSize`
 */
export function validateFileForRoute(
  file: { name: string; size: number; type: string },
  routeConfig: ExpandedRouteConfig,
): FileValidationResult {
  // 1. Type check
  const allowedTypes = Object.keys(routeConfig) as AllowedFileType[];
  if (!matchesFileType(file.type, allowedTypes)) {
    return {
      isValid: false,
      error: {
        code: "INVALID_FILE_TYPE",
        message: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
      },
    };
  }

  // 2. Size check
  const matchingConfig = findMatchingType(file.type, routeConfig);
  if (matchingConfig?.maxFileSize) {
    const maxBytes = parseFileSize(matchingConfig.maxFileSize);
    if (file.size > maxBytes) {
      return {
        isValid: false,
        error: {
          code: "FILE_TOO_LARGE",
          message: `File "${file.name}" (${formatFileSize(file.size)}) exceeds the ${matchingConfig.maxFileSize} limit`,
        },
      };
    }
  }

  return { isValid: true };
}

// ---------------------------------------------------------------------------
// Batch validation
// ---------------------------------------------------------------------------

/**
 * Validates a batch of files against an expanded route configuration.
 *
 * Checks (in order):
 * 1. Total file count against the **aggregate** `maxFileCount` / `minFileCount`
 *    across all type entries in the config.
 * 2. Each individual file via {@link validateFileForRoute}.
 *
 * Defaults:
 * - `maxFileCount` defaults to **1** when not specified.
 * - `minFileCount` defaults to **1** when not specified.
 */
export function validateFilesForRoute(
  files: { name: string; size: number; type: string }[],
  routeConfig: ExpandedRouteConfig,
): FileValidationResult {
  // Compute aggregate limits from all type entries
  let totalMaxFileCount = 0;
  let totalMinFileCount = 0;

  const entries = Object.values(routeConfig);
  for (const config of entries) {
    if (!config) continue;
    totalMaxFileCount += config.maxFileCount ?? 1;
    totalMinFileCount += config.minFileCount ?? 1;
  }

  // 1. Check file count
  if (files.length > totalMaxFileCount) {
    return {
      isValid: false,
      error: {
        code: "TOO_MANY_FILES",
        message: `Too many files. Expected at most ${totalMaxFileCount}, got ${files.length}`,
      },
    };
  }

  if (files.length < totalMinFileCount) {
    return {
      isValid: false,
      error: {
        code: "TOO_FEW_FILES",
        message: `Too few files. Expected at least ${totalMinFileCount}, got ${files.length}`,
      },
    };
  }

  // 2. Validate each file individually
  for (const file of files) {
    const result = validateFileForRoute(file, routeConfig);
    if (!result.isValid) {
      return result;
    }
  }

  return { isValid: true };
}

// ---------------------------------------------------------------------------
// Accept string conversion
// ---------------------------------------------------------------------------

/**
 * Converts an {@link ExpandedRouteConfig} into a string suitable for the
 * HTML `<input accept="…">` attribute.
 *
 * @example
 * routeConfigToAcceptString({ image: {}, pdf: {} })
 * // → "image/*,application/pdf"
 *
 * routeConfigToAcceptString({ blob: {} })
 * // → "" (empty string = accept all)
 */
export function routeConfigToAcceptString(
  routeConfig: ExpandedRouteConfig,
): string {
  const allowedTypes = Object.keys(routeConfig) as AllowedFileType[];

  // blob means accept everything — return empty string so the browser
  // doesn't restrict the file picker.
  if (allowedTypes.includes("blob")) {
    return "";
  }

  return getAcceptedMimeTypes(allowedTypes).join(",");
}
