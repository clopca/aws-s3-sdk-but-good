# s3-good

Core package for `s3-good`: route builders, framework adapters, typed upload client, and S3 setup utilities.

## Installation

```bash
pnpm add s3-good zod
```

## Entry points

| Import path | Use for |
| --- | --- |
| `s3-good` | Server alias (same exports as `s3-good/server`) |
| `s3-good/server` | Route builder, framework-agnostic handlers, browser route builder |
| `s3-good/client` | Typed upload client factory (`genUploader`) + high-level queue client (`createS3GoodClient`) |
| `s3-good/next` | Next.js server route handlers (`createRouteHandler`, `createBrowserRouteHandler`) |
| `s3-good/next-client` | Next.js client helper factories (`generateUploadButton`, `generateUploadDropzone`, `generateNextHelpers`) |
| `s3-good/hono` | Hono handlers |
| `s3-good/sdk` | Bucket setup, CORS validation |
| `s3-good/types` | Public type exports |

## Server API (`s3-good/server`)

### `createUploader()`

```ts
import { createUploader, type FileRouter } from "s3-good/server";
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
} from "s3-good/server";

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

## Client API (`s3-good/client`)

### `genUploader<TRouter>({ url? })`

```ts
import { genUploader } from "s3-good/client";
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

### `createS3GoodClient<TRouter>({...})`

High-level browser upload client with queueing, retry policy, pause/resume/cancel, events, and optional persisted resume.

```ts
import { createS3GoodClient } from "s3-good/client";
import type { OurFileRouter } from "~/server/upload-router";

const client = createS3GoodClient<OurFileRouter>({
  url: "/api/upload",
  queue: { concurrency: 3, autoStart: true },
  retry: { maxAttempts: 4, baseDelayMs: 300, maxDelayMs: 3000, jitter: true },
  resume: { enabled: false, storageKey: "my-upload-queue" }, // opt-in
});

const handle = client.uploads.enqueueUpload("imageUploader", {
  files: [file],
});

handle.pause();
handle.resume();
handle.cancel();
await handle.result;
```

Available queue helpers:

- `uploads.enqueueUpload(...)`
- `uploads.getQueueState()`
- `uploads.pauseJob(jobId)`
- `uploads.resumeJob(jobId)`
- `uploads.cancelJob(jobId)`
- `uploads.resumePending()`

`events.subscribe(listener)` lets you observe lifecycle events.

## Next.js server adapter (`s3-good/next`)

Use this in App Router route files.

```ts
// app/api/upload/route.ts
import { createRouteHandler } from "s3-good/next";

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
import { createBrowser, createBrowserRouteHandler } from "s3-good/next";

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

## Next.js client helpers (`s3-good/next-client`)

These helpers are async and should be used in client-side modules.

```ts
"use client";

import type { OurFileRouter } from "~/server/upload-router";
import {
  generateUploadButton,
  generateUploadDropzone,
  generateNextHelpers,
} from "s3-good/next-client";

export async function createUploadUi() {
  const UploadButton = await generateUploadButton<OurFileRouter>({
    url: "/api/upload",
  });
  const UploadDropzone = await generateUploadDropzone<OurFileRouter>();
  const helpers = await generateNextHelpers<OurFileRouter>();

  return { UploadButton, UploadDropzone, ...helpers };
}
```

## Hono adapter (`s3-good/hono`)

```ts
import { Hono } from "hono";
import { createRouteHandler } from "s3-good/hono";

const app = new Hono();
const { GET, POST } = createRouteHandler({ router: uploadRouter, config });

app.get("/api/upload", (c) => GET(c));
app.post("/api/upload", (c) => POST(c));
```

## SDK utilities (`s3-good/sdk`)

- `setupBucket` - configure CORS/lifecycle defaults
- `validateBucketCors` - verify CORS rules
- `S3Api` - low-level helpers

## Environment variables

```bash
AWS_REGION=us-east-1
AWS_BUCKET=my-bucket
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## Notes

- `s3-good/next` is server-only.
- `s3-good/next-client` isolates client-side helper generation.
- For custom frontends, prefer `genUploader` or `generateReactHelpers` from `@s3-good/react`.

## License

MIT
