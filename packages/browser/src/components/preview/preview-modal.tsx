import { forwardRef, Suspense, useEffect } from "react";
import type { BrowserFile } from "@s3-good/shared";
import { getPreviewType } from "@s3-good/shared";
import { Dialog as DialogPrimitive } from "@base-ui/react";
import {
  Button,
  cn,
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "../ui";
import { getPreviewComponent } from "./index";

interface PreviewModalProps {
  file: BrowserFile;
  url: string;
  isLoading: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onDownload: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** i;
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function LoadingSpinner() {
  return (
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
  );
}

const PreviewModal = forwardRef<HTMLDivElement, PreviewModalProps>(
  (
    {
      file,
      url,
      isLoading,
      onPrev,
      onNext,
      onClose,
      onDownload,
      hasPrev,
      hasNext,
      className,
    },
    ref,
  ) => {
    const previewType = getPreviewType(file.contentType, file.name);
    const PreviewComponent = getPreviewComponent(previewType);

    useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") onClose();
        if (event.key === "ArrowLeft" && hasPrev) onPrev();
        if (event.key === "ArrowRight" && hasNext) onNext();
      };

      document.addEventListener("keydown", onKeyDown);

      return () => {
        document.removeEventListener("keydown", onKeyDown);
      };
    }, [hasNext, hasPrev, onClose, onNext, onPrev]);

    return (
      <Dialog
        open
        onOpenChange={(nextOpen) => {
          if (!nextOpen) onClose();
        }}
      >
        <DialogPortal>
          <DialogOverlay className="bg-black/85 backdrop-blur-sm" />
          <DialogPrimitive.Popup
            ref={ref}
            className={cn(
              "fixed inset-0 z-50 flex flex-col outline-none",
              className,
            )}
            aria-label={`Preview ${file.name}`}
          >
            <header className="flex items-center justify-between border-b border-white/10 bg-black/35 px-4 py-3">
              <div className="min-w-0">
                <DialogTitle className="truncate text-sm font-medium text-white">
                  {file.name}
                </DialogTitle>
                <p className="text-xs text-white/70">
                  {formatFileSize(file.size)} • {previewType}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  className="bg-white/10 text-white hover:bg-white/20"
                  onClick={onDownload}
                >
                  Download
                </Button>
                <DialogClose
                  render={
                    <Button
                      className="bg-white/10 text-white hover:bg-white/20"
                      onClick={onClose}
                    />
                  }
                >
                  Close
                </DialogClose>
              </div>
            </header>

            <div className="relative flex flex-1 items-center justify-center p-4">
              {hasPrev ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 rounded-full bg-white/15 p-3 text-white hover:bg-white/25"
                  onClick={onPrev}
                >
                  ←
                </Button>
              ) : null}

              {isLoading ? (
                <LoadingSpinner />
              ) : PreviewComponent ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <PreviewComponent
                    url={url}
                    fileName={file.name}
                    contentType={file.contentType}
                  />
                </Suspense>
              ) : (
                <div className="rounded-lg border border-border bg-card p-6 text-center text-card-foreground">
                  <p className="text-foreground">Preview not available.</p>
                  <Button className="mt-3" onClick={onDownload}>
                    Download instead
                  </Button>
                </div>
              )}

              {hasNext ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 rounded-full bg-white/15 p-3 text-white hover:bg-white/25"
                  onClick={onNext}
                >
                  →
                </Button>
              ) : null}
            </div>
          </DialogPrimitive.Popup>
        </DialogPortal>
      </Dialog>
    );
  },
);
PreviewModal.displayName = "PreviewModal";

export { PreviewModal };
export type { PreviewModalProps };
