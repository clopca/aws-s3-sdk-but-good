# aws-s3-sdk-but-good (s3-good)

Type-safe uploads and file browsing for your own S3 bucket.

[![CI](https://github.com/clopca/aws-s3-sdk-but-good/actions/workflows/ci.yml/badge.svg)](https://github.com/clopca/aws-s3-sdk-but-good/actions/workflows/ci.yml)
[![Release](https://github.com/clopca/aws-s3-sdk-but-good/actions/workflows/release.yml/badge.svg)](https://github.com/clopca/aws-s3-sdk-but-good/actions/workflows/release.yml)

## Why this project

`s3-good` is designed for teams that want UploadThing-like DX while keeping storage and data ownership in their own AWS/S3-compatible infrastructure.

- End-to-end type safety (server routes, client calls, React helpers)
- First-class Next.js App Router support
- Optional UI packages for uploads and full file browser UX
- S3-compatible providers (AWS S3, MinIO, Cloudflare R2, Spaces)

## Packages

| Package | Purpose | README |
| --- | --- | --- |
| `@s3-good/core` | Upload routes, server/client adapters, S3 setup SDK | [packages/core/README.md](./packages/core/README.md) |
| `@s3-good/react` | Upload UI primitives and typed React helpers | [packages/react/README.md](./packages/react/README.md) |
| `@s3-good/browser` | Full S3 browser UI (list, preview, move/delete, upload) | [packages/browser/README.md](./packages/browser/README.md) |
| `@s3-good/shared` | Shared types, errors, and MIME/file utilities | [packages/shared/README.md](./packages/shared/README.md) |

## Quick start

### 1) Install

```bash
pnpm add @s3-good/core zod
pnpm add @s3-good/react # optional
pnpm add @s3-good/browser # optional
```

### 2) Define upload routes

```ts
// src/server/upload-router.ts
import { createUploader, type FileRouter } from "@s3-good/core/server";

const f = createUploader();

export const uploadRouter = {
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 4 } })
    .middleware(async ({ req }) => {
      const userId = req.headers.get("x-user-id") ?? "anonymous";
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { userId: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
```

### 3) Create Next.js upload route

```ts
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

### 4) Use React helpers

```ts
// src/lib/upload.ts
import { generateReactHelpers } from "@s3-good/react";
import type { OurFileRouter } from "~/server/upload-router";

export const { useUpload, uploadFiles } =
  generateReactHelpers<OurFileRouter>({ url: "/api/upload" });
```

### 5) Optional browser API + UI

```ts
// app/api/browser/route.ts
import { createBrowser, createBrowserRouteHandler } from "@s3-good/core/next";

const browser = createBrowser()
  .buckets(["my-default-bucket"])
  .defaultBucket("my-default-bucket")
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

```tsx
import { S3Browser } from "@s3-good/browser";

export default function FilesPage() {
  return <S3Browser url="/api/browser" />;
}
```

## Local development

### Requirements

- Node.js `>=20`
- `pnpm@9`

### Setup

```bash
pnpm install
```

### Common commands

```bash
pnpm build
pnpm test
pnpm lint
pnpm typecheck
pnpm size:check
```

### Package-scoped commands

```bash
pnpm --filter @s3-good/core test
pnpm --filter @s3-good/browser dev
pnpm --filter @s3-good/react build
```

## Documentation

- Product docs: [`/docs`](./docs)
- Architecture: [`docs/architecture.md`](./docs/architecture.md)
- Maintainer runbook: [`docs/maintainers.md`](./docs/maintainers.md)
- S3 setup guide: [`docs/src/content/docs/getting-started/s3-setup.mdx`](./docs/src/content/docs/getting-started/s3-setup.mdx)
- Next.js example app: [`/examples/nextjs`](./examples/nextjs)

## Versioning and releases

This repo uses Changesets for versioning/publishing.

```bash
pnpm changeset
pnpm version-packages
pnpm release
```

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a PR.

## Community

- Support: [SUPPORT.md](./SUPPORT.md)
- Code of Conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)

## Security

Please report vulnerabilities via [SECURITY.md](./SECURITY.md).

## License

MIT ([LICENSE](./LICENSE))
