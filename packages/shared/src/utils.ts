import type { FileSize } from "./types";

const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;
const BYTES_PER_UNIT: Record<string, number> = {
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4,
};

/**
 * Formats a byte count into a human-readable string.
 *
 * @example
 * formatFileSize(2621440)  // "2.5 MB"
 * formatFileSize(1024)     // "1 KB"
 * formatFileSize(500)      // "500 B"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  // Find the largest unit where the value is >= 1
  let unitIndex = 0;
  let value = bytes;

  for (let i = SIZE_UNITS.length - 1; i >= 0; i--) {
    const unit = SIZE_UNITS[i] as (typeof SIZE_UNITS)[number];
    const unitBytes = BYTES_PER_UNIT[unit] ?? 1;
    if (bytes >= unitBytes) {
      unitIndex = i;
      value = bytes / unitBytes;
      break;
    }
  }

  const unit = SIZE_UNITS[unitIndex] ?? "B";

  // Use integer display when there's no fractional part
  const formatted = Number.isInteger(value)
    ? value.toString()
    : value.toFixed(2).replace(/\.?0+$/, "");

  return `${formatted} ${unit}`;
}

/**
 * Parses a `FileSize` string into bytes.
 *
 * @example
 * parseFileSize("4MB")   // 4194304
 * parseFileSize("512KB") // 524288
 * parseFileSize("1GB")   // 1073741824
 */
export function parseFileSize(size: FileSize): number {
  const match = /^(\d+(?:\.\d+)?)(B|KB|MB|GB|TB)$/.exec(size);
  if (!match) {
    throw new Error(`Invalid file size format: "${size}". Expected format: <number><B|KB|MB|GB|TB>`);
  }

  const value = Number(match[1]);
  const unit = match[2]!;
  const multiplier = BYTES_PER_UNIT[unit];

  if (multiplier === undefined) {
    throw new Error(`Unknown file size unit: "${unit}"`);
  }

  return Math.floor(value * multiplier);
}

/**
 * Generates a short, URL-safe unique identifier.
 *
 * Produces a 12-character hex string using `crypto.getRandomValues`
 * when available, falling back to `Math.random`.
 *
 * @example
 * generateId() // "a1b2c3d4e5f6"
 */
export function generateId(): string {
  const bytes = new Uint8Array(6);

  // crypto.getRandomValues is available in Node 19+ and all modern browsers
  if (typeof globalThis !== "undefined" && "crypto" in globalThis) {
    (globalThis as unknown as { crypto: { getRandomValues(a: Uint8Array): Uint8Array } })
      .crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Computes a Base64-encoded SHA-256 checksum of binary data.
 * Uses the Web Crypto API (available in all modern browsers and Node 18+).
 *
 * Accepts `ArrayBuffer` for maximum portability — callers should convert
 * `File`/`Blob` via `.arrayBuffer()` before calling.
 */
export async function computeSHA256(data: ArrayBuffer): Promise<string> {
  const subtle = (globalThis as unknown as { crypto: { subtle: { digest(algo: string, data: ArrayBuffer): Promise<ArrayBuffer> } } }).crypto.subtle;
  const hashBuffer = await subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hashBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  // btoa is available in all modern browsers and Node 16+
  return (globalThis as unknown as { btoa(s: string): string }).btoa(binary);
}
