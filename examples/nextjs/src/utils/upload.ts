import { generateReactHelpers } from "@s3-good/react";
import type { OurFileRouter } from "~/server/upload-router";

/**
 * Typed React helpers bound to our file router.
 *
 * - `useUpload` — hook for custom upload UIs
 * - `uploadFiles` — imperative upload function
 * - `createUpload` — advanced upload with abort support
 */
export const { useUpload, uploadFiles, createUpload } =
  generateReactHelpers<OurFileRouter>();

/**
 * Re-export the pre-built components from @s3-good/react.
 * These are untyped (endpoint is a plain string), but work
 * out of the box with minimal setup.
 */
export { UploadButton, UploadDropzone } from "@s3-good/react";
