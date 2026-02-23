import type { AllowedFileType } from "./types";

/**
 * Maps high-level file type categories to their MIME type patterns.
 */
const FILE_TYPE_MAP: Record<AllowedFileType, string[]> = {
  image: ["image/*"],
  video: ["video/*"],
  audio: ["audio/*"],
  pdf: ["application/pdf"],
  text: ["text/*"],
  blob: ["*/*"],
};

/**
 * Common file extension to MIME type mapping.
 */
const EXTENSION_MIME_MAP: Record<string, string> = {
  // Images
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
  bmp: "image/bmp",
  ico: "image/x-icon",
  tiff: "image/tiff",
  tif: "image/tiff",

  // Video
  mp4: "video/mp4",
  webm: "video/webm",
  ogg: "video/ogg",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",

  // Audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  aac: "audio/aac",
  oga: "audio/ogg",
  wma: "audio/x-ms-wma",

  // Documents
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  html: "text/html",
  css: "text/css",
  js: "text/javascript",
  json: "application/json",
  xml: "application/xml",
  md: "text/markdown",

  // Archives
  zip: "application/zip",
  gz: "application/gzip",
  tar: "application/x-tar",

  // Other
  bin: "application/octet-stream",
};

/**
 * Returns the list of accepted MIME type patterns for the given allowed types.
 *
 * @example
 * getAcceptedMimeTypes(["image", "pdf"]) // ["image/*", "application/pdf"]
 */
export function getAcceptedMimeTypes(allowedTypes: AllowedFileType[]): string[] {
  return allowedTypes.flatMap((type) => FILE_TYPE_MAP[type]);
}

/**
 * Checks whether a concrete MIME type matches any of the allowed file type categories.
 *
 * `blob` acts as a catch-all and matches every MIME type.
 *
 * @example
 * matchesFileType("image/jpeg", ["image"])  // true
 * matchesFileType("video/mp4", ["image"])   // false
 * matchesFileType("anything", ["blob"])     // true
 */
export function matchesFileType(
  fileType: string,
  allowedTypes: AllowedFileType[],
): boolean {
  const patterns = getAcceptedMimeTypes(allowedTypes);

  return patterns.some((pattern) => {
    // Catch-all
    if (pattern === "*/*") return true;

    // Exact match
    if (pattern === fileType) return true;

    // Wildcard match: "image/*" matches "image/jpeg"
    if (pattern.endsWith("/*")) {
      const category = pattern.slice(0, pattern.indexOf("/"));
      const fileCategory = fileType.slice(0, fileType.indexOf("/"));
      return category === fileCategory;
    }

    return false;
  });
}

/**
 * Extracts the file extension from a filename (without the leading dot).
 * Returns an empty string if no extension is found.
 *
 * @example
 * getFileExtension("photo.jpg")     // "jpg"
 * getFileExtension("archive.tar.gz") // "gz"
 * getFileExtension("README")         // ""
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === 0) return "";
  return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Returns the MIME type for a filename based on its extension.
 * Falls back to `"application/octet-stream"` for unknown extensions.
 *
 * @example
 * getMimeType("photo.jpg")  // "image/jpeg"
 * getMimeType("data.xyz")   // "application/octet-stream"
 */
export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename);
  if (!ext) return "application/octet-stream";
  return EXTENSION_MIME_MAP[ext] ?? "application/octet-stream";
}
