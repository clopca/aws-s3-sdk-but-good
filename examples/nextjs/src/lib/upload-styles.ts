import type { UploadButtonAppearance } from "@s3-good/react";
import type { UploadDropzoneAppearance } from "@s3-good/react";

// ─── Default shadcn/ui Styles ───────────────────────────────────────────────
// These match the zinc theme used throughout the example app.

export const uploadButtonAppearance: UploadButtonAppearance = {
  container: "flex flex-col items-center gap-2",
  button:
    "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=disabled]:cursor-not-allowed data-[state=disabled]:opacity-50",
  allowedContent: "text-xs text-muted-foreground mt-1",
};

export const uploadDropzoneAppearance: UploadDropzoneAppearance = {
  container:
    "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-8 text-center transition-colors hover:border-muted-foreground/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=disabled]:cursor-not-allowed data-[state=disabled]:opacity-60",
  button:
    "mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  label: "text-sm font-medium text-foreground",
  allowedContent: "text-xs text-muted-foreground mt-2",
  uploadIcon: "text-muted-foreground mb-2",
};

// ─── Themed Variants ────────────────────────────────────────────────────────
// Intentionally different from the default to showcase the appearance API.

/** Emerald/green theme — nature-inspired with rounded pill buttons */
export const greenButtonAppearance: UploadButtonAppearance = {
  container: "flex flex-col items-center gap-2",
  button:
    "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400",
  allowedContent: "mt-1 text-xs text-emerald-700/75 dark:text-emerald-300/80",
};

/** Minimal/ghost theme — text-link style, no background */
export const minimalButtonAppearance: UploadButtonAppearance = {
  container: "inline-flex items-center gap-1",
  button:
    "bg-transparent min-w-0 shadow-none inline-flex items-center gap-1.5 rounded-sm px-1 py-0.5 text-sm font-medium text-foreground underline underline-offset-4 decoration-muted-foreground/70 transition-colors hover:text-foreground hover:decoration-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=disabled]:text-muted-foreground data-[state=disabled]:decoration-muted-foreground/50",
  allowedContent: "hidden",
};

/** Dark theme dropzone — dark background with indigo accents */
export const darkDropzoneAppearance: UploadDropzoneAppearance = {
  container:
    "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900 p-10 text-center transition-all hover:border-indigo-500/60 hover:bg-zinc-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-zinc-600 dark:bg-zinc-950",
  button:
    "mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-xs transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:text-indigo-950",
  label: "text-sm font-medium text-zinc-100 dark:text-zinc-100",
  allowedContent: "mt-2 text-xs text-zinc-400 dark:text-zinc-400",
  uploadIcon: "mb-2 text-zinc-500 dark:text-zinc-500",
};
