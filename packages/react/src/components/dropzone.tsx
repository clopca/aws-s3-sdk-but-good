import { useRef, useState, useCallback, useEffect } from "react";
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
} from "./shared";
import type { StyleField } from "./shared";
import { defaultDropzoneStyles, getDropzoneContainerStyle } from "../styles";

// ─── Content Options ────────────────────────────────────────────────────────

export interface DropzoneContentOpts {
  ready: boolean;
  isUploading: boolean;
  uploadProgress: number;
  isDragOver: boolean;
  fileTypes: string[];
  files: File[];
}

// ─── Appearance ─────────────────────────────────────────────────────────────

export interface UploadDropzoneAppearance {
  container?: StyleField<DropzoneContentOpts>;
  uploadIcon?: StyleField<DropzoneContentOpts>;
  label?: StyleField<DropzoneContentOpts>;
  allowedContent?: StyleField<DropzoneContentOpts>;
  button?: StyleField<DropzoneContentOpts>;
}

// ─── Props ──────────────────────────────────────────────────────────────────

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
    label?:
      | React.ReactNode
      | ((opts: DropzoneContentOpts) => React.ReactNode);
    allowedContent?:
      | React.ReactNode
      | ((opts: DropzoneContentOpts) => React.ReactNode);
    button?:
      | React.ReactNode
      | ((opts: DropzoneContentOpts) => React.ReactNode);
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
  /** @internal Used by generateReactHelpers to pass the configured URL */
  __internal?: { url?: string };
}

// ─── Drag & Drop Hook ───────────────────────────────────────────────────────

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

// ─── Paste Hook ─────────────────────────────────────────────────────────────

function usePaste(opts: {
  enabled: boolean;
  onPaste: (files: File[]) => void;
}) {
  useEffect(() => {
    if (!opts.enabled) return;

    const handler = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length > 0) {
        e.preventDefault();
        opts.onPaste(files);
      }
    };

    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [opts.enabled, opts.onPaste]);
}

// ─── Image Preview Hook ─────────────────────────────────────────────────────

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

// ─── Default Content Helpers ────────────────────────────────────────────────

function getDefaultLabel(opts: DropzoneContentOpts): string {
  if (opts.isUploading) return `Uploading... ${opts.uploadProgress}%`;
  if (opts.isDragOver) return "Drop files here";
  return "Drag & drop files here, or click to browse";
}

function getDefaultAllowedText(opts: DropzoneContentOpts): string {
  if (opts.fileTypes.length === 0) return "";
  return `Allowed: ${generateAllowedContentText(opts.fileTypes)}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function UploadDropzone<
  TRouter extends FileRouter,
  TEndpoint extends inferEndpoints<TRouter>,
>(props: UploadDropzoneProps<TRouter, TEndpoint>) {
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

  const {
    startUpload,
    isUploading,
    progress,
    permittedFileInfo,
  } = useUpload<TRouter, TEndpoint>(
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
    if (ready) {
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    void handleFiles(files);
    // Reset input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleManualUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedFiles.length > 0) {
      void startUpload(selectedFiles, input);
      setSelectedFiles([]);
    }
  };

  const containerStyle = resolveStyle(
    appearance?.container,
    contentOpts,
    getDropzoneContainerStyle(contentOpts),
  );
  const containerClassName = resolveClassName(appearance?.container, contentOpts);

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
      role="button"
      tabIndex={ready ? 0 : -1}
      aria-label="Upload dropzone"
      aria-disabled={!ready}
      className={
        [className, containerClassName].filter(Boolean).join(" ") ||
        undefined
      }
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
        style={{ display: "none" }}
        onChange={handleFileInputChange}
        disabled={!ready}
        accept={acceptString}
        multiple={
          permittedFileInfo
            ? permittedFileInfo.maxFileCount > 1
            : undefined
        }
      />

      {/* Upload icon */}
      <div
        className={resolveClassName(appearance?.uploadIcon, contentOpts)}
        style={resolveStyle(
          appearance?.uploadIcon,
          contentOpts,
          defaultDropzoneStyles.uploadIcon,
        )}
      >
        {renderContent(content?.uploadIcon, contentOpts, <UploadIcon />)}
      </div>

      {/* Label */}
      <div
        className={resolveClassName(appearance?.label, contentOpts)}
        style={resolveStyle(
          appearance?.label,
          contentOpts,
          defaultDropzoneStyles.label,
        )}
      >
        {renderContent(
          content?.label,
          contentOpts,
          getDefaultLabel(contentOpts),
        )}
      </div>

      {/* Image previews */}
      {previews.length > 0 && (
        <div style={defaultDropzoneStyles.previewContainer}>
          {previews.map((url, i) => (
            <img
              key={url}
              src={url}
              alt={`Preview ${String(i + 1)}`}
              style={defaultDropzoneStyles.previewImage}
            />
          ))}
        </div>
      )}

      {/* File list (non-image) */}
      {nonImageFiles.length > 0 && (
        <div style={defaultDropzoneStyles.fileList}>
          {nonImageFiles.map((f) => (
            <div key={`${f.name}-${String(f.size)}`}>
              {f.name} ({formatFileSize(f.size)})
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {isUploading && (
        <div style={defaultDropzoneStyles.progressBar}>
          <div
            style={{
              ...defaultDropzoneStyles.progressFill,
              width: `${String(progress)}%`,
            }}
          />
        </div>
      )}

      {/* Allowed content */}
      <div
        className={resolveClassName(appearance?.allowedContent, contentOpts)}
        style={resolveStyle(
          appearance?.allowedContent,
          contentOpts,
          defaultDropzoneStyles.allowedContent,
        )}
      >
        {renderContent(
          content?.allowedContent,
          contentOpts,
          getDefaultAllowedText(contentOpts),
        )}
      </div>

      {/* Manual upload button */}
      {mode === "manual" && selectedFiles.length > 0 && !isUploading && (
        <button
          type="button"
          onClick={handleManualUpload}
          className={resolveClassName(appearance?.button, contentOpts)}
          style={resolveStyle(
            appearance?.button,
            contentOpts,
            defaultDropzoneStyles.button,
          )}
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
