import type { FileRouter } from "s3-good/types";
import type { UploadButtonProps } from "./components/button";
import type { UploadDropzoneProps } from "./components/dropzone";
import { UploadButton } from "./components/button";
import { UploadDropzone } from "./components/dropzone";
import { generateReactHelpers } from "./index";

// ─── generateUploadButton ───────────────────────────────────────────────────

/**
 * Creates a pre-configured UploadButton component bound to a specific URL.
 *
 * @example
 * ```ts
 * import type { OurFileRouter } from "~/server/upload-router";
 * const UploadButton = generateUploadButton<OurFileRouter>();
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function generateUploadButton<TRouter extends FileRouter>(opts?: {
  url?: string;
}) {
  const url = opts?.url ?? "/api/upload";

  function TypedUploadButton(
    props: Omit<UploadButtonProps<TRouter, never>, "__internal">,
  ) {
    return UploadButton({
      ...props,
      __internal: { url },
    } as UploadButtonProps<TRouter, never>);
  }

  return TypedUploadButton;
}

// ─── generateUploadDropzone ─────────────────────────────────────────────────

/**
 * Creates a pre-configured UploadDropzone component bound to a specific URL.
 *
 * @example
 * ```ts
 * import type { OurFileRouter } from "~/server/upload-router";
 * const UploadDropzone = generateUploadDropzone<OurFileRouter>();
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function generateUploadDropzone<TRouter extends FileRouter>(opts?: {
  url?: string;
}) {
  const url = opts?.url ?? "/api/upload";

  function TypedUploadDropzone(
    props: Omit<UploadDropzoneProps<TRouter, never>, "__internal">,
  ) {
    return UploadDropzone({
      ...props,
      __internal: { url },
    } as UploadDropzoneProps<TRouter, never>);
  }

  return TypedUploadDropzone;
}

// ─── generateNextHelpers ────────────────────────────────────────────────────

/**
 * Convenience wrapper around `generateReactHelpers` with Next.js defaults.
 * Uses `/api/upload` as the default URL.
 *
 * @example
 * ```ts
 * import type { OurFileRouter } from "~/server/upload-router";
 * export const { useUpload, uploadFiles, createUpload } =
 *   generateNextHelpers<OurFileRouter>();
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function generateNextHelpers<TRouter extends FileRouter>(opts?: {
  url?: string;
}) {
  return generateReactHelpers<TRouter>({
    url: opts?.url ?? "/api/upload",
  });
}
