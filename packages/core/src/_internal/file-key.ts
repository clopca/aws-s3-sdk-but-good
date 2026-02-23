import Sqids from "sqids";

// ---------------------------------------------------------------------------
// File Key Generation — unique, URL-safe S3 object keys using sqids
// ---------------------------------------------------------------------------

const sqids = new Sqids({ minLength: 12 });
let counter = 0;

/**
 * Generates a unique, URL-safe S3 object key for a file.
 *
 * The key is built from a sqids-encoded combination of the current timestamp,
 * a monotonic counter, and a random value — guaranteeing uniqueness even under
 * high-throughput scenarios. The original file extension is preserved
 * (lowercased) for content-type detection.
 *
 * @example
 * ```ts
 * generateFileKey("photo.jpg");  // → "I6LJb0cXvlBlu.jpg"
 * generateFileKey("README");     // → "r8FdH3KuCYlrZi"
 * ```
 */
export function generateFileKey(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const id = sqids.encode([timestamp, counter++, random]);

  const lastDot = originalName.lastIndexOf(".");
  const ext =
    lastDot !== -1 ? originalName.slice(lastDot + 1).toLowerCase() : "";

  return ext ? `${id}.${ext}` : id;
}

// ---------------------------------------------------------------------------
// Batch Key Generation
// ---------------------------------------------------------------------------

/**
 * Generates unique file keys for an array of files in one call.
 *
 * @returns An array of objects mapping each original file name to its
 *          generated S3 key.
 *
 * @example
 * ```ts
 * generateFileKeys([{ name: "a.png" }, { name: "b.pdf" }]);
 * // → [{ name: "a.png", key: "..." }, { name: "b.pdf", key: "..." }]
 * ```
 */
export function generateFileKeys(
  files: Array<{ name: string }>,
): Array<{ name: string; key: string }> {
  return files.map((file) => ({
    name: file.name,
    key: generateFileKey(file.name),
  }));
}

// ---------------------------------------------------------------------------
// Key Validation
// ---------------------------------------------------------------------------

/**
 * Checks whether a string is a valid file key.
 *
 * A valid key consists of at least 12 URL-safe characters (alphanumeric,
 * underscore, or hyphen) optionally followed by a dot and an alphanumeric
 * extension.
 */
export function isValidFileKey(key: string): boolean {
  return /^[a-zA-Z0-9_-]{12,}(\.[a-zA-Z0-9]+)?$/.test(key);
}
