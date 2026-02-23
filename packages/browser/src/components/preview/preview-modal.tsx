import { Suspense, useEffect } from "react";
import type { BrowserFile } from "@s3-good/shared";
import { getPreviewType } from "@s3-good/shared";
import {
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogPortal,
  DialogRoot,
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
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function LoadingSpinner() {
  return <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />;
}

export function PreviewModal({
  file,
  url,
  isLoading,
  onPrev,
  onNext,
  onClose,
  onDownload,
  hasPrev,
  hasNext,
}: PreviewModalProps) {
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
    <DialogRoot
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogPortal>
        <DialogBackdrop className="fixed inset-0 z-50 bg-slate-950/90" />
        <DialogContent className="fixed inset-0 z-50 flex flex-col outline-none" aria-label={`Preview ${file.name}`}>
          <header className="flex items-center justify-between border-b border-white/10 bg-black/30 px-4 py-3">
            <div className="min-w-0">
              <DialogTitle className="truncate text-sm font-medium text-white">{file.name}</DialogTitle>
              <p className="text-xs text-slate-300">{formatFileSize(file.size)} • {previewType}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white" onClick={onDownload}>
                Download
              </button>
              <DialogClose className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white" onClick={onClose}>
                Close
              </DialogClose>
            </div>
          </header>

          <div className="relative flex flex-1 items-center justify-center p-4">
            {hasPrev ? (
              <button type="button" className="absolute left-4 rounded-full bg-white/15 p-3 text-white" onClick={onPrev}>
                ←
              </button>
            ) : null}

            {isLoading ? (
              <LoadingSpinner />
            ) : PreviewComponent ? (
              <Suspense fallback={<LoadingSpinner />}>
                <PreviewComponent url={url} fileName={file.name} contentType={file.contentType} />
              </Suspense>
            ) : (
              <div className="rounded-lg bg-white p-6 text-center">
                <p className="text-slate-900">Preview not available.</p>
                <button type="button" className="mt-3 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white" onClick={onDownload}>
                  Download instead
                </button>
              </div>
            )}

            {hasNext ? (
              <button type="button" className="absolute right-4 rounded-full bg-white/15 p-3 text-white" onClick={onNext}>
                →
              </button>
            ) : null}
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}
