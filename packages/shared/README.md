# @s3-good-internal/shared

Shared runtime/types package used by `s3-good`, `@s3-good/react`, and `@s3-good/browser`.

Most users consume these exports transitively, but this package is useful directly for shared types, error handling, and MIME/file helpers.

## Installation

```bash
pnpm add @s3-good-internal/shared
```

## What it provides

- Shared domain types (`S3Config`, `UploadFileResponse`, browser types)
- Structured error classes (`UploadError`, `S3Error`)
- File type/MIME helpers (`getMimeType`, `matchesFileType`, `getAcceptedMimeTypes`)
- Generic utils (`formatFileSize`, `parseFileSize`, `generateId`, hashing helpers)

## Core types

### `S3Config`

```ts
interface S3Config {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  baseUrl?: string;
  signingSecret?: string;
}
```

### `UploadFileResponse<TServerData>`

```ts
interface UploadFileResponse<TServerData = unknown> {
  key: string;
  url: string;
  name: string;
  size: number;
  type: string;
  serverData: TServerData;
}
```

### Browser model types

Useful when building custom browser clients/UI:

- `BrowserItem`, `BrowserFile`, `BrowserFolder`
- `BrowserActionPayload`, `BrowserActionResponse`
- `BrowserConfig`, `SortConfig`, `ViewMode`

## Errors

### `UploadError`

```ts
import { UploadError } from "@s3-good-internal/shared";

throw new UploadError({
  code: "MIDDLEWARE_ERROR",
  message: "Unauthorized",
  status: 401,
});
```

Common codes include:

- `ROUTE_NOT_FOUND`
- `INVALID_FILE_TYPE`
- `FILE_TOO_LARGE`
- `TOO_MANY_FILES`
- `INPUT_VALIDATION_FAILED`
- `MIDDLEWARE_ERROR`
- `S3_ERROR`
- `UPLOAD_FAILED`

### `S3Error`

```ts
import { S3Error } from "@s3-good-internal/shared";

throw new S3Error("Failed to configure CORS", originalError);
```

## File type and MIME utilities

```ts
import {
  getAcceptedMimeTypes,
  matchesFileType,
  getFileExtension,
  getMimeType,
  getPreviewType,
  getCodeLanguage,
} from "@s3-good-internal/shared";

getAcceptedMimeTypes(["image", "pdf"]);
// ["image/*", "application/pdf"]

matchesFileType("image/jpeg", ["image"]);
// true

getMimeType("photo.jpg");
// "image/jpeg"

getPreviewType("application/octet-stream", "photo.png");
// "image"

getCodeLanguage("app.ts");
// "typescript"
```

## Generic utilities

```ts
import { formatFileSize, parseFileSize, generateId } from "@s3-good-internal/shared";

formatFileSize(2621440); // "2.5 MB"
parseFileSize("4MB");   // 4194304
generateId();            // short unique id
```

## License

MIT
