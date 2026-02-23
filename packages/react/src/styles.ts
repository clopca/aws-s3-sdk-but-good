import type { CSSProperties } from "react";

// ─── UploadButton Default Styles ────────────────────────────────────────────

export const defaultButtonStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  } satisfies CSSProperties,

  button: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    backgroundColor: "#3b82f6",
    color: "white",
    padding: "8px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    border: "none",
    transition: "background-color 0.2s",
    minWidth: "120px",
  } satisfies CSSProperties,

  buttonDisabled: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    backgroundColor: "#93c5fd",
    color: "white",
    padding: "8px 20px",
    borderRadius: "8px",
    cursor: "not-allowed",
    fontSize: "14px",
    fontWeight: 500,
    border: "none",
    transition: "background-color 0.2s",
    minWidth: "120px",
  } satisfies CSSProperties,

  buttonUploading: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    backgroundColor: "#2563eb",
    color: "white",
    padding: "8px 20px",
    borderRadius: "8px",
    cursor: "default",
    fontSize: "14px",
    fontWeight: 500,
    border: "none",
    transition: "background-color 0.2s",
    minWidth: "120px",
  } satisfies CSSProperties,

  allowedContent: {
    color: "#6b7280",
    fontSize: "12px",
    marginTop: "2px",
  } satisfies CSSProperties,

  uploadButton: {
    backgroundColor: "#10b981",
    color: "white",
    padding: "6px 16px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    marginTop: "4px",
  } satisfies CSSProperties,
} as const;

// ─── UploadDropzone Default Styles ──────────────────────────────────────────

export const defaultDropzoneStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "32px 24px",
    border: "2px dashed #d1d5db",
    borderRadius: "12px",
    backgroundColor: "#f9fafb",
    cursor: "pointer",
    transition: "border-color 0.2s, background-color 0.2s",
    fontFamily: "system-ui, -apple-system, sans-serif",
    minHeight: "200px",
  } satisfies CSSProperties,

  containerDragOver: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  } satisfies CSSProperties,

  containerUploading: {
    borderColor: "#93c5fd",
    cursor: "default",
  } satisfies CSSProperties,

  containerDisabled: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "32px 24px",
    border: "2px dashed #e5e7eb",
    borderRadius: "12px",
    backgroundColor: "#f9fafb",
    cursor: "not-allowed",
    transition: "border-color 0.2s, background-color 0.2s",
    fontFamily: "system-ui, -apple-system, sans-serif",
    minHeight: "200px",
    opacity: 0.6,
  } satisfies CSSProperties,

  uploadIcon: {
    color: "#9ca3af",
    marginBottom: "4px",
  } satisfies CSSProperties,

  label: {
    fontSize: "14px",
    color: "#374151",
    textAlign: "center",
  } satisfies CSSProperties,

  allowedContent: {
    fontSize: "12px",
    color: "#9ca3af",
  } satisfies CSSProperties,

  button: {
    backgroundColor: "#3b82f6",
    color: "white",
    padding: "8px 20px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    marginTop: "8px",
  } satisfies CSSProperties,

  progressBar: {
    width: "100%",
    maxWidth: "300px",
    height: "6px",
    backgroundColor: "#e5e7eb",
    borderRadius: "3px",
    overflow: "hidden",
    marginTop: "8px",
  } satisfies CSSProperties,

  progressFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: "3px",
    transition: "width 0.3s ease",
  } satisfies CSSProperties,

  previewContainer: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: "8px",
  } satisfies CSSProperties,

  previewImage: {
    width: "64px",
    height: "64px",
    objectFit: "cover",
    borderRadius: "6px",
    border: "1px solid #e5e7eb",
  } satisfies CSSProperties,

  fileList: {
    fontSize: "12px",
    color: "#6b7280",
    textAlign: "center",
    marginTop: "4px",
  } satisfies CSSProperties,
} as const;

// ─── ProgressBar Default Styles ─────────────────────────────────────────────

export const defaultProgressBarStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    width: "100%",
    fontFamily: "system-ui, -apple-system, sans-serif",
  } satisfies CSSProperties,

  track: {
    width: "100%",
    height: "8px",
    backgroundColor: "#e5e7eb",
    borderRadius: "4px",
    overflow: "hidden",
  } satisfies CSSProperties,

  fill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: "4px",
    transition: "width 0.3s ease",
  } satisfies CSSProperties,

  fillComplete: {
    height: "100%",
    backgroundColor: "#10b981",
    borderRadius: "4px",
    transition: "width 0.3s ease",
  } satisfies CSSProperties,

  label: {
    fontSize: "12px",
    color: "#6b7280",
    textAlign: "right",
  } satisfies CSSProperties,
} as const;

// ─── FilePreview Default Styles ─────────────────────────────────────────────

export const defaultFilePreviewStyles = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    backgroundColor: "#ffffff",
    fontFamily: "system-ui, -apple-system, sans-serif",
  } satisfies CSSProperties,

  thumbnail: {
    width: "48px",
    height: "48px",
    objectFit: "cover",
    borderRadius: "6px",
    border: "1px solid #e5e7eb",
    flexShrink: 0,
  } satisfies CSSProperties,

  icon: {
    width: "48px",
    height: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "6px",
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
    flexShrink: 0,
  } satisfies CSSProperties,

  fileInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
    flex: 1,
  } satisfies CSSProperties,

  fileName: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#111827",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } satisfies CSSProperties,

  fileSize: {
    fontSize: "12px",
    color: "#6b7280",
  } satisfies CSSProperties,
} as const;

// ─── FileList Default Styles ────────────────────────────────────────────────

export const defaultFileListStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%",
    fontFamily: "system-ui, -apple-system, sans-serif",
  } satisfies CSSProperties,

  item: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    backgroundColor: "#ffffff",
  } satisfies CSSProperties,

  itemError: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #fca5a5",
    backgroundColor: "#fef2f2",
  } satisfies CSSProperties,

  itemComplete: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #86efac",
    backgroundColor: "#f0fdf4",
  } satisfies CSSProperties,

  itemInfo: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  } satisfies CSSProperties,

  itemName: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#111827",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } satisfies CSSProperties,

  itemSize: {
    fontSize: "12px",
    color: "#6b7280",
  } satisfies CSSProperties,

  itemStatus: {
    fontSize: "12px",
    fontWeight: 500,
    flexShrink: 0,
  } satisfies CSSProperties,

  removeButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#9ca3af",
    padding: "4px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  } satisfies CSSProperties,
} as const;

// ─── Dropzone Container Style Helper ────────────────────────────────────────

/**
 * Computes the merged container style for the dropzone based on the current
 * state (drag-over, uploading, disabled). Overlays state-specific styles on
 * top of the base container style.
 */
export function getDropzoneContainerStyle(opts: {
  ready: boolean;
  isDragOver: boolean;
  isUploading: boolean;
}): CSSProperties {
  if (!opts.ready) return defaultDropzoneStyles.containerDisabled;

  return {
    ...defaultDropzoneStyles.container,
    ...(opts.isDragOver ? defaultDropzoneStyles.containerDragOver : {}),
    ...(opts.isUploading ? defaultDropzoneStyles.containerUploading : {}),
  };
}

// ─── Tailwind Default Classes ───────────────────────────────────────────────

export const defaultButtonClasses = {
  container: "flex flex-col items-center gap-1",
  button: "inline-flex min-w-[120px] items-center justify-center gap-2 rounded-lg border-0 bg-blue-500 px-5 py-2 text-sm font-medium text-white transition-colors",
  buttonDisabled: "inline-flex min-w-[120px] items-center justify-center gap-2 rounded-lg border-0 bg-blue-300 px-5 py-2 text-sm font-medium text-white transition-colors cursor-not-allowed",
  buttonUploading: "inline-flex min-w-[120px] items-center justify-center gap-2 rounded-lg border-0 bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors cursor-default",
  allowedContent: "mt-0.5 text-xs text-slate-500",
  uploadButton: "mt-1 rounded-md border-0 bg-emerald-500 px-4 py-1.5 text-[13px] text-white",
  input: "hidden",
} as const;

export const defaultDropzoneClasses = {
  container: "flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 transition-colors",
  containerDragOver: "border-blue-500 bg-blue-50",
  containerUploading: "border-blue-300 cursor-default",
  containerDisabled: "flex min-h-[200px] cursor-not-allowed flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 opacity-60 transition-colors",
  uploadIcon: "mb-1 text-slate-400",
  label: "text-center text-sm text-slate-700",
  allowedContent: "text-xs text-slate-400",
  button: "mt-2 rounded-lg border-0 bg-blue-500 px-5 py-2 text-sm font-medium text-white",
  progressBar: "mt-2 h-1.5 w-full max-w-[300px] overflow-hidden rounded bg-slate-200",
  progressFill: "h-full rounded bg-blue-500 transition-[width] duration-300 ease-in-out",
  previewContainer: "mt-2 flex flex-wrap justify-center gap-2",
  previewImage: "h-16 w-16 rounded-md border border-slate-200 object-cover",
  fileList: "mt-1 text-center text-xs text-slate-500",
  input: "hidden",
} as const;

export function getDropzoneContainerClass(opts: {
  ready: boolean;
  isDragOver: boolean;
  isUploading: boolean;
}): string {
  if (!opts.ready) return defaultDropzoneClasses.containerDisabled;

  return [
    defaultDropzoneClasses.container,
    opts.isDragOver ? defaultDropzoneClasses.containerDragOver : "",
    opts.isUploading ? defaultDropzoneClasses.containerUploading : "",
  ].filter(Boolean).join(" ");
}

export const defaultProgressBarClasses = {
  container: "flex w-full flex-col gap-1",
  track: "h-2 w-full overflow-hidden rounded bg-slate-200",
  fill: "h-full rounded bg-blue-500 transition-[width] duration-300 ease-in-out",
  fillComplete: "h-full rounded bg-emerald-500 transition-[width] duration-300 ease-in-out",
  label: "text-right text-xs text-slate-500",
} as const;

export const defaultFilePreviewClasses = {
  container: "flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2",
  thumbnail: "h-12 w-12 shrink-0 rounded-md border border-slate-200 object-cover",
  icon: "flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500",
  fileInfo: "flex min-w-0 flex-1 flex-col gap-0.5",
  fileName: "truncate text-sm font-medium text-slate-900",
  fileSize: "text-xs text-slate-500",
} as const;

export const defaultFileListClasses = {
  container: "flex w-full flex-col gap-2",
  item: "flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5",
  itemError: "flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5",
  itemComplete: "flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 px-3 py-2.5",
  itemInfo: "flex min-w-0 flex-1 flex-col gap-1",
  itemName: "truncate text-sm font-medium text-slate-900",
  itemSize: "text-xs text-slate-500",
  itemStatus: "shrink-0 text-xs font-medium",
  itemStatusPending: "text-slate-500",
  itemStatusUploading: "text-blue-500",
  itemStatusComplete: "text-emerald-500",
  itemStatusError: "text-red-500",
  removeButton: "flex shrink-0 items-center justify-center rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600",
  errorText: "text-xs text-red-500",
} as const;
