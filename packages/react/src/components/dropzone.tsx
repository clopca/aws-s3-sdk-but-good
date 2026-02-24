import { useRef, useState, useCallback, useEffect, forwardRef } from "react";
import type {
  FileRouter,
  inferEndpointInput,
  inferEndpoints,
} from "@s3-good/core/types";
import type { UploadFileResponse } from "@s3-good/shared";
import type { UploadError } from "@s3-good/shared";
import { formatFileSize } from "@s3-good/shared";
import { useUpload } from "../use-upload";
import {
  resolveStyle,
  resolveClassName,
  renderContent,
  generateAcceptString,
  generateAllowedContentText,
  UploadIcon,
  cn,
} from "./shared";
import type { StyleField } from "./shared";
import { defaultDropzoneClasses, uploadDropzoneVariants } from "../styles";

export interface DropzoneContentOpts {
  ready: boolean;
  isUploading: boolean;
  uploadProgress: number;
  isDragOver: boolean;
  fileTypes: string[];
  files: File[];
}

export interface UploadDropzoneAppearance {
  container?: StyleField<DropzoneContentOpts>;
  uploadIcon?: StyleField<DropzoneContentOpts>;
  label?: StyleField<DropzoneContentOpts>;
  allowedContent?: StyleField<DropzoneContentOpts>;
  button?: StyleField<DropzoneContentOpts>;
}

export interface UploadDropzoneProps<
  TRouter extends FileRouter,
  TEndpoint extends inferEndpoints<TRouter>,
> {
  endpoint: TEndpoint;
  input?: inferEndpointInput<TRouter, TEndpoint>;
  mode?: "auto" | "manual";
  content?: {
    uploadIcon?:
      | React.ReactNode
      | ((opts: DropzoneContentOpts) => React.ReactNode);
    label?: React.ReactNode | ((opts: DropzoneContentOpts) => React.ReactNode);
    allowedContent?:
      | React.ReactNode
      | ((opts: DropzoneContentOpts) => React.ReactNode);
    button?: React.ReactNode | ((opts: DropzoneContentOpts) => React.ReactNode);
  };
  appearance?: UploadDropzoneAppearance;
  className?: string;
  disabled?: boolean;
  onClientUploadComplete?: (res: UploadFileResponse[]) => void;
  onUploadError?: (error: UploadError) => void;
  onUploadBegin?: (fileName: string) => void;
  onUploadProgress?: (progress: number) => void;
  onPaste?: boolean;
  headers?: HeadersInit | (() => Promise<HeadersInit> | HeadersInit);
  __internal?: { url?: string };
}

function useDragDrop(opts: {
  onDrop: (files: File[]) => void;
  disabled: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!opts.disabled) setIsDragOver(true);
    },
    [opts.disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (opts.disabled) return;
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) opts.onDrop(files);
    },
    [opts],
  );

  return { isDragOver, handleDragOver, handleDragLeave, handleDrop };
}

function usePaste(opts: {
  enabled: boolean;
  onPaste: (files: File[]) => void;
}) {
  const callbackRef = useRef(opts.onPaste);
  callbackRef.current = opts.onPaste;

  useEffect(() => {
    if (!opts.enabled) return;

    const handler = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length > 0) {
        e.preventDefault();
        callbackRef.current(files);
      }
    };

    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [opts.enabled]);
}

function useImagePreviews(files: File[]): string[] {
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => URL.createObjectURL(f));
    setPreviews(urls);

    return () => {
      urls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [files]);

  return previews;
}

function getDefaultLabel(opts: DropzoneContentOpts): string {
  if (opts.isUploading) return `Uploading... ${opts.uploadProgress}%`;
  if (opts.isDragOver) return "Drop files here";
  return "Drag & drop files here, or click to browse";
}

function getDefaultAllowedText(opts: DropzoneContentOpts): string {
  if (opts.fileTypes.length === 0) return "";
  return `Allowed: ${generateAllowedContentText(opts.fileTypes)}`;
}

function UploadDropzoneInner<
  TRouter extends FileRouter,
  TEndpoint extends inferEndpoints<TRouter>,
>(
  props: UploadDropzoneProps<TRouter, TEndpoint>,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const {
    endpoint,
    input,
    mode = "auto",
    content,
    appearance,
    className,
    disabled,
    onClientUploadComplete,
    onUploadError,
    onUploadBegin,
    onUploadProgress,
    onPaste: enablePaste,
    headers,
    __internal,
  } = props;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const { startUpload, isUploading, progress, permittedFileInfo } = useUpload<
    TRouter,
    TEndpoint
  >(
    endpoint,
    {
      onUploadBegin,
      onUploadProgress,
      onClientUploadComplete,
      onUploadError,
      headers,
    },
    { url: __internal?.url },
  );

  const fileTypes = permittedFileInfo?.fileTypes ?? [];
  const acceptString =
    fileTypes.length > 0 ? generateAcceptString(fileTypes) : undefined;

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (mode === "auto") {
        await startUpload(files, input);
      } else {
        setSelectedFiles(files);
      }
    },
    [mode, startUpload, input],
  );

  const { isDragOver, handleDragOver, handleDragLeave, handleDrop } =
    useDragDrop({
      onDrop: handleFiles,
      disabled: !!disabled || isUploading,
    });

  usePaste({ enabled: !!enablePaste, onPaste: handleFiles });
  const previews = useImagePreviews(selectedFiles);

  const ready = !disabled && !isUploading;
  const contentOpts: DropzoneContentOpts = {
    ready,
    isUploading,
    uploadProgress: progress,
    isDragOver,
    fileTypes,
    files: selectedFiles,
  };

  const handleContainerClick = () => {
    if (ready) fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    void handleFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleManualUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedFiles.length > 0) {
      void startUpload(selectedFiles, input);
      setSelectedFiles([]);
    }
  };

  const containerStyle = resolveStyle(appearance?.container, contentOpts);
  const dropzoneState = !ready
    ? "disabled"
    : isDragOver
      ? "dragOver"
      : isUploading
        ? "uploading"
        : "idle";
  const containerClassName = cn(
    uploadDropzoneVariants({ state: dropzoneState }),
    resolveClassName(appearance?.container, contentOpts),
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleContainerClick();
    }
  };

  const nonImageFiles = selectedFiles.filter(
    (f) => !f.type.startsWith("image/"),
  );

  const dataState = isUploading
    ? "uploading"
    : isDragOver
      ? "dragover"
      : ready
        ? "ready"
        : "disabled";

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={ready ? 0 : -1}
      aria-label="Upload dropzone"
      aria-disabled={!ready}
      className={cn(className, containerClassName)}
      style={containerStyle}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleContainerClick}
      onKeyDown={handleKeyDown}
      data-state={dataState}
    >
      <input
        ref={fileInputRef}
        type="file"
        className={defaultDropzoneClasses.input}
        onChange={handleFileInputChange}
        disabled={!ready}
        accept={acceptString}
        multiple={
          permittedFileInfo ? permittedFileInfo.maxFileCount > 1 : undefined
        }
      />

      <div
        className={cn(
          defaultDropzoneClasses.uploadIcon,
          resolveClassName(appearance?.uploadIcon, contentOpts),
        )}
        style={resolveStyle(appearance?.uploadIcon, contentOpts)}
      >
        {renderContent(content?.uploadIcon, contentOpts, <UploadIcon />)}
      </div>

      <div
        className={cn(
          defaultDropzoneClasses.label,
          resolveClassName(appearance?.label, contentOpts),
        )}
        style={resolveStyle(appearance?.label, contentOpts)}
        aria-live={isUploading ? "polite" : undefined}
      >
        {renderContent(
          content?.label,
          contentOpts,
          getDefaultLabel(contentOpts),
        )}
      </div>

      {previews.length > 0 && (
        <div className={defaultDropzoneClasses.previewContainer}>
          {previews.map((url, i) => (
            <img
              key={url}
              src={url}
              alt={`Preview ${String(i + 1)}`}
              className={defaultDropzoneClasses.previewImage}
            />
          ))}
        </div>
      )}

      {nonImageFiles.length > 0 && (
        <div className={defaultDropzoneClasses.fileList}>
          {nonImageFiles.map((f) => (
            <div key={`${f.name}-${String(f.size)}`}>
              {f.name} ({formatFileSize(f.size)})
            </div>
          ))}
        </div>
      )}

      {isUploading && (
        <div className={defaultDropzoneClasses.progressBar}>
          <div
            className={defaultDropzoneClasses.progressFill}
            style={{ width: `${String(progress)}%` }}
          />
        </div>
      )}

      <div
        className={cn(
          defaultDropzoneClasses.allowedContent,
          resolveClassName(appearance?.allowedContent, contentOpts),
        )}
        style={resolveStyle(appearance?.allowedContent, contentOpts)}
      >
        {renderContent(
          content?.allowedContent,
          contentOpts,
          getDefaultAllowedText(contentOpts),
        )}
      </div>

      {mode === "manual" && selectedFiles.length > 0 && !isUploading && (
        <button
          type="button"
          onClick={handleManualUpload}
          className={cn(
            defaultDropzoneClasses.button,
            resolveClassName(appearance?.button, contentOpts),
          )}
          style={resolveStyle(appearance?.button, contentOpts)}
        >
          {renderContent(
            content?.button,
            contentOpts,
            `Upload ${String(selectedFiles.length)} file${selectedFiles.length > 1 ? "s" : ""}`,
          )}
        </button>
      )}
    </div>
  );
}

/**
 * Upload dropzone component with drag & drop support.
 * Supports `ref` forwarding to the root `<div>` element.
 */
export const UploadDropzone = forwardRef(UploadDropzoneInner) as <
  TRouter extends FileRouter,
  TEndpoint extends inferEndpoints<TRouter>,
>(
  props: UploadDropzoneProps<TRouter, TEndpoint> &
    React.RefAttributes<HTMLDivElement>,
) => React.ReactElement | null;

// displayName for React DevTools
(UploadDropzone as React.FC).displayName = "UploadDropzone";
