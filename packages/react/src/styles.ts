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
