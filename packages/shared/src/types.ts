/**
 * S3 connection configuration.
 */
export interface S3Config {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Custom endpoint for S3-compatible services (MinIO, R2, etc.) */
  endpoint?: string;
  /** Use path-style addressing (required for some S3-compatible services) */
  forcePathStyle?: boolean;
  /** Base URL for constructing public file URLs */
  baseUrl?: string;
}

/**
 * Represents a file that has been uploaded to S3.
 */
export interface UploadedFile {
  key: string;
  url: string;
  name: string;
  size: number;
  type: string;
}

/**
 * Template literal type for file sizes with compile-time unit validation.
 * Examples: "4MB", "512KB", "1GB"
 */
export type FileSize = `${number}${"B" | "KB" | "MB" | "GB" | "TB"}`;

/**
 * Allowed high-level file type categories.
 * - `blob` is a catch-all that matches any MIME type.
 */
export type AllowedFileType =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "text"
  | "blob";

/**
 * Configuration for a single file type within a route.
 */
export interface FileRouteConfig {
  maxFileSize?: FileSize;
  maxFileCount?: number;
  minFileCount?: number;
  contentDisposition?: "inline" | "attachment";
}

/**
 * Maps allowed file types to their route-level configuration.
 */
export type ExpandedRouteConfig = Partial<Record<AllowedFileType, FileRouteConfig>>;

/**
 * Response returned after a successful file upload.
 */
export interface UploadFileResponse<TServerData = unknown> {
  key: string;
  url: string;
  name: string;
  size: number;
  type: string;
  serverData: TServerData;
}
