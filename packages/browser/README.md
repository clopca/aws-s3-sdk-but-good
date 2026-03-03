# @s3-good/browser

S3 file browser UI for listing, previewing, navigating, and managing objects.

## Installation

```bash
pnpm add @s3-good/browser
```

Import styles once:

```ts
import "@s3-good/browser/styles.css";
```

## Server route setup

`@s3-good/browser` expects a browser API endpoint (usually `/api/browser`).

### Next.js route

```ts
// app/api/browser/route.ts
import { createBrowser, createBrowserRouteHandler } from "s3-good/next";

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

## Basic UI usage

```tsx
import { S3Browser } from "@s3-good/browser";

export default function FilesPage() {
  return (
    <S3Browser
      url="/api/browser"
      config={{
        buckets: ["assets", "backups"],
        defaultBucket: "assets",
      }}
    />
  );
}
```

## Upload integration

You can wire uploads directly into the browser toolbar.

```tsx
<S3Browser
  url="/api/browser"
  upload={{
    endpoint: "mediaUploader",
    url: "/api/upload",
    multiple: true,
    label: "Upload",
  }}
/>;
```

Or provide your own uploader with `upload.onUploadFiles`.

## Performance options

### Virtualization

```tsx
<S3Browser
  virtualization={{
    grid: { enabled: true, threshold: 180, itemMinWidth: 140, rowHeight: 152, overscanRows: 2 },
    list: { enabled: true, threshold: 120, rowHeight: 46, overscan: 6 },
  }}
/>;
```

### Pagination

```tsx
<S3Browser
  pagination={{
    mode: "infinite", // or "manual"
    rootMargin: "240px 0px",
    threshold: 0,
  }}
/>;
```

## Theming and composition

### Appearance slots

```tsx
<S3Browser
  appearance={{
    container: "rounded-3xl",
    toolbar: "bg-muted/30",
    list: "shadow-none",
    loadMoreButton: "min-w-40",
  }}
/>;
```

### Headless composition with `S3BrowserRoot`

```tsx
import {
  S3BrowserRoot,
  BrowserToolbar,
  BrowserBreadcrumbs,
  BrowserSearchBar,
  BrowserFileView,
  BrowserSelectionBar,
  BrowserPreviewModal,
} from "@s3-good/browser";

<S3BrowserRoot url="/api/browser">
  <BrowserBreadcrumbs />
  <BrowserSearchBar />
  <BrowserToolbar />
  <BrowserFileView />
  <BrowserSelectionBar />
  <BrowserPreviewModal />
</S3BrowserRoot>;
```

## Main exports

- `S3Browser`
- `S3BrowserRoot`, `useS3BrowserContext`
- `useBrowser`, `createBrowserClient`, `createBrowserStore`
- utility exports: `getPreviewType`, `getCodeLanguage`

## License

MIT
