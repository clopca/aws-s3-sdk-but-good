import type { FileRouter, inferEndpoints } from "@s3-good/core/types";
import { genUploader } from "@s3-good/core/client";
import { useUpload, type UseUploadProps } from "./use-upload";

// ─── generateReactHelpers Options ───────────────────────────────────────────

export interface GenerateReactHelpersOptions {
  /**
   * The API endpoint URL for the upload handler.
   * @default "/api/upload"
   */
  url?: string;
}

// ─── generateReactHelpers Factory ───────────────────────────────────────────

/**
 * Creates typed React hooks and upload functions bound to a specific FileRouter.
 *
 * This is the recommended API for using @s3-good/react. The generic parameter
 * `TRouter` provides full type safety: endpoint names are autocompleted and
 * input/output types are inferred from the route definitions.
 *
 * @example
 * ```ts
 * import type { OurFileRouter } from "~/server/upload-router";
 *
 * export const { useUpload, uploadFiles, createUpload } =
 *   generateReactHelpers<OurFileRouter>();
 * ```
 */
export function generateReactHelpers<TRouter extends FileRouter>(
  opts?: GenerateReactHelpersOptions,
) {
  const url = opts?.url ?? "/api/upload";

  // Create typed hook bound to the router
  function useUploadTyped<TEndpoint extends inferEndpoints<TRouter>>(
    endpoint: TEndpoint,
    hookOpts?: Omit<UseUploadProps<TRouter, TEndpoint>, "endpoint">,
  ) {
    return useUpload<TRouter, TEndpoint>(endpoint, hookOpts, { url });
  }

  // Create typed upload functions from genUploader
  const { uploadFiles, createUpload } = genUploader<TRouter>({ url });

  return {
    useUpload: useUploadTyped,
    uploadFiles,
    createUpload,
  } as const;
}

// ─── Direct (untyped) exports for simple use cases ──────────────────────────

export { useUpload } from "./use-upload";

// ─── Components ─────────────────────────────────────────────────────────────

export { UploadButton } from "./components/button";
export { UploadDropzone } from "./components/dropzone";
export { FilePreview } from "./components/file-preview";
export { ProgressBar } from "./components/progress-bar";
export { FileList } from "./components/file-list";

// ─── Theming utilities ──────────────────────────────────────────────────────

export {
  resolveStyle,
  resolveClassName,
  renderContent,
  cn,
  UploadIcon,
} from "./components/shared";

export {
  defaultButtonClasses,
  uploadButtonVariants,
  defaultDropzoneClasses,
  uploadDropzoneVariants,
  defaultProgressBarClasses,
  progressBarFillVariants,
  defaultFilePreviewClasses,
  defaultFileListClasses,
  fileListItemVariants,
  fileListStatusVariants,
} from "./styles";

// ─── Type exports ───────────────────────────────────────────────────────────

export type { UseUploadProps, UseUploadReturn } from "./use-upload";

export type {
  UploadButtonProps,
  UploadButtonAppearance,
  ButtonContentOpts,
} from "./components/button";

export type {
  UploadDropzoneProps,
  UploadDropzoneAppearance,
  DropzoneContentOpts,
} from "./components/dropzone";

// FilePreview types
export type {
  FilePreviewProps,
  FilePreviewAppearance,
  FilePreviewContentOpts,
} from "./components/file-preview";

// ProgressBar types
export type {
  ProgressBarProps,
  ProgressBarAppearance,
  ProgressBarContentOpts,
} from "./components/progress-bar";

// FileList types
export type {
  FileListProps,
  FileListAppearance,
  FileListContentOpts,
  FileListItemContentOpts,
  FileItem,
  FileItemStatus,
} from "./components/file-list";

export type { StyleField } from "./components/shared";
