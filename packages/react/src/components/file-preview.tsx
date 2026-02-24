import { useState, useEffect, createElement, forwardRef } from "react";
import { formatFileSize } from "@s3-good/shared";
import { resolveStyle, resolveClassName, renderContent, cn } from "./shared";
import type { StyleField } from "./shared";
import { defaultFilePreviewClasses } from "../styles";

// ─── Content Options ────────────────────────────────────────────────────────

export interface FilePreviewContentOpts {
  file: File | string;
  isImage: boolean;
  fileName: string;
  fileSize: number | undefined;
}

// ─── Appearance ─────────────────────────────────────────────────────────────

export interface FilePreviewAppearance {
  container?: StyleField<FilePreviewContentOpts>;
  thumbnail?: StyleField<FilePreviewContentOpts>;
  icon?: StyleField<FilePreviewContentOpts>;
  fileInfo?: StyleField<FilePreviewContentOpts>;
  fileName?: StyleField<FilePreviewContentOpts>;
  fileSize?: StyleField<FilePreviewContentOpts>;
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface FilePreviewProps {
  file: File | string;
  /** Override the displayed file name (useful for URL-based files) */
  name?: string;
  /** Override the displayed file size in bytes (useful for URL-based files) */
  size?: number;
  appearance?: FilePreviewAppearance;
  content?: {
    thumbnail?:
      | React.ReactNode
      | ((opts: FilePreviewContentOpts) => React.ReactNode);
    icon?:
      | React.ReactNode
      | ((opts: FilePreviewContentOpts) => React.ReactNode);
    fileName?:
      | React.ReactNode
      | ((opts: FilePreviewContentOpts) => React.ReactNode);
    fileSize?:
      | React.ReactNode
      | ((opts: FilePreviewContentOpts) => React.ReactNode);
  };
  className?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Check if a File or URL represents an image */
function isImageFile(file: File | string): boolean {
  if (file instanceof File) {
    return file.type.startsWith("image/");
  }
  // URL-based detection via extension
  const ext = file.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";
  return [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "svg",
    "bmp",
    "ico",
    "avif",
  ].includes(ext);
}

/** Extract file name from a URL */
function getFileNameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split("/").pop() ?? "Unknown file";
  } catch {
    return url.split("/").pop() ?? "Unknown file";
  }
}

// ─── useObjectUrl Hook ──────────────────────────────────────────────────────

function useObjectUrl(file: File | string | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!file || typeof file === "string") {
      setUrl(typeof file === "string" ? file : undefined);
      return;
    }

    if (file.type.startsWith("image/")) {
      const objectUrl = URL.createObjectURL(file);
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    setUrl(undefined);
  }, [file]);

  return url;
}

// ─── FileIcon SVG Component ─────────────────────────────────────────────────

function FileIcon() {
  return createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.5,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
    },
    createElement("path", {
      d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
    }),
    createElement("polyline", { points: "14 2 14 8 20 8" }),
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export const FilePreview = forwardRef<HTMLDivElement, FilePreviewProps>(
  (props, ref) => {
    const { file, name, size, appearance, content, className } = props;

    const isImage = isImageFile(file);
    const thumbnailUrl = useObjectUrl(file);

    const fileName =
      name ?? (file instanceof File ? file.name : getFileNameFromUrl(file));
    const fileSize = size ?? (file instanceof File ? file.size : undefined);

    const contentOpts: FilePreviewContentOpts = {
      file,
      isImage,
      fileName,
      fileSize,
    };

    // Resolve styles
    const containerStyle = resolveStyle(appearance?.container, contentOpts);
    const containerClassName = cn(
      defaultFilePreviewClasses.container,
      resolveClassName(appearance?.container, contentOpts),
    );

    const thumbnailStyle = resolveStyle(appearance?.thumbnail, contentOpts);
    const thumbnailClassName = cn(
      defaultFilePreviewClasses.thumbnail,
      resolveClassName(appearance?.thumbnail, contentOpts),
    );

    const iconStyle = resolveStyle(appearance?.icon, contentOpts);
    const iconClassName = cn(
      defaultFilePreviewClasses.icon,
      resolveClassName(appearance?.icon, contentOpts),
    );

    const fileInfoStyle = resolveStyle(appearance?.fileInfo, contentOpts);
    const fileInfoClassName = cn(
      defaultFilePreviewClasses.fileInfo,
      resolveClassName(appearance?.fileInfo, contentOpts),
    );

    const fileNameStyle = resolveStyle(appearance?.fileName, contentOpts);
    const fileNameClassName = cn(
      defaultFilePreviewClasses.fileName,
      resolveClassName(appearance?.fileName, contentOpts),
    );

    const fileSizeStyle = resolveStyle(appearance?.fileSize, contentOpts);
    const fileSizeClassName = cn(
      defaultFilePreviewClasses.fileSize,
      resolveClassName(appearance?.fileSize, contentOpts),
    );

    return (
      <div
        ref={ref}
        className={cn(className, containerClassName)}
        style={containerStyle}
        data-state={isImage ? "image" : "file"}
      >
        {/* Thumbnail or Icon */}
        {isImage && thumbnailUrl ? (
          <div>
            {renderContent(
              content?.thumbnail,
              contentOpts,
              <img
                src={thumbnailUrl}
                alt={fileName}
                className={thumbnailClassName}
                style={thumbnailStyle}
              />,
            )}
          </div>
        ) : (
          <div className={iconClassName} style={iconStyle}>
            {renderContent(content?.icon, contentOpts, <FileIcon />)}
          </div>
        )}

        {/* File Info */}
        <div className={fileInfoClassName} style={fileInfoStyle}>
          <div className={fileNameClassName} style={fileNameStyle}>
            {renderContent(content?.fileName, contentOpts, fileName)}
          </div>

          {fileSize !== undefined && (
            <div className={fileSizeClassName} style={fileSizeStyle}>
              {renderContent(
                content?.fileSize,
                contentOpts,
                formatFileSize(fileSize),
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);
FilePreview.displayName = "FilePreview";
