# @s3-good/react

React UI primitives and typed helpers for `@s3-good/core` upload routes.

## Installation

```bash
pnpm add @s3-good/react @s3-good/core zod
```

Peer dependencies:

- `react >= 18`
- `react-dom >= 18`

Import styles once in your app entry:

```tsx
import "@s3-good/react/styles.css";
```

## Recommended API: `generateReactHelpers`

```ts
import { generateReactHelpers } from "@s3-good/react";
import type { OurFileRouter } from "~/server/upload-router";

export const { useUpload, uploadFiles, createUpload } =
  generateReactHelpers<OurFileRouter>({
    url: "/api/upload", // default
  });
```

This gives:

- endpoint autocomplete from your `FileRouter`
- typed `input` values per endpoint
- typed `serverData` in responses

## Components

### `UploadButton`

```tsx
import { UploadButton } from "@s3-good/react";

<UploadButton
  endpoint="imageUploader"
  onClientUploadComplete={(files) => {
    console.log(files);
  }}
  onUploadError={(error) => {
    console.error(error.message);
  }}
/>;
```

### `UploadDropzone`

```tsx
import { UploadDropzone } from "@s3-good/react";

<UploadDropzone
  endpoint="imageUploader"
  onPaste
  onClientUploadComplete={(files) => {
    console.log(files);
  }}
/>;
```

### Component notes

- `endpoint` is required.
- `mode` supports `"auto"` and `"manual"`.
- `headers` can be static or function-based.
- `appearance` and `content` let you customize visuals/text without forking components.

## Hook API

### `useUpload`

```tsx
import { useUpload } from "~/lib/upload"; // from generateReactHelpers

function CustomUploader() {
  const { startUpload, isUploading, progress, abort, permittedFileInfo } =
    useUpload("imageUploader", {
      onUploadError: (error) => console.error(error.message),
    });

  return (
    <div>
      <input
        type="file"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) {
            void startUpload(files);
          }
        }}
      />
      {isUploading ? <progress max={100} value={progress} /> : null}
      <button type="button" onClick={abort}>Cancel</button>
      {permittedFileInfo ? <p>Allowed: {permittedFileInfo.fileTypes.join(", ")}</p> : null}
    </div>
  );
}
```

Returns:

- `startUpload(files, input?)`
- `isUploading`
- `progress` (0-100)
- `abort()`
- `permittedFileInfo`

## Lower-level exports

Also exported for custom UI compositions:

- `FileList`
- `FilePreview`
- `ProgressBar`
- style helpers (`resolveStyle`, `resolveClassName`, `cn`, variants)

## Next.js notes

- This package is client-side UI; use it from Client Components.
- Your server handlers still live in `@s3-good/core/next` route files.

If using a monorepo + Next.js, keep `transpilePackages` configured in `next.config.ts` when needed:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@s3-good/core", "@s3-good/react", "@s3-good/shared"],
};

export default nextConfig;
```

## License

MIT
