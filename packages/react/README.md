# @s3-good/react

React components and hooks for building file upload UIs with `@s3-good/core`. Includes pre-built `UploadButton` and `UploadDropzone` components with full theming support, plus the `useUpload` hook for custom upload interfaces.

## Installation

```bash
pnpm add @s3-good/react @s3-good/core zod
```

**Peer dependencies**: `react >= 18.0.0`, `react-dom >= 18.0.0`

---

## `generateReactHelpers<TRouter>(opts?)`

The recommended way to use this package. Creates typed hooks and upload functions bound to your `FileRouter`.

```typescript
// src/utils/upload.ts
import { generateReactHelpers } from "@s3-good/react";
import type { OurFileRouter } from "~/server/upload-router";

export const { useUpload, uploadFiles, createUpload } =
  generateReactHelpers<OurFileRouter>({
    url: "/api/upload", // default
  });
```

### Returns

| Export | Type | Description |
|--------|------|-------------|
| `useUpload` | Hook | Typed hook with endpoint autocomplete and progress tracking |
| `uploadFiles` | Function | Imperative upload function for non-React contexts |
| `createUpload` | Function | Controllable upload handle with abort support |

---

## `UploadButton`

A file input button with built-in upload handling, progress display, and allowed file type hints.

### Basic Usage

```tsx
import { UploadButton } from "@s3-good/react";

function MyPage() {
  return (
    <UploadButton
      endpoint="imageUploader"
      onClientUploadComplete={(res) => {
        console.log("Uploaded files:", res);
      }}
      onUploadError={(error) => {
        console.error("Upload failed:", error.message);
      }}
    />
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `endpoint` | `string` | *required* | Name of the upload route to use |
| `input` | `object` | — | Typed input data (matches route's `.input()` schema) |
| `mode` | `"auto" \| "manual"` | `"auto"` | Auto-upload on file select, or wait for manual trigger |
| `disabled` | `boolean` | `false` | Disable the button |
| `onClientUploadComplete` | `(res: UploadFileResponse[]) => void` | — | Called when all files finish uploading |
| `onUploadError` | `(error: UploadError) => void` | — | Called on upload failure |
| `onUploadBegin` | `(fileName: string) => void` | — | Called when each file starts uploading |
| `onUploadProgress` | `(progress: number) => void` | — | Called with upload progress (0-100) |
| `headers` | `HeadersInit` | — | Custom headers sent with upload requests |
| `appearance` | `UploadButtonAppearance` | — | Theming object (see [Theming](#theming)) |
| `content` | `object` | — | Custom content for button text and allowed content text |
| `className` | `string` | — | CSS class applied to the container |

### Manual Mode

In manual mode, files are selected first, then uploaded with a separate button click:

```tsx
<UploadButton
  endpoint="imageUploader"
  mode="manual"
  onClientUploadComplete={(res) => console.log(res)}
/>
```

---

## `UploadDropzone`

A drag-and-drop zone with file previews, progress bar, and paste support.

### Basic Usage

```tsx
import { UploadDropzone } from "@s3-good/react";

function MyPage() {
  return (
    <UploadDropzone
      endpoint="imageUploader"
      onClientUploadComplete={(res) => {
        console.log("Uploaded files:", res);
      }}
      onUploadError={(error) => {
        console.error("Upload failed:", error.message);
      }}
    />
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `endpoint` | `string` | *required* | Name of the upload route to use |
| `input` | `object` | — | Typed input data (matches route's `.input()` schema) |
| `mode` | `"auto" \| "manual"` | `"auto"` | Auto-upload on drop/select, or wait for manual trigger |
| `disabled` | `boolean` | `false` | Disable the dropzone |
| `onPaste` | `boolean` | `false` | Enable paste-to-upload (listens on `document`) |
| `onClientUploadComplete` | `(res: UploadFileResponse[]) => void` | — | Called when all files finish uploading |
| `onUploadError` | `(error: UploadError) => void` | — | Called on upload failure |
| `onUploadBegin` | `(fileName: string) => void` | — | Called when each file starts uploading |
| `onUploadProgress` | `(progress: number) => void` | — | Called with upload progress (0-100) |
| `headers` | `HeadersInit` | — | Custom headers sent with upload requests |
| `appearance` | `UploadDropzoneAppearance` | — | Theming object (see [Theming](#theming)) |
| `content` | `object` | — | Custom content for icon, label, allowed content, and button |
| `className` | `string` | — | CSS class applied to the container |

### Features

- **Drag & drop** — drop files directly onto the zone
- **Click to browse** — click anywhere to open the file picker
- **Paste support** — enable with `onPaste` prop to upload from clipboard
- **Image previews** — dropped/selected images show thumbnail previews
- **Progress bar** — built-in progress indicator during upload
- **File list** — non-image files are listed by name and size

---

## `useUpload` Hook

For building fully custom upload UIs. Provides upload state, progress tracking, and abort capability.

### Basic Usage

```tsx
import { useUpload } from "@s3-good/react";
// Or use the typed version from generateReactHelpers:
// import { useUpload } from "~/lib/upload";

function CustomUploader() {
  const { startUpload, isUploading, progress, abort, permittedFileInfo } =
    useUpload("imageUploader", {
      onClientUploadComplete: (res) => {
        console.log("Done!", res);
      },
      onUploadError: (error) => {
        console.error(error.message);
      },
      onUploadProgress: (p) => {
        console.log(`${p}% complete`);
      },
    });

  return (
    <div>
      <input
        type="file"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) startUpload(files);
        }}
      />
      {isUploading && (
        <div>
          <progress value={progress} max={100} />
          <button onClick={abort}>Cancel</button>
        </div>
      )}
      {permittedFileInfo && (
        <p>Allowed: {permittedFileInfo.fileTypes.join(", ")}</p>
      )}
    </div>
  );
}
```

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `startUpload` | `(files: File[], input?) => Promise<UploadFileResponse[] \| undefined>` | Start uploading files |
| `isUploading` | `boolean` | Whether an upload is in progress |
| `progress` | `number` | Upload progress (0-100) |
| `abort` | `() => void` | Abort the current upload |
| `permittedFileInfo` | `PermittedFileInfo \| undefined` | Allowed file types and limits fetched from the server |

### Hook Options

| Option | Type | Description |
|--------|------|-------------|
| `onUploadBegin` | `(fileName: string) => void` | Called when each file starts uploading |
| `onUploadProgress` | `(progress: number) => void` | Called with progress percentage |
| `onClientUploadComplete` | `(res: UploadFileResponse[]) => void` | Called when all files finish |
| `onUploadError` | `(error: UploadError) => void` | Called on failure |
| `headers` | `HeadersInit \| (() => HeadersInit)` | Custom headers (can be async) |

---

## Theming

Both `UploadButton` and `UploadDropzone` support an `appearance` prop for full visual customization. Each element can be styled with CSS class names, inline styles, or dynamic functions.

### Style Field Types

```typescript
type StyleField<TContentOpts> =
  | string                                          // CSS class name
  | CSSProperties                                   // Inline styles (merged with defaults)
  | ((opts: TContentOpts) => string | CSSProperties); // Dynamic function
```

### UploadButton Appearance

```tsx
<UploadButton
  endpoint="imageUploader"
  appearance={{
    // CSS class name — replaces default inline styles
    container: "my-container",

    // Inline styles — merged with defaults
    button: { backgroundColor: "#10b981", borderRadius: "9999px" },

    // Dynamic function — receives content state
    allowedContent: (opts) =>
      opts.isUploading ? { color: "#3b82f6" } : { color: "#6b7280" },
  }}
/>
```

| Element | Description |
|---------|-------------|
| `container` | Outer wrapper div |
| `button` | The file input label (styled as a button) |
| `allowedContent` | "Allowed: image, pdf" text below the button |

### UploadDropzone Appearance

```tsx
<UploadDropzone
  endpoint="imageUploader"
  appearance={{
    container: { border: "2px dashed #3b82f6", borderRadius: "16px" },
    uploadIcon: { color: "#3b82f6" },
    label: "text-lg font-semibold",
    allowedContent: { fontSize: "11px" },
    button: { backgroundColor: "#10b981" },
  }}
/>
```

| Element | Description |
|---------|-------------|
| `container` | Outer dropzone wrapper |
| `uploadIcon` | Upload arrow icon |
| `label` | "Drag & drop files here" text |
| `allowedContent` | Allowed file types text |
| `button` | Manual upload button (shown in manual mode) |

### Custom Content

Override the default text and icons with the `content` prop:

```tsx
<UploadDropzone
  endpoint="imageUploader"
  content={{
    uploadIcon: <MyCustomIcon />,
    label: "Drop your photos here",
    allowedContent: (opts) =>
      opts.isUploading ? "Uploading..." : "PNG, JPG up to 4MB",
    button: (opts) =>
      `Upload ${opts.files.length} photo${opts.files.length !== 1 ? "s" : ""}`,
  }}
/>
```

### Data Attributes

Components expose `data-state` attributes for CSS targeting:

```css
/* UploadButton states */
[data-state="ready"] { }
[data-state="uploading"] { }
[data-state="disabled"] { }

/* UploadDropzone states */
[data-state="ready"] { }
[data-state="uploading"] { }
[data-state="dragover"] { }
[data-state="disabled"] { }
```

---

## Utility Exports

Additional exports for advanced theming and custom components:

```typescript
import {
  // Theming utilities
  resolveStyle,
  resolveClassName,
  renderContent,
  UploadIcon,

  // Default style objects
  defaultButtonStyles,
  defaultDropzoneStyles,
  getDropzoneContainerStyle,
} from "@s3-good/react";
```

## Type Exports

```typescript
import type {
  // Hook types
  UseUploadProps,
  UseUploadReturn,

  // Button types
  UploadButtonProps,
  UploadButtonAppearance,
  ButtonContentOpts,

  // Dropzone types
  UploadDropzoneProps,
  UploadDropzoneAppearance,
  DropzoneContentOpts,

  // Theming
  StyleField,
} from "@s3-good/react";
```

## Documentation

- [S3 Bucket Setup Guide](../../docs/s3-setup.md)
- [Example App](../../examples/nextjs/)

## License

MIT
