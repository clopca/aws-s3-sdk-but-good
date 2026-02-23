# @s3-good/shared

Shared types, error classes, and utility functions used internally by `@s3-good/core` and `@s3-good/react`. This package is a dependency of the other packages in the monorepo and is not typically installed directly.

## Installation

```bash
pnpm add @s3-good/shared
```

> **Note**: You usually don't need to install this package directly. It's included as a dependency of `@s3-good/core` and `@s3-good/react`. Types and errors are re-exported from `@s3-good/core/types` for convenience.

---

## Types

### `S3Config`

S3 connection configuration used by all server-side operations.

```typescript
interface S3Config {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;        // Custom endpoint for S3-compatible services
  forcePathStyle?: boolean;  // Required for some S3-compatible services
  baseUrl?: string;          // Base URL for constructing public file URLs
}
```

### `UploadedFile`

Metadata for a file that has been uploaded to S3.

```typescript
interface UploadedFile {
  key: string;   // S3 object key
  url: string;   // Public or presigned URL
  name: string;  // Original filename
  size: number;  // File size in bytes
  type: string;  // MIME type
}
```

### `UploadFileResponse<TServerData>`

Response returned after a successful upload, including server-side data.

```typescript
interface UploadFileResponse<TServerData = unknown> {
  key: string;
  url: string;
  name: string;
  size: number;
  type: string;
  serverData: TServerData;  // Data returned from onUploadComplete
}
```

### `FileSize`

Template literal type for file sizes with compile-time unit validation.

```typescript
type FileSize = `${number}${"B" | "KB" | "MB" | "GB" | "TB"}`;

// Valid: "4MB", "512KB", "1GB", "100B"
// Invalid: "4mb", "4 MB", "4MiB"
```

### `AllowedFileType`

High-level file type categories used in route configuration.

```typescript
type AllowedFileType = "image" | "video" | "audio" | "pdf" | "text" | "blob";
```

### `FileRouteConfig`

Configuration for a single file type within a route.

```typescript
interface FileRouteConfig {
  maxFileSize?: FileSize;
  maxFileCount?: number;
  minFileCount?: number;
  contentDisposition?: "inline" | "attachment";
}
```

### `ExpandedRouteConfig`

Maps allowed file types to their route-level configuration.

```typescript
type ExpandedRouteConfig = Partial<Record<AllowedFileType, FileRouteConfig>>;
```

---

## Error Classes

### `UploadError`

Structured error for upload operations with an error code and HTTP status.

```typescript
import { UploadError } from "@s3-good/shared";

throw new UploadError({
  code: "MIDDLEWARE_ERROR",
  message: "Unauthorized",
  status: 401, // optional — defaults based on code
});
```

#### Error Codes

| Code | Default Status | Description |
|------|---------------|-------------|
| `ROUTE_NOT_FOUND` | 404 | Upload route does not exist |
| `INVALID_FILE_TYPE` | 400 | File type not allowed by route config |
| `FILE_TOO_LARGE` | 400 | File exceeds `maxFileSize` |
| `TOO_MANY_FILES` | 400 | More files than `maxFileCount` |
| `TOO_FEW_FILES` | 400 | Fewer files than `minFileCount` |
| `INPUT_VALIDATION_FAILED` | 400 | Zod input validation failed |
| `MIDDLEWARE_ERROR` | 500 | Error thrown in middleware |
| `S3_ERROR` | 502 | AWS S3 operation failed |
| `UPLOAD_EXPIRED` | 410 | Presigned URL expired |
| `UPLOAD_FAILED` | 500 | Generic upload failure |
| `INTERNAL_ERROR` | 500 | Unexpected internal error |

### `S3Error`

Error originating from S3 operations, wrapping the original AWS error.

```typescript
import { S3Error } from "@s3-good/shared";

throw new S3Error("Failed to configure CORS", originalError);
```

---

## Utility Functions

### `formatFileSize(bytes)`

Formats a byte count into a human-readable string.

```typescript
import { formatFileSize } from "@s3-good/shared";

formatFileSize(2621440);  // "2.5 MB"
formatFileSize(1024);     // "1 KB"
formatFileSize(500);      // "500 B"
formatFileSize(0);        // "0 B"
```

### `parseFileSize(size)`

Parses a `FileSize` string into bytes.

```typescript
import { parseFileSize } from "@s3-good/shared";

parseFileSize("4MB");   // 4194304
parseFileSize("512KB"); // 524288
parseFileSize("1GB");   // 1073741824
```

### `generateId()`

Generates a short, URL-safe unique identifier (12-character hex string).

```typescript
import { generateId } from "@s3-good/shared";

generateId(); // "a1b2c3d4e5f6"
```

### `getAcceptedMimeTypes(allowedTypes)`

Returns MIME type patterns for the given allowed file type categories.

```typescript
import { getAcceptedMimeTypes } from "@s3-good/shared";

getAcceptedMimeTypes(["image", "pdf"]); // ["image/*", "application/pdf"]
```

### `matchesFileType(fileType, allowedTypes)`

Checks whether a MIME type matches any of the allowed file type categories.

```typescript
import { matchesFileType } from "@s3-good/shared";

matchesFileType("image/jpeg", ["image"]);  // true
matchesFileType("video/mp4", ["image"]);   // false
matchesFileType("anything", ["blob"]);     // true
```

### `getFileExtension(filename)`

Extracts the file extension from a filename.

```typescript
import { getFileExtension } from "@s3-good/shared";

getFileExtension("photo.jpg");      // "jpg"
getFileExtension("archive.tar.gz"); // "gz"
getFileExtension("README");         // ""
```

### `getMimeType(filename)`

Returns the MIME type for a filename based on its extension.

```typescript
import { getMimeType } from "@s3-good/shared";

getMimeType("photo.jpg");  // "image/jpeg"
getMimeType("data.xyz");   // "application/octet-stream"
```

## License

MIT
