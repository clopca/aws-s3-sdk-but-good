# aws-s3-sdk-but-good

Type-safe file upload SDK backed by **your own AWS S3 bucket**. Type-safe from server to client, with drop-in React components and real-time progress tracking.

## Features

- **Your own S3 bucket** — no third-party storage, full control over your data
- **Type-safe from server to client** — endpoint names, inputs, and outputs are all inferred
- **Real-time upload progress** — track individual file progress with XHR-based uploads
- **Customizable React components** — `UploadButton` and `UploadDropzone` with full theming support
- **Drag & drop, paste, multi-file** — built-in UX patterns that work out of the box
- **Resumable uploads** — large files use S3 multipart uploads automatically
- **Generic auth middleware** — works with NextAuth, Clerk, custom JWT, or any auth system
- **S3-compatible** — works with MinIO, Cloudflare R2, DigitalOcean Spaces, and more

## Quick Start

### 1. Install

```bash
# Core SDK (server + client)
pnpm add @s3-good/core zod

# React components (optional)
pnpm add @s3-good/react
```

### 2. Define your upload router (server)

```typescript
// src/server/upload-router.ts
import { createUploader } from "@s3-good/core/server";
import type { FileRouter } from "@s3-good/core/server";

const f = createUploader();

export const uploadRouter = {
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 4 } })
    .middleware(async ({ req }) => {
      const userId = req.headers.get("x-user-id") ?? "anonymous";
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete:", metadata.userId, file.url);
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
```

### 3. Create an API route (Next.js)

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

### 4. Use in your React app

```tsx
// src/utils/upload.ts
import { generateReactHelpers } from "@s3-good/react";
import type { OurFileRouter } from "~/server/upload-router";

export const { useUpload, uploadFiles } =
  generateReactHelpers<OurFileRouter>();

// src/app/page.tsx
import { UploadButton } from "@s3-good/react";

export default function Page() {
  return (
    <UploadButton
      endpoint="imageUploader"
      onClientUploadComplete={(res) => {
        console.log("Files:", res);
      }}
      onUploadError={(error) => {
        console.error("Error:", error.message);
      }}
    />
  );
}
```

## Packages

| Package | Description | Docs |
|---------|-------------|------|
| [`@s3-good/core`](./packages/core) | Core SDK: upload builder, S3 integration, route handlers, client factory | [README](./packages/core/README.md) |
| [`@s3-good/react`](./packages/react) | React components (`UploadButton`, `UploadDropzone`) and hooks (`useUpload`) | [README](./packages/react/README.md) |
| [`@s3-good/shared`](./packages/shared) | Shared types, error classes, and utilities used by core and react | [README](./packages/shared/README.md) |

## Documentation

- [S3 Bucket Setup Guide](./docs/s3-setup.md) — bucket creation, CORS, IAM permissions, S3-compatible services
- [Example App](./examples/nextjs/) — full Next.js example with all upload patterns

## S3 Configuration

Before using the SDK, configure your S3 bucket with the required CORS rules. The easiest way is the built-in setup utility:

```typescript
import { setupBucket } from "@s3-good/core/sdk";

await setupBucket(
  {
    region: "us-east-1",
    bucket: "myapp-uploads",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  {
    allowedOrigins: ["https://myapp.com"],
  },
);
```

See the [S3 Setup Guide](./docs/s3-setup.md) for manual configuration, IAM policies, and troubleshooting.

## Environment Variables

```bash
AWS_REGION=us-east-1
AWS_BUCKET=myapp-uploads
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## License

MIT
