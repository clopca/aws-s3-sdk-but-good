import { forwardRef } from "react";
import { cn } from "./ui/utils";

// ---------------------------------------------------------------------------
// UploadCloudIcon – inline SVG to avoid external icon dependencies
// ---------------------------------------------------------------------------

function UploadCloudIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 16V8m0 0-3 3m3-3 3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// UploadOverlay
// ---------------------------------------------------------------------------

export interface UploadOverlayProps {
  /** Whether files are currently being dragged over the drop zone. */
  isDragOver: boolean;
  className?: string;
}

/**
 * Visual overlay shown when files are dragged over the browser area.
 *
 * Renders nothing when `isDragOver` is `false`. When active, it covers the
 * parent container with a translucent backdrop and a "Drop files to upload"
 * message.
 *
 * Usage (standalone):
 * ```tsx
 * <div className="relative">
 *   <UploadOverlay isDragOver={isDragging} />
 *   {children}
 * </div>
 * ```
 *
 * Usage (via compound):
 * ```tsx
 * <S3Browser.Root url="/api/browser" upload={{ endpoint: "myUploader" }}>
 *   {/* UploadZone is rendered automatically by Root when upload is enabled *\/}
 *   <S3Browser.FileView />
 * </S3Browser.Root>
 * ```
 */
const UploadOverlay = forwardRef<HTMLDivElement, UploadOverlayProps>(
  ({ isDragOver, className }, ref) => {
    if (!isDragOver) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur-sm transition-all",
          className,
        )}
        data-state="active"
        data-testid="upload-overlay"
      >
        <div className="flex flex-col items-center gap-2 text-primary">
          <UploadCloudIcon className="h-12 w-12" />
          <p className="text-lg font-medium">Drop files to upload</p>
          <p className="text-sm text-muted-foreground">
            Files will be uploaded to the current folder
          </p>
        </div>
      </div>
    );
  },
);
UploadOverlay.displayName = "UploadOverlay";

export { UploadOverlay };
