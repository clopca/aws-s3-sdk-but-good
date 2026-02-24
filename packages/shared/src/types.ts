/**
 * S3 connection configuration.
 */
export interface S3Config {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** AWS session token (required for temporary credentials from STS/SSO) */
  sessionToken?: string;
  /** Custom endpoint for S3-compatible services (MinIO, R2, etc.) */
  endpoint?: string;
  /** Use path-style addressing (required for some S3-compatible services) */
  forcePathStyle?: boolean;
  /** Base URL for constructing public file URLs */
  baseUrl?: string;
  /** Optional dedicated signing secret for metadata tokens. Falls back to secretAccessKey. */
  signingSecret?: string;
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

// ---------------------------------------------------------------------------
// Browser Types
// ---------------------------------------------------------------------------

/**
 * Represents a file in the S3 browser.
 */
export interface BrowserFile {
  kind: "file";
  key: string;
  name: string;
  size: number;
  lastModified: Date;
  contentType: string;
  etag?: string;
}

/**
 * Represents a folder (common prefix) in the S3 browser.
 */
export interface BrowserFolder {
  kind: "folder";
  key: string;
  name: string;
}

/**
 * Union type for any item in the browser.
 */
export type BrowserItem = BrowserFile | BrowserFolder;

/**
 * View mode for the file browser.
 */
export type ViewMode = "grid" | "list";

/**
 * Sort field for browser items.
 */
export type SortField = "name" | "size" | "lastModified" | "contentType";

/**
 * Sort direction.
 */
export type SortDirection = "asc" | "desc";

/**
 * Sort configuration.
 */
export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface BrowserTagFilter {
  key: string;
  value: string;
}

export interface BrowserListFilters {
  search?: string;
  contentTypes?: string[];
  prefix?: string;
  /**
   * Reserved for future Athena/index-backed filtering.
   * Not supported in s3-list mode.
   */
  tags?: BrowserTagFilter[];
}

/**
 * Actions supported by the browser API.
 */
export type BrowserAction =
  | "list"
  | "delete"
  | "delete-many"
  | "rename"
  | "move"
  | "copy"
  | "create-folder"
  | "get-download-url"
  | "get-preview-url";

/**
 * Payload for browser action requests.
 */
export interface BrowserActionPayload {
  action: BrowserAction;
  /** Active bucket for this action. Defaults to route default bucket. */
  bucket?: string;
  /** Current path prefix (e.g. "photos/vacation/") */
  prefix?: string;
  /** Single target key for actions like delete/rename/copy */
  key?: string;
  /** Multiple target keys for bulk actions */
  keys?: string[];
  /** New file name for rename operations */
  newName?: string;
  /** Destination prefix or key for move/copy operations */
  destination?: string;
  /** Name for a newly created folder */
  folderName?: string;
  /** Pagination continuation token */
  continuationToken?: string;
  /** Search query for list action */
  search?: string;
  /** Structured list filters for browser list action */
  filters?: BrowserListFilters;
  /** Cursor token for paginated list responses */
  cursor?: string;
}

/**
 * Response from browser action requests.
 */
export interface BrowserActionResponse {
  action: BrowserAction;
  success: boolean;
  error?: string;
  items?: BrowserItem[];
  nextContinuationToken?: string;
  isTruncated?: boolean;
  url?: string;
  deleted?: string[];
  nextCursor?: string;
  meta?: {
    mode: "s3-list";
    bucket: string;
    buckets?: string[];
    defaultBucket?: string;
  };
}

/**
 * File types that can be previewed in the browser.
 */
export type PreviewType =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "code"
  | "json"
  | "csv"
  | "text"
  | "unknown";

function getLowerExtension(fileName: string): string {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".dockerfile")) return ".dockerfile";
  if (lowerName.endsWith(".gitignore")) return ".gitignore";
  if (lowerName.endsWith(".env")) return ".env";
  const dotIndex = lowerName.lastIndexOf(".");
  return dotIndex >= 0 ? lowerName.slice(dotIndex) : "";
}

/**
 * Resolve preview type from MIME and file extension.
 */
export function getPreviewType(
  contentType: string,
  fileName: string,
): PreviewType {
  const normalizedType = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  const extension = getLowerExtension(fileName);
  const imageExtensions = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".avif",
    ".bmp",
    ".ico",
    ".tif",
    ".tiff",
  ]);
  const videoExtensions = new Set([
    ".mp4",
    ".webm",
    ".ogg",
    ".ogv",
    ".mov",
    ".avi",
    ".mkv",
    ".m4v",
  ]);
  const audioExtensions = new Set([
    ".mp3",
    ".wav",
    ".flac",
    ".aac",
    ".oga",
    ".ogg",
    ".m4a",
    ".wma",
  ]);

  if (normalizedType.startsWith("image/") || imageExtensions.has(extension)) return "image";
  if (normalizedType.startsWith("video/") || videoExtensions.has(extension)) return "video";
  if (normalizedType.startsWith("audio/") || audioExtensions.has(extension)) return "audio";
  if (normalizedType === "application/pdf" || extension === ".pdf") return "pdf";
  if (normalizedType === "application/json" || extension === ".json") return "json";
  if (normalizedType === "text/csv" || extension === ".csv") return "csv";

  const codeExtensions = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".py",
    ".rb",
    ".go",
    ".rs",
    ".java",
    ".kt",
    ".swift",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".css",
    ".scss",
    ".less",
    ".html",
    ".xml",
    ".svg",
    ".yaml",
    ".yml",
    ".toml",
    ".ini",
    ".conf",
    ".sh",
    ".bash",
    ".zsh",
    ".fish",
    ".sql",
    ".graphql",
    ".gql",
    ".md",
    ".mdx",
    ".rst",
    ".dockerfile",
    ".env",
    ".gitignore",
  ]);

  if (codeExtensions.has(extension)) return "code";
  if (normalizedType.startsWith("text/")) return "text";
  return "unknown";
}

/**
 * Resolve language identifier for syntax highlighters from file extension.
 */
export function getCodeLanguage(fileName: string): string {
  const extension = getLowerExtension(fileName);
  const languageMap: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "tsx",
    ".js": "javascript",
    ".jsx": "jsx",
    ".py": "python",
    ".rb": "ruby",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".kt": "kotlin",
    ".swift": "swift",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".css": "css",
    ".scss": "scss",
    ".less": "less",
    ".html": "html",
    ".xml": "xml",
    ".svg": "xml",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
    ".json": "json",
    ".md": "markdown",
    ".mdx": "mdx",
    ".sh": "bash",
    ".bash": "bash",
    ".zsh": "bash",
    ".sql": "sql",
    ".graphql": "graphql",
    ".gql": "graphql",
    ".dockerfile": "dockerfile",
  };

  return languageMap[extension] ?? "plaintext";
}

/**
 * Configuration for browser UI/client behavior.
 */
export interface BrowserConfig {
  /** API endpoint URL for browser actions. */
  url?: string;
  /** Allowed buckets for this browser session. */
  buckets?: string[];
  /** Default active bucket. */
  defaultBucket?: string;
  /** Default view mode for initial render. */
  defaultView?: ViewMode;
  /** Default sort order for list/grid data. */
  defaultSort?: SortConfig;
  /** Whether to include hidden entries (prefixes/files starting with .). */
  showHidden?: boolean;
  /** Client-side page size hint. */
  pageSize?: number;
  /** Allowed browser actions. */
  allowedActions?: BrowserAction[];
  /** Restrict navigation to a root prefix. */
  rootPrefix?: string;
}
