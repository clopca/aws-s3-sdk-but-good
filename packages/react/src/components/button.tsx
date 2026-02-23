import { useRef, useState } from "react";
import type {
  FileRouter,
  inferEndpointInput,
  inferEndpoints,
} from "@s3-good/core/types";
import type { UploadFileResponse } from "@s3-good/shared";
import type { UploadError } from "@s3-good/shared";
import { useUpload } from "../use-upload";
import { resolveStyle, resolveClassName, renderContent, generateAcceptString } from "./shared";
import type { StyleField } from "./shared";
import { defaultButtonStyles } from "../styles";

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
    button?:
      | React.ReactNode
      | ((opts: ButtonContentOpts) => React.ReactNode);
    allowedContent?:
      | React.ReactNode
      | ((opts: ButtonContentOpts) => React.ReactNode);
  };
  appearance?: UploadButtonAppearance;
  className?: string;
  disabled?: boolean;
  onClientUploadComplete?: (
    res: UploadFileResponse[],
  ) => void;
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

export function UploadButton<
  TRouter extends FileRouter,
  TEndpoint extends inferEndpoints<TRouter>,
>(props: UploadButtonProps<TRouter, TEndpoint>) {
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

  const {
    startUpload,
    isUploading,
    progress,
    abort,
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

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
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

  const handleLabelClick = (e: React.MouseEvent<HTMLLabelElement>) => {
    // If uploading, abort instead of opening file picker
    if (isUploading) {
      e.preventDefault();
      abort();
    }
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLLabelElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      if (isUploading) {
        e.preventDefault();
        abort();
      }
    }
  };

  const ready = !disabled && !isUploading;
  const contentOpts: ButtonContentOpts = {
    ready,
    isUploading,
    uploadProgress: progress,
    fileTypes,
  };

  const containerStyle = resolveStyle(
    appearance?.container,
    contentOpts,
    defaultButtonStyles.container,
  );
  const containerClassName = resolveClassName(appearance?.container, contentOpts);

  const buttonBaseStyle = isUploading
    ? defaultButtonStyles.buttonUploading
    : ready
      ? defaultButtonStyles.button
      : defaultButtonStyles.buttonDisabled;
  const buttonStyle = resolveStyle(
    appearance?.button,
    contentOpts,
    buttonBaseStyle,
  );
  const buttonClassName = resolveClassName(appearance?.button, contentOpts);

  const allowedContentStyle = resolveStyle(
    appearance?.allowedContent,
    contentOpts,
    defaultButtonStyles.allowedContent,
  );
  const allowedContentClassName = resolveClassName(appearance?.allowedContent, contentOpts);

  return (
    <div
      className={[className, containerClassName].filter(Boolean).join(" ") || undefined}
      style={containerStyle}
      data-state={isUploading ? "uploading" : ready ? "ready" : "disabled"}
    >
      <label
        className={buttonClassName}
        style={buttonStyle}
        onClick={handleLabelClick}
        onKeyDown={handleLabelKeyDown}
        data-state={isUploading ? "uploading" : ready ? "ready" : "disabled"}
        data-uploading={isUploading || undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleFileChange}
          disabled={!ready}
          accept={acceptString}
          multiple={
            permittedFileInfo
              ? permittedFileInfo.maxFileCount > 1
              : undefined
          }
        />
        {renderContent(
          content?.button,
          contentOpts,
          getDefaultButtonText(contentOpts),
        )}
      </label>

      {mode === "manual" && selectedFiles.length > 0 && !isUploading && (
        <button
          type="button"
          onClick={handleManualUpload}
          disabled={isUploading}
          style={defaultButtonStyles.uploadButton}
        >
          Upload {selectedFiles.length} file
          {selectedFiles.length > 1 ? "s" : ""}
        </button>
      )}

      <div
        className={allowedContentClassName}
        style={allowedContentStyle}
      >
        {renderContent(
          content?.allowedContent,
          contentOpts,
          getDefaultAllowedText(contentOpts),
        )}
      </div>
    </div>
  );
}
