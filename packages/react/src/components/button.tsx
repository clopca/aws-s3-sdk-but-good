import { useId, useRef, useState, forwardRef } from "react";
import type {
  FileRouter,
  inferEndpointInput,
  inferEndpoints,
} from "s3-good/types";
import type { UploadFileResponse } from "s3-good/types";
import type { UploadError } from "s3-good/types";
import { useUpload } from "../use-upload";
import {
  resolveStyle,
  resolveClassName,
  renderContent,
  generateAcceptString,
  cn,
} from "./shared";
import type { StyleField } from "./shared";
import { defaultButtonClasses, uploadButtonVariants } from "../styles";

// ─── Content Options ────────────────────────────────────────────────────────

export interface ButtonContentOpts {
  ready: boolean;
  isUploading: boolean;
  uploadProgress: number;
  fileTypes: string[];
}

// ─── Appearance ─────────────────────────────────────────────────────────────

export interface UploadButtonAppearance {
  container?: StyleField<ButtonContentOpts>;
  button?: StyleField<ButtonContentOpts>;
  allowedContent?: StyleField<ButtonContentOpts>;
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface UploadButtonProps<
  TRouter extends FileRouter,
  TEndpoint extends inferEndpoints<TRouter>,
> {
  endpoint: TEndpoint;
  input?: inferEndpointInput<TRouter, TEndpoint>;
  mode?: "auto" | "manual";
  content?: {
    button?: React.ReactNode | ((opts: ButtonContentOpts) => React.ReactNode);
    allowedContent?:
      | React.ReactNode
      | ((opts: ButtonContentOpts) => React.ReactNode);
  };
  appearance?: UploadButtonAppearance;
  className?: string;
  disabled?: boolean;
  onClientUploadComplete?: (res: UploadFileResponse[]) => void;
  onUploadError?: (error: UploadError) => void;
  onUploadBegin?: (fileName: string) => void;
  onUploadProgress?: (progress: number) => void;
  headers?: HeadersInit | (() => Promise<HeadersInit> | HeadersInit);
  /** @internal Used by generateReactHelpers to pass the configured URL */
  __internal?: { url?: string };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDefaultButtonText(opts: ButtonContentOpts): string {
  if (opts.isUploading) return `Uploading... ${opts.uploadProgress}%`;
  return "Choose File";
}

function getDefaultAllowedText(opts: ButtonContentOpts): string {
  if (opts.fileTypes.length === 0) return "";
  return `Allowed: ${opts.fileTypes.join(", ")}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

function UploadButtonInner<
  TRouter extends FileRouter,
  TEndpoint extends inferEndpoints<TRouter>,
>(
  props: UploadButtonProps<TRouter, TEndpoint>,
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
    headers,
    __internal,
  } = props;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const allowedContentId = useId();

  const { startUpload, isUploading, progress, abort, permittedFileInfo } =
    useUpload<TRouter, TEndpoint>(
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    if (mode === "auto") {
      await startUpload(files, input);
    } else {
      setSelectedFiles(files);
    }

    // Reset input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleManualUpload = async () => {
    if (selectedFiles.length > 0) {
      await startUpload(selectedFiles, input);
      setSelectedFiles([]);
    }
  };

  const handleButtonClick = () => {
    if (isUploading) {
      abort();
    } else {
      fileInputRef.current?.click();
    }
  };

  const ready = !disabled && !isUploading;
  const contentOpts: ButtonContentOpts = {
    ready,
    isUploading,
    uploadProgress: progress,
    fileTypes,
  };

  const containerStyle = resolveStyle(appearance?.container, contentOpts);
  const containerClassName = cn(
    defaultButtonClasses.container,
    resolveClassName(appearance?.container, contentOpts),
  );

  const buttonState = isUploading ? "uploading" : ready ? "idle" : "disabled";
  const buttonStyle = resolveStyle(appearance?.button, contentOpts);
  const buttonClassName = cn(
    uploadButtonVariants({ state: buttonState }),
    resolveClassName(appearance?.button, contentOpts),
  );

  const allowedContentStyle = resolveStyle(
    appearance?.allowedContent,
    contentOpts,
  );
  const allowedContentClassName = cn(
    defaultButtonClasses.allowedContent,
    resolveClassName(appearance?.allowedContent, contentOpts),
  );

  const allowedText = getDefaultAllowedText(contentOpts);
  const hasAllowedContent =
    content?.allowedContent !== undefined || allowedText.length > 0;

  return (
    <div
      ref={ref}
      role="group"
      aria-label="File upload"
      className={cn(className, containerClassName)}
      style={containerStyle}
      data-state={isUploading ? "uploading" : ready ? "ready" : "disabled"}
    >
      <input
        ref={fileInputRef}
        type="file"
        className={defaultButtonClasses.input}
        onChange={handleFileChange}
        disabled={!ready}
        accept={acceptString}
        tabIndex={-1}
        aria-hidden
        multiple={
          permittedFileInfo ? permittedFileInfo.maxFileCount > 1 : undefined
        }
      />
      <button
        type="button"
        className={buttonClassName}
        style={buttonStyle}
        onClick={handleButtonClick}
        disabled={disabled && !isUploading}
        aria-label="Upload file"
        aria-busy={isUploading || undefined}
        aria-disabled={!ready}
        aria-describedby={hasAllowedContent ? allowedContentId : undefined}
        data-state={isUploading ? "uploading" : ready ? "ready" : "disabled"}
        data-uploading={isUploading || undefined}
      >
        {isUploading ? (
          <span aria-live="polite">
            {renderContent(
              content?.button,
              contentOpts,
              getDefaultButtonText(contentOpts),
            )}
          </span>
        ) : (
          renderContent(
            content?.button,
            contentOpts,
            getDefaultButtonText(contentOpts),
          )
        )}
      </button>

      {mode === "manual" && selectedFiles.length > 0 && !isUploading && (
        <button
          type="button"
          onClick={handleManualUpload}
          disabled={isUploading}
          className={defaultButtonClasses.uploadButton}
        >
          Upload {selectedFiles.length} file
          {selectedFiles.length > 1 ? "s" : ""}
        </button>
      )}

      <div
        id={allowedContentId}
        className={allowedContentClassName}
        style={allowedContentStyle}
      >
        {renderContent(content?.allowedContent, contentOpts, allowedText)}
      </div>
    </div>
  );
}

/**
 * Upload button component with file picker.
 * Supports `ref` forwarding to the root `<div>` element.
 */
export const UploadButton = forwardRef(UploadButtonInner) as <
  TRouter extends FileRouter,
  TEndpoint extends inferEndpoints<TRouter>,
>(
  props: UploadButtonProps<TRouter, TEndpoint> &
    React.RefAttributes<HTMLDivElement>,
) => React.ReactElement | null;

// displayName for React DevTools
(UploadButton as React.FC).displayName = "UploadButton";
