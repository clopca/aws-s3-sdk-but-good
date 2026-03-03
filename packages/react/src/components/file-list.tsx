import { createElement, forwardRef } from "react";
import { formatFileSize } from "s3-good/types";
import { resolveStyle, resolveClassName, renderContent, cn } from "./shared";
import type { StyleField } from "./shared";
import {
  defaultFileListClasses,
  fileListItemVariants,
  fileListStatusVariants,
} from "../styles";
import { ProgressBar } from "./progress-bar";

// ─── FileItem Types ─────────────────────────────────────────────────────────

export type FileItemStatus = "pending" | "uploading" | "complete" | "error";

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: FileItemStatus;
  error?: string;
  file?: File;
  url?: string;
}

// ─── Content Options ────────────────────────────────────────────────────────

export interface FileListContentOpts {
  files: FileItem[];
  uploadingCount: number;
  completedCount: number;
  errorCount: number;
  isAllComplete: boolean;
}

export interface FileListItemContentOpts {
  file: FileItem;
  isUploading: boolean;
  isComplete: boolean;
  isError: boolean;
}

// ─── Appearance ─────────────────────────────────────────────────────────────

export interface FileListAppearance {
  container?: StyleField<FileListContentOpts>;
  item?: StyleField<FileListItemContentOpts>;
  itemInfo?: StyleField<FileListItemContentOpts>;
  itemName?: StyleField<FileListItemContentOpts>;
  itemSize?: StyleField<FileListItemContentOpts>;
  itemProgress?: StyleField<FileListItemContentOpts>;
  itemStatus?: StyleField<FileListItemContentOpts>;
  removeButton?: StyleField<FileListItemContentOpts>;
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface FileListProps {
  files: FileItem[];
  onRemove?: (id: string) => void;
  showProgress?: boolean;
  showRemoveButton?: boolean;
  appearance?: FileListAppearance;
  content?: {
    itemName?:
      | React.ReactNode
      | ((opts: FileListItemContentOpts) => React.ReactNode);
    itemSize?:
      | React.ReactNode
      | ((opts: FileListItemContentOpts) => React.ReactNode);
    itemStatus?:
      | React.ReactNode
      | ((opts: FileListItemContentOpts) => React.ReactNode);
  };
  className?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusText(status: FileItemStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "uploading":
      return "Uploading";
    case "complete":
      return "Complete";
    case "error":
      return "Error";
  }
}

// ─── RemoveIcon SVG Component ───────────────────────────────────────────────

function RemoveIcon() {
  return createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 16,
      height: 16,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
    },
    createElement("line", { x1: 18, y1: 6, x2: 6, y2: 18 }),
    createElement("line", { x1: 6, y1: 6, x2: 18, y2: 18 }),
  );
}

// ─── FileListItem Sub-Component ─────────────────────────────────────────────

function FileListItem(props: {
  file: FileItem;
  onRemove?: (id: string) => void;
  showProgress: boolean;
  showRemoveButton: boolean;
  appearance?: FileListAppearance;
  content?: FileListProps["content"];
}) {
  const {
    file,
    onRemove,
    showProgress,
    showRemoveButton,
    appearance,
    content,
  } = props;

  const isUploading = file.status === "uploading";
  const isComplete = file.status === "complete";
  const isError = file.status === "error";

  const itemContentOpts: FileListItemContentOpts = {
    file,
    isUploading,
    isComplete,
    isError,
  };

  // Resolve item style based on status using cva variant
  const itemVariantStatus = isError
    ? ("error" as const)
    : isComplete
      ? ("complete" as const)
      : ("default" as const);

  const itemStyle = resolveStyle(appearance?.item, itemContentOpts);
  const itemClassName = cn(
    fileListItemVariants({ status: itemVariantStatus }),
    resolveClassName(appearance?.item, itemContentOpts),
  );

  const itemInfoStyle = resolveStyle(appearance?.itemInfo, itemContentOpts);
  const itemInfoClassName = cn(
    defaultFileListClasses.itemInfo,
    resolveClassName(appearance?.itemInfo, itemContentOpts),
  );

  const itemNameStyle = resolveStyle(appearance?.itemName, itemContentOpts);
  const itemNameClassName = cn(
    defaultFileListClasses.itemName,
    resolveClassName(appearance?.itemName, itemContentOpts),
  );

  const itemSizeStyle = resolveStyle(appearance?.itemSize, itemContentOpts);
  const itemSizeClassName = cn(
    defaultFileListClasses.itemSize,
    resolveClassName(appearance?.itemSize, itemContentOpts),
  );

  const itemStatusStyle = resolveStyle(appearance?.itemStatus, itemContentOpts);
  const itemStatusClassName = cn(
    fileListStatusVariants({ status: file.status }),
    resolveClassName(appearance?.itemStatus, itemContentOpts),
  );

  const removeButtonStyle = resolveStyle(
    appearance?.removeButton,
    itemContentOpts,
  );
  const removeButtonClassName = cn(
    defaultFileListClasses.removeButton,
    resolveClassName(appearance?.removeButton, itemContentOpts),
  );

  return (
    <div
      role="listitem"
      className={itemClassName}
      style={itemStyle}
      data-status={file.status}
    >
      {/* File Info */}
      <div className={itemInfoClassName} style={itemInfoStyle}>
        <div className={itemNameClassName} style={itemNameStyle}>
          {renderContent(content?.itemName, itemContentOpts, file.name)}
        </div>

        <div className={itemSizeClassName} style={itemSizeStyle}>
          {renderContent(
            content?.itemSize,
            itemContentOpts,
            formatFileSize(file.size),
          )}
        </div>

        {/* Progress bar for uploading files */}
        {showProgress && isUploading && (
          <ProgressBar progress={file.progress} showLabel={false} />
        )}

        {/* Error message */}
        {isError && file.error && (
          <div className={defaultFileListClasses.errorText}>{file.error}</div>
        )}
      </div>

      {/* Status text */}
      <div className={itemStatusClassName} style={itemStatusStyle}>
        {renderContent(
          content?.itemStatus,
          itemContentOpts,
          getStatusText(file.status),
        )}
      </div>

      {/* Remove button — not shown for uploading items */}
      {showRemoveButton && !isUploading && onRemove && (
        <button
          type="button"
          className={removeButtonClassName}
          style={removeButtonStyle}
          onClick={() => onRemove(file.id)}
          aria-label={`Remove ${file.name}`}
        >
          <RemoveIcon />
        </button>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export const FileList = forwardRef<HTMLDivElement, FileListProps>(
  (props, ref) => {
    const {
      files,
      onRemove,
      showProgress = true,
      showRemoveButton = true,
      appearance,
      content,
      className,
    } = props;

    // Compute list-level content opts
    const uploadingCount = files.filter((f) => f.status === "uploading").length;
    const completedCount = files.filter((f) => f.status === "complete").length;
    const errorCount = files.filter((f) => f.status === "error").length;
    const isAllComplete = files.length > 0 && completedCount === files.length;

    const contentOpts: FileListContentOpts = {
      files,
      uploadingCount,
      completedCount,
      errorCount,
      isAllComplete,
    };

    const containerStyle = resolveStyle(appearance?.container, contentOpts);
    const containerClassName = cn(
      defaultFileListClasses.container,
      resolveClassName(appearance?.container, contentOpts),
    );

    return (
      <div
        ref={ref}
        role="list"
        className={cn(className, containerClassName)}
        style={containerStyle}
      >
        {files.map((file) => (
          <FileListItem
            key={file.id}
            file={file}
            onRemove={onRemove}
            showProgress={showProgress}
            showRemoveButton={showRemoveButton}
            appearance={appearance}
            content={content}
          />
        ))}
      </div>
    );
  },
);
FileList.displayName = "FileList";
