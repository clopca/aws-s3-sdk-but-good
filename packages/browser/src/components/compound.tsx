/**
 * Compound sub-components that consume BrowserContext.
 *
 * Each component reads the state it needs from `useBrowserContext()` and
 * delegates rendering to the existing presentational component. Props are
 * limited to layout/styling concerns (`className`, `appearance`) and optional
 * overrides so the presentational components remain usable standalone.
 */

import { useCallback, useMemo } from "react";
import type { BrowserFile, BrowserItem } from "@s3-good/shared";
import { useBrowserContext } from "../context/browser-context";
import { Breadcrumbs } from "./breadcrumbs";
import type { ContextMenuItem } from "./context-menu";
import { FileGrid, type FileGridVirtualizationOptions } from "./file-grid";
import {
  FileListView,
  type FileListVirtualizationOptions,
} from "./file-list-view";
import { PreviewModal } from "./preview/preview-modal";
import { SearchBar } from "./search-bar";
import { SelectionBar } from "./selection-bar";
import { Toolbar } from "./toolbar";

// ---------------------------------------------------------------------------
// BrowserToolbar
// ---------------------------------------------------------------------------

export interface BrowserToolbarProps {
  className?: string;
  /** Override upload handler; when provided the upload button is shown. */
  onUploadFiles?: (files: File[]) => void | Promise<void>;
  uploadLabel?: string;
  uploadAccept?: string;
  uploadMultiple?: boolean;
  uploadDisabled?: boolean;
  /** Called when "New Folder" is clicked. Consumers wire this to a dialog. */
  onCreateFolder?: () => void;
  /** Called when "Delete" is clicked. Consumers wire this to a confirm dialog. */
  onDeleteSelected?: () => void;
  appearance?: Parameters<typeof Toolbar>[0]["appearance"];
}

export function BrowserToolbar({
  className,
  onUploadFiles,
  uploadLabel,
  uploadAccept,
  uploadMultiple,
  uploadDisabled,
  onCreateFolder,
  onDeleteSelected,
  appearance,
}: BrowserToolbarProps) {
  const {
    availableBuckets,
    activeBucket,
    viewMode,
    sort,
    selectedCount,
    setActiveBucket,
    setViewMode,
    setSort,
    refresh,
  } = useBrowserContext();

  return (
    <Toolbar
      buckets={availableBuckets}
      activeBucket={activeBucket}
      viewMode={viewMode}
      sort={sort}
      selectedCount={selectedCount}
      onBucketChange={setActiveBucket}
      onViewModeChange={setViewMode}
      onSortChange={setSort}
      onCreateFolder={onCreateFolder ?? (() => {})}
      onDeleteSelected={onDeleteSelected ?? (() => {})}
      onUploadFiles={onUploadFiles}
      uploadLabel={uploadLabel}
      uploadAccept={uploadAccept}
      uploadMultiple={uploadMultiple}
      uploadDisabled={uploadDisabled}
      onRefresh={() => void refresh()}
      className={className}
      appearance={appearance}
    />
  );
}

// ---------------------------------------------------------------------------
// BrowserBreadcrumbs
// ---------------------------------------------------------------------------

export interface BrowserBreadcrumbsProps {
  className?: string;
}

export function BrowserBreadcrumbs({ className }: BrowserBreadcrumbsProps) {
  const { breadcrumbs, navigateTo } = useBrowserContext();

  const breadcrumbsEl = (
    <Breadcrumbs segments={breadcrumbs} onNavigate={navigateTo} />
  );

  // Breadcrumbs doesn't accept className – wrap when styling is needed
  if (className) {
    return <div className={className}>{breadcrumbsEl}</div>;
  }

  return breadcrumbsEl;
}

// ---------------------------------------------------------------------------
// BrowserSearchBar
// ---------------------------------------------------------------------------

export interface BrowserSearchBarProps {
  placeholder?: string;
  className?: string;
  appearance?: Parameters<typeof SearchBar>[0]["appearance"];
}

export function BrowserSearchBar({
  placeholder,
  className,
  appearance,
}: BrowserSearchBarProps) {
  const { searchInputValue, handleSearchChange, clearSearch } =
    useBrowserContext();

  return (
    <SearchBar
      value={searchInputValue}
      onChange={handleSearchChange}
      onClear={clearSearch}
      placeholder={placeholder}
      className={className}
      appearance={appearance}
    />
  );
}

// ---------------------------------------------------------------------------
// BrowserFileView
// ---------------------------------------------------------------------------

export interface BrowserFileViewProps {
  className?: string;
  /** Context menu builder – receives an item, returns menu entries. */
  getContextMenuItems?: (item: BrowserItem) => ContextMenuItem[];
  virtualization?: Partial<{
    grid: FileGridVirtualizationOptions;
    list: FileListVirtualizationOptions;
  }>;
  /** Called on double-click. Defaults to openFolder (folders) / openPreview (files). */
  onItemDoubleClick?: (item: BrowserItem) => void;
}

export function BrowserFileView({
  className,
  getContextMenuItems,
  virtualization,
  onItemDoubleClick,
}: BrowserFileViewProps) {
  const {
    viewMode,
    items,
    selectedKeys,
    sort,
    isLoading,
    searchQuery,
    activeBucket,
    handleItemClick,
    openFolder,
    openPreview,
    deselectAll,
    select,
    setSort,
    client,
  } = useBrowserContext();

  // Translate React.MouseEvent → SelectionClickEvent expected by context
  const onItemClick = useCallback(
    (key: string, event: React.MouseEvent) => {
      handleItemClick(key, {
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
      });
    },
    [handleItemClick],
  );

  const handleDoubleClick = useCallback(
    (item: BrowserItem) => {
      if (onItemDoubleClick) {
        onItemDoubleClick(item);
        return;
      }
      if (item.kind === "folder") {
        openFolder(item);
      } else {
        void openPreview(item);
      }
    },
    [onItemDoubleClick, openFolder, openPreview],
  );

  const handleContextMenu = useCallback(
    (item: BrowserItem, event: React.SyntheticEvent) => {
      event.preventDefault();
      deselectAll();
      select(item.key);
    },
    [deselectAll, select],
  );

  const getThumbnailUrl = useCallback(
    (key: string) => client.getPreviewUrl(key, activeBucket || undefined),
    [client, activeBucket],
  );

  if (viewMode === "grid") {
    return (
      <FileGrid
        items={items}
        selectedKeys={selectedKeys}
        onItemClick={onItemClick}
        onItemDoubleClick={handleDoubleClick}
        onItemContextMenu={handleContextMenu}
        getContextMenuItems={getContextMenuItems}
        getPreviewUrl={getThumbnailUrl}
        isLoading={isLoading}
        isSearching={Boolean(searchQuery)}
        virtualization={virtualization?.grid}
        className={className}
      />
    );
  }

  return (
    <FileListView
      items={items}
      selectedKeys={selectedKeys}
      sort={sort}
      onSort={setSort}
      onItemClick={onItemClick}
      onItemDoubleClick={handleDoubleClick}
      onItemContextMenu={handleContextMenu}
      getContextMenuItems={getContextMenuItems}
      isLoading={isLoading}
      isSearching={Boolean(searchQuery)}
      virtualization={virtualization?.list}
      className={className}
    />
  );
}

// ---------------------------------------------------------------------------
// BrowserSelectionBar
// ---------------------------------------------------------------------------

export interface BrowserSelectionBarProps {
  className?: string;
  /** Called when "Delete" is clicked. Consumers wire this to a confirm dialog. */
  onDelete?: () => void;
  appearance?: Parameters<typeof SelectionBar>[0]["appearance"];
}

export function BrowserSelectionBar({
  className,
  onDelete,
  appearance,
}: BrowserSelectionBarProps) {
  const { selectedCount, deselectAll, deleteSelected } = useBrowserContext();

  return (
    <SelectionBar
      count={selectedCount}
      onClear={deselectAll}
      onDelete={onDelete ?? (() => void deleteSelected())}
      className={className}
      appearance={appearance}
    />
  );
}

// ---------------------------------------------------------------------------
// BrowserPreviewModal
// ---------------------------------------------------------------------------

export interface BrowserPreviewModalProps {
  /** Called when the user clicks "Download" in the preview. */
  onDownload?: (file: BrowserFile) => void;
}

export function BrowserPreviewModal({
  onDownload,
}: BrowserPreviewModalProps = {}) {
  const {
    previewItem,
    previewUrl,
    isLoadingPreview,
    items,
    navigatePreview,
    closePreview,
    downloadFile,
  } = useBrowserContext();

  const previewFile =
    previewItem && previewItem.kind === "file" ? previewItem : null;

  const files = useMemo(
    () => items.filter((item): item is BrowserFile => item.kind === "file"),
    [items],
  );

  const previewIndex = previewFile
    ? files.findIndex((f) => f.key === previewFile.key)
    : -1;

  const hasPrev = previewIndex > 0;
  const hasNext = previewIndex >= 0 && previewIndex < files.length - 1;

  if (!previewFile || !previewUrl) return null;

  return (
    <PreviewModal
      file={previewFile}
      url={previewUrl}
      isLoading={isLoadingPreview}
      onPrev={() => void navigatePreview("prev")}
      onNext={() => void navigatePreview("next")}
      onClose={closePreview}
      onDownload={
        onDownload
          ? () => onDownload(previewFile)
          : () => void downloadFile(previewFile.key)
      }
      hasPrev={hasPrev}
      hasNext={hasNext}
    />
  );
}
