# @s3-good/browser

UI components and hooks to browse, preview, upload, and manage files in S3-compatible buckets.

## Installation

```bash
pnpm add @s3-good/browser
```

Import styles once in your app:

```ts
import "@s3-good/browser/styles.css";
```

## Quick Start

```tsx
import { S3Browser } from "@s3-good/browser";

export function FilesPage() {
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

## Upload Integration

```tsx
<S3Browser
  url="/api/browser"
  upload={{
    endpoint: "mediaUploader",
    url: "/api/upload",
    multiple: true,
    label: "Upload",
  }}
/>
```

You can also provide your own uploader via `upload.onUploadFiles`.

## Virtualization

Enable optional virtualization for large directories:

```tsx
<S3Browser
  virtualization={{
    grid: {
      enabled: true,
      threshold: 180,
      itemMinWidth: 140,
      rowHeight: 152,
      overscanRows: 2,
    },
    list: {
      enabled: true,
      threshold: 120,
      rowHeight: 46,
      overscan: 6,
    },
  }}
/>
```

## Appearance Slots

Use `appearance` to style specific areas without replacing behavior:

```tsx
<S3Browser
  appearance={{
    container: "rounded-3xl",
    toolbar: "bg-muted/30",
    grid: "p-2",
    loadMoreButton: "min-w-40",
    error: "text-sm",
  }}
/>
```

Notable slots include `grid`, `list`, `loadMoreContainer`, `loadMoreButton`, and dialog slots.

## Pagination

When the backend returns truncated list results, the browser shows a `Load more` control and requests the next page with the continuation token.

You can also enable automatic pagination:

```tsx
<S3Browser
  pagination={{
    mode: "infinite",
    rootMargin: "240px 0px",
    threshold: 0,
  }}
/>
```

## Main Exports

- `S3Browser`
- `useBrowser`
- `createBrowserClient`
- `createBrowserStore`
- `FileGridVirtualizationOptions`
- `FileListVirtualizationOptions`
