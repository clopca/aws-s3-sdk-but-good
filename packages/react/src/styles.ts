import { cva } from "class-variance-authority";

// ─── UploadButton Variants ──────────────────────────────────────────────────

export const uploadButtonVariants = cva(
  "inline-flex min-w-[120px] items-center justify-center gap-2 rounded-lg border-0 px-5 py-2 text-sm font-medium transition-colors",
  {
    variants: {
      state: {
        idle: "bg-primary text-primary-foreground cursor-pointer",
        disabled: "bg-primary/60 text-primary-foreground cursor-not-allowed",
        uploading: "bg-primary text-primary-foreground cursor-default",
      },
    },
    defaultVariants: {
      state: "idle",
    },
  },
);

export const defaultButtonClasses = {
  container: "flex flex-col items-center gap-1",
  allowedContent: "mt-0.5 text-xs text-muted-foreground",
  uploadButton:
    "mt-1 rounded-md border-0 bg-primary px-4 py-1.5 text-[13px] text-primary-foreground",
  input: "hidden",
} as const;

// ─── UploadDropzone Variants ────────────────────────────────────────────────

export const uploadDropzoneVariants = cva(
  "flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 transition-colors",
  {
    variants: {
      state: {
        idle: "border-border bg-muted cursor-pointer",
        dragOver: "border-primary bg-primary/10 cursor-pointer",
        uploading: "border-primary/60 cursor-default",
        disabled: "border-border bg-muted cursor-not-allowed opacity-60",
      },
    },
    defaultVariants: {
      state: "idle",
    },
  },
);

export const defaultDropzoneClasses = {
  uploadIcon: "mb-1 text-muted-foreground",
  label: "text-center text-sm text-foreground",
  allowedContent: "text-xs text-muted-foreground",
  button:
    "mt-2 rounded-lg border-0 bg-primary px-5 py-2 text-sm font-medium text-primary-foreground",
  progressBar:
    "mt-2 h-1.5 w-full max-w-[300px] overflow-hidden rounded bg-muted",
  progressFill:
    "h-full rounded bg-primary transition-[width] duration-300 ease-in-out",
  previewContainer: "mt-2 flex flex-wrap justify-center gap-2",
  previewImage: "h-16 w-16 rounded-md border border-border object-cover",
  fileList: "mt-1 text-center text-xs text-muted-foreground",
  input: "hidden",
} as const;

// ─── ProgressBar Variants ───────────────────────────────────────────────────

export const progressBarFillVariants = cva(
  "h-full rounded transition-[width] duration-300 ease-in-out",
  {
    variants: {
      state: {
        active: "bg-primary",
        complete: "bg-emerald-500",
      },
    },
    defaultVariants: {
      state: "active",
    },
  },
);

export const defaultProgressBarClasses = {
  container: "flex w-full flex-col gap-1",
  track: "h-2 w-full overflow-hidden rounded bg-muted",
  label: "text-right text-xs text-muted-foreground",
} as const;

// ─── FilePreview Classes ────────────────────────────────────────────────────

export const defaultFilePreviewClasses = {
  container:
    "flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2",
  thumbnail: "h-12 w-12 shrink-0 rounded-md border border-border object-cover",
  icon: "flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground",
  fileInfo: "flex min-w-0 flex-1 flex-col gap-0.5",
  fileName: "truncate text-sm font-medium text-foreground",
  fileSize: "text-xs text-muted-foreground",
} as const;

// ─── FileList Variants ──────────────────────────────────────────────────────

export const fileListItemVariants = cva(
  "flex items-center gap-3 rounded-lg border px-3 py-2.5",
  {
    variants: {
      status: {
        default: "border-border bg-card",
        error: "border-destructive/30 bg-destructive/10",
        complete: "border-emerald-500/30 bg-emerald-500/10",
      },
    },
    defaultVariants: {
      status: "default",
    },
  },
);

export const fileListStatusVariants = cva("shrink-0 text-xs font-medium", {
  variants: {
    status: {
      pending: "text-muted-foreground",
      uploading: "text-primary",
      complete: "text-emerald-500",
      error: "text-destructive",
    },
  },
  defaultVariants: {
    status: "pending",
  },
});

export const defaultFileListClasses = {
  container: "flex w-full flex-col gap-2",
  itemInfo: "flex min-w-0 flex-1 flex-col gap-1",
  itemName: "truncate text-sm font-medium text-foreground",
  itemSize: "text-xs text-muted-foreground",
  removeButton:
    "flex shrink-0 items-center justify-center rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  errorText: "text-xs text-destructive",
} as const;
