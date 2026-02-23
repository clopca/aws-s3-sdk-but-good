# @s3-good/core

Core SDK for building type-safe file upload routes backed by your own AWS S3 bucket. Provides the server-side upload builder, client-side upload functions, Next.js integration, and S3 management utilities.

## Installation

```bash
pnpm add @s3-good/core zod
```

## Entry Points

| Import Path | Purpose |
|-------------|---------|
| `@s3-good/core/server` | Upload builder (`createUploader`), route handler, middleware helpers |
| `@s3-good/core/client` | Client-side upload functions (`genUploader`) |
| `@s3-good/core/next` | Next.js-specific route handler and component generators |
| `@s3-good/core/types` | TypeScript types and inference utilities |
| `@s3-good/core/sdk` | S3 bucket setup, CORS validation, and management |

---

## `@s3-good/core/server`

### `createUploader()`

Factory function that returns the `f()` builder for defining upload routes.

```typescript
import { createUploader } from "@s3-good/core/server";
import type { FileRouter } from "@s3-good/core/server";

const f = createUploader();

export const uploadRouter = {
  // Simple image uploader
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 4 } })
    .middleware(async ({ req }) => {
      const userId = req.headers.get("x-user-id") ?? "anonymous";
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete:", metadata.userId, file.url);
      return { url: file.url };
    }),

  // With Zod input validation
  documentUploader: f({
    pdf: { maxFileSize: "16MB" },
    text: { maxFileSize: "1MB" },
  })
    .input(
      z.object({
        category: z.string(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .middleware(async ({ input }) => {
      return { category: input.category, tags: input.tags ?? [] };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url, category: metadata.category };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
```

#### Builder Chain

| Method | Description |
|--------|-------------|
| `f(config)` | Define allowed file types and limits (`image`, `video`, `audio`, `pdf`, `text`, `blob`) |
| `.input(zodSchema)` | Add typed input validation with Zod |
| `.middleware(fn)` | Run server-side logic before upload (auth, validation). Return metadata. |
| `.onUploadComplete(fn)` | Handle successful uploads. Return data sent back to the client. |
| `.onUploadError(fn)` | Handle upload failures (optional). |

#### File Type Configuration

```typescript
f({
  image: {
    maxFileSize: "4MB",      // Max size per file
    maxFileCount: 4,          // Max number of files
    minFileCount: 1,          // Min number of files (optional)
    contentDisposition: "inline", // "inline" | "attachment"
  },
})
```

Supported file types: `image`, `video`, `audio`, `pdf`, `text`, `blob` (catch-all).

### `createRouteHandler(opts)`

Creates a framework-agnostic route handler. Returns `{ GET, POST }` handlers.

```typescript
import { createRouteHandler } from "@s3-good/core/server";

const handler = createRouteHandler({
  router: uploadRouter,
  config: {
    region: "us-east-1",
    bucket: "myapp-uploads",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Wire into any framework that supports Web API Request/Response
export const { GET, POST } = handler;
```

### Middleware Helpers

Optional convenience functions for extracting auth data from requests:

```typescript
import { getCookie, getBearerToken, getHeader } from "@s3-good/core/server";

// Extract a cookie
const sessionToken = getCookie(req, "session-token");

// Extract a Bearer token from the Authorization header
const jwt = getBearerToken(req);

// Extract any header
const apiKey = getHeader(req, "x-api-key");
```

#### Auth Examples

```typescript
// NextAuth.js
.middleware(async ({ req }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw new UploadError({ code: "MIDDLEWARE_ERROR", message: "Unauthorized" });
  return { userId: session.user.id };
})

// Clerk
.middleware(async ({ req }) => {
  const { userId } = await auth();
  if (!userId) throw new UploadError({ code: "MIDDLEWARE_ERROR", message: "Unauthorized" });
  return { userId };
})

// Custom JWT
.middleware(async ({ req }) => {
  const token = getBearerToken(req);
  if (!token) throw new UploadError({ code: "MIDDLEWARE_ERROR", message: "No token" });
  const payload = verify(token, process.env.JWT_SECRET!);
  return { userId: payload.sub };
})
```

---

## `@s3-good/core/client`

### `genUploader<TRouter>(opts?)`

Creates typed client-side upload functions bound to your `FileRouter`.

```typescript
import { genUploader } from "@s3-good/core/client";
import type { OurFileRouter } from "~/server/upload-router";

const { uploadFiles, createUpload } = genUploader<OurFileRouter>({
  url: "/api/upload", // default
});
```

#### `uploadFiles(endpoint, opts)`

Upload files to a specific endpoint. Handles the full flow: presigned URL request, S3 upload with progress, and server completion notification.

```typescript
const result = await uploadFiles("imageUploader", {
  files: [file],
  input: { category: "avatar" },  // Typed based on your route's .input() schema
  onUploadBegin: (fileName) => console.log("Starting:", fileName),
  onUploadProgress: (progress) => console.log(`${progress.percentage}%`),
  headers: { "x-user-id": "user_123" },
  signal: abortController.signal,
});

// result: UploadFileResponse[]
// { key, url, name, size, type, serverData }
```

#### `createUpload(endpoint, opts)`

Create a controllable upload handle with deferred start and abort capability.

```typescript
const upload = createUpload("imageUploader", {
  files: [file],
  onUploadProgress: (p) => setProgress(p.percentage),
});

// Start when ready
const result = await upload.done();

// Or abort
upload.abort();
```

---

## `@s3-good/core/next`

Next.js-specific integration with App Router support and typed component generators.

### `createRouteHandler(opts)`

Creates a Next.js App Router route handler with server environment validation.

```typescript
// app/api/upload/route.ts
import { createRouteHandler } from "@s3-good/core/next";
import { uploadRouter } from "~/server/upload-router";

export const { GET, POST } = createRouteHandler({
  router: uploadRouter,
  config: {
    region: process.env.AWS_REGION!,
    bucket: process.env.AWS_BUCKET!,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
```

### `generateUploadButton<TRouter>(opts?)`

Generates a pre-typed `UploadButton` component with endpoint autocomplete.

```typescript
import type { OurFileRouter } from "~/server/upload-router";
import { generateUploadButton } from "@s3-good/core/next";

export const UploadButton = generateUploadButton<OurFileRouter>();
```

### `generateUploadDropzone<TRouter>(opts?)`

Generates a pre-typed `UploadDropzone` component with endpoint autocomplete.

```typescript
import type { OurFileRouter } from "~/server/upload-router";
import { generateUploadDropzone } from "@s3-good/core/next";

export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
```

### `generateNextHelpers<TRouter>(opts?)`

Convenience wrapper that returns all React helpers pre-configured for Next.js.

```typescript
import type { OurFileRouter } from "~/server/upload-router";
import { generateNextHelpers } from "@s3-good/core/next";

export const { useUpload, uploadFiles, createUpload } =
  generateNextHelpers<OurFileRouter>();
```

---

## `@s3-good/core/types`

TypeScript types and inference utilities for working with file routers.

```typescript
import type {
  FileRouter,
  FileRoute,
  S3Config,
  UploadedFile,
  UploadFileResponse,
  FileSize,
  AllowedFileType,
  ExpandedRouteConfig,
  FileRouteConfig,
  inferEndpointInput,
  inferEndpointOutput,
  inferEndpoints,
  inferServerData,
  inferMetadata,
  PermittedFileInfo,
} from "@s3-good/core/types";

// Error classes
import { UploadError, S3Error } from "@s3-good/core/types";
```

### Key Types

| Type | Description |
|------|-------------|
| `FileRouter` | Record of named `FileRoute` definitions |
| `FileRoute` | A single upload route with config, middleware, and callbacks |
| `S3Config` | S3 connection configuration (region, bucket, credentials) |
| `UploadedFile` | File metadata after upload (key, url, name, size, type) |
| `UploadFileResponse<T>` | Upload result including `serverData` from `onUploadComplete` |
| `FileSize` | Template literal type for file sizes (`"4MB"`, `"512KB"`, `"1GB"`) |
| `AllowedFileType` | `"image" \| "video" \| "audio" \| "pdf" \| "text" \| "blob"` |
| `inferEndpoints<TRouter>` | Infer endpoint names as string literal union |
| `inferEndpointInput<TRouter, TEndpoint>` | Infer the input type for an endpoint |
| `inferEndpointOutput<TRouter, TEndpoint>` | Infer the output type for an endpoint |

---

## `@s3-good/core/sdk`

S3 bucket management utilities for setup and validation.

### `S3Api`

High-level class-based API for S3 operations.

```typescript
import { S3Api } from "@s3-good/core/sdk";

const s3 = new S3Api({
  region: "us-east-1",
  bucket: "myapp-uploads",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
});

// Get a public URL for a file
const url = s3.getFileUrl("uploads/photo.jpg");

// Get a presigned download URL (expires in 1 hour by default)
const signedUrl = await s3.getSignedUrl("uploads/photo.jpg", 3600);

// Configure bucket CORS and lifecycle rules
await s3.setupBucket({ allowedOrigins: ["https://myapp.com"] });

// Validate CORS configuration
const { isValid, issues } = await s3.validateCors();
```

### `setupBucket(config, opts?)`

Configures an S3 bucket with CORS rules and lifecycle policies. Run once during project setup.

```typescript
import { setupBucket } from "@s3-good/core/sdk";

const result = await setupBucket(
  {
    region: "us-east-1",
    bucket: "myapp-uploads",
    accessKeyId: "AKIA...",
    secretAccessKey: "...",
  },
  {
    allowedOrigins: ["https://myapp.com"], // default: ["*"]
    multipartExpiryDays: 1,                // default: 1
  },
);
// result: { cors: true, lifecycle: true }
```

### `validateBucketCors(config)`

Validates that a bucket has the required CORS configuration for browser uploads.

```typescript
import { validateBucketCors } from "@s3-good/core/sdk";

const { isValid, issues } = await validateBucketCors({
  region: "us-east-1",
  bucket: "myapp-uploads",
  accessKeyId: "AKIA...",
  secretAccessKey: "...",
});

if (!isValid) {
  console.error("CORS issues:", issues);
}
```

---

## S3-Compatible Services

The SDK works with any S3-compatible storage. Pass `endpoint` and `forcePathStyle`:

```typescript
// MinIO
const config: S3Config = {
  region: "us-east-1",
  bucket: "myapp-uploads",
  accessKeyId: "minioadmin",
  secretAccessKey: "minioadmin",
  endpoint: "http://localhost:9000",
  forcePathStyle: true,
};

// Cloudflare R2
const config: S3Config = {
  region: "auto",
  bucket: "myapp-uploads",
  accessKeyId: "...",
  secretAccessKey: "...",
  endpoint: "https://<ACCOUNT_ID>.r2.cloudflarestorage.com",
};
```

## Documentation

- [S3 Bucket Setup Guide](../../docs/s3-setup.md)
- [Example App](../../examples/nextjs/)

## License

MIT
