# @s3-good/core

Core package for `s3-good`: route builders, framework adapters, typed upload client, and S3 setup utilities.

## Installation

```bash
pnpm add @s3-good/core zod
```

## Entry points

| Import path | Use for |
| --- | --- |
| `@s3-good/core` | Root alias for server entrypoint |
| `@s3-good/core/server` | Route builder, framework-agnostic handlers, browser route builder |
| `@s3-good/core/client` | Typed upload client factory (`genUploader`) |
| `@s3-good/core/next` | Next.js server route handlers (`createRouteHandler`, `createBrowserRouteHandler`) |
| `@s3-good/core/next-client` | Next.js client helper factories (`generateUploadButton`, `generateUploadDropzone`, `generateNextHelpers`) |
| `@s3-good/core/hono` | Hono handlers |
| `@s3-good/core/sdk` | Bucket setup, CORS validation |
| `@s3-good/core/types` | Public type exports |

## Server API (`@s3-good/core/server`)

### `createUploader()`

```ts
import { createUploader, type FileRouter } from "@s3-good/core/server";
import { z } from "zod";

const f = createUploader();

export const uploadRouter = {
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 4 } })
    .middleware(async ({ req }) => {
      const userId = req.headers.get("x-user-id");
      if (!userId) throw new Error("Unauthorized");
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { ownerId: metadata.userId, key: file.key };
    }),

  docsUploader: f({ pdf: { maxFileSize: "16MB" } })
    .input(z.object({ folderId: z.string() }))
    .middleware(async ({ input }) => ({ folderId: input.folderId }))
    .onUploadComplete(async ({ metadata, file }) => ({
      folderId: metadata.folderId,
      url: file.url,
    })),
} satisfies FileRouter;
```

### `createRouteHandler({ router, config })`

Framework-agnostic upload handler that returns `{ GET, POST }`.

### `createBrowser()` and `createBrowserRouteHandler(...)`

Build and expose a browser API route (list/move/copy/delete/presigned preview URL).

```ts
import {
  createBrowser,
  createBrowserRouteHandler,
} from "@s3-good/core/server";

const browser = createBrowser()
  .buckets(["assets", "backups"])
  .defaultBucket("assets")
  .pageSize(100)
  .done();

export const { GET, POST } = createBrowserRouteHandler({
  browser,
  config: {
    region: process.env.AWS_REGION!,
    bucket: process.env.AWS_BUCKET!,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
```

### Middleware helpers

`getCookie(req, name)`, `getBearerToken(req)`, `getHeader(req, name)`.

## Client API (`@s3-good/core/client`)

### `genUploader<TRouter>({ url? })`

```ts
import { genUploader } from "@s3-good/core/client";
import type { OurFileRouter } from "~/server/upload-router";

const { uploadFiles, createUpload } = genUploader<OurFileRouter>({
  url: "/api/upload",
});

await uploadFiles("imageUploader", {
  files: [file],
  input: { folderId: "abc" },
  onUploadProgress: (progress) => {
    console.log(progress.percentage);
  },
});
```

## Next.js server adapter (`@s3-good/core/next`)

Use this in App Router route files.

```ts
// app/api/upload/route.ts
import { createRouteHandler } from "@s3-good/core/next";

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

```ts
// app/api/browser/route.ts
import { createBrowser, createBrowserRouteHandler } from "@s3-good/core/next";

const browser = createBrowser().done();

export const { GET, POST } = createBrowserRouteHandler({
  browser,
  config: {
    region: process.env.AWS_REGION!,
    bucket: process.env.AWS_BUCKET!,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
```

## Next.js client helpers (`@s3-good/core/next-client`)

These helpers are async and should be used in client-side modules.

```ts
"use client";

import type { OurFileRouter } from "~/server/upload-router";
import {
  generateUploadButton,
  generateUploadDropzone,
  generateNextHelpers,
} from "@s3-good/core/next-client";

export async function createUploadUi() {
  const UploadButton = await generateUploadButton<OurFileRouter>({
    url: "/api/upload",
  });
  const UploadDropzone = await generateUploadDropzone<OurFileRouter>();
  const helpers = await generateNextHelpers<OurFileRouter>();

  return { UploadButton, UploadDropzone, ...helpers };
}
```

## Hono adapter (`@s3-good/core/hono`)

```ts
import { Hono } from "hono";
import { createRouteHandler } from "@s3-good/core/hono";

const app = new Hono();
const { GET, POST } = createRouteHandler({ router: uploadRouter, config });

app.get("/api/upload", (c) => GET(c));
app.post("/api/upload", (c) => POST(c));
```

## SDK utilities (`@s3-good/core/sdk`)

- `setupBucket` - configure CORS/lifecycle defaults
- `validateBucketCors` - verify CORS rules
- `S3Api` - low-level helpers

## Quick usage

- Build server routes with `createUploader` and expose `GET`/`POST` via framework adapter.
- Use `genUploader` from `@s3-good/core/client` for typed uploads without React bindings.
- Keep route definitions and client helpers in shared typed modules.

## Edge cases

- Use provider-specific `endpoint` and `forcePathStyle` for S3-compatible services.
- For large files, prefer resumable/multipart route settings and verify bucket limits.
- If using `next-client` helpers, generate them only in client modules.

## Troubleshooting

- 404 on upload route: verify App Router path is `app/api/upload/route.ts`.
- Auth/signature errors: verify runtime env vars and bucket credentials.
- Browser failures: re-check bucket CORS and allowed headers.

## Compatibility

- Runtime: Node.js `>=20`.
- Adapters: Next.js App Router and Hono supported.
- Module formats: ESM and CJS entry points exposed via package exports.

## Security notes

- Keep AWS credentials server-side only.
- Use middleware for auth/authorization before presign and completion callbacks.
- Prefer scoped IAM policies limited to target bucket/prefixes.

## Environment variables

```bash
AWS_REGION=us-east-1
AWS_BUCKET=my-bucket
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## Notes

- `@s3-good/core/next` is server-only.
- `@s3-good/core/next-client` isolates client-side helper generation.
- For custom frontends, prefer `genUploader` or `generateReactHelpers` from `@s3-good/react`.

## License

MIT
