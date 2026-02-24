import { useMemo, useRef, useState, type ReactNode } from "react";
import { genUploader } from "@s3-good/core/client";
import type { FileRouter } from "@s3-good/core/server";
import type { BrowserConfig, BrowserFile, BrowserItem } from "@s3-good/shared";
import { useBreadcrumbs, useBrowser, useSearch } from "../hooks";
import type { BreadcrumbSegment, UseSearchReturn, UseBrowserReturn } from "../hooks";
import type { ContextMenuItem } from "./context-menu";
import { Breadcrumbs } from "./breadcrumbs";
import { ConfirmDialog, CreateFolderDialog, RenameDialog } from "./dialogs";
import { FileGrid } from "./file-grid";
import type { FileGridVirtualizationOptions } from "./file-grid";
import { FileListView } from "./file-list-view";
import type { FileListVirtualizationOptions } from "./file-list-view";
import { PreviewModal } from "./preview/preview-modal";
import { SearchBar } from "./search-bar";
import { SelectionBar } from "./selection-bar";
import { Toolbar } from "./toolbar";

export interface S3BrowserProps {
  url?: string;
  headers?: HeadersInit | (() => Promise<HeadersInit> | HeadersInit);
  config?: BrowserConfig;
  className?: string;
  upload?: {
    endpoint?: string;
    url?: string;
    input?: unknown | ((ctx: { currentPath: string; activeBucket?: string }) => unknown);
    headers?: HeadersInit | (() => Promise<HeadersInit> | HeadersInit);
    accept?: string;
    multiple?: boolean;
    label?: string;
    onUploadFiles?: (files: File[], ctx: { currentPath: string; activeBucket?: string }) => void | Promise<void>;
    onUploadComplete?: () => void;
    onUploadError?: (error: Error) => void;
  };
  children?: (ctx: S3BrowserRenderContext) => ReactNode;
  virtualization?: Partial<{
    grid: FileGridVirtualizationOptions;
    list: FileListVirtualizationOptions;
  }>;
  appearance?: Partial<{
    container: string;
    header: string;
    searchBar: string;
    toolbar: string;
    grid: string;
    list: string;
    selectionBar: string;
    createFolderDialog: string;
    renameDialog: string;
    confirmDialog: string;
    error: string;
  }>;
}

export interface S3BrowserRenderContext {
  browser: UseBrowserReturn;
  breadcrumbs: BreadcrumbSegment[];
  search: UseSearchReturn;
  files: BrowserFile[];
  previewFile: BrowserFile | null;
  previewIndex: number;
  previewUrl: string | null;
  previewLoading: boolean;
  confirmDeleteOpen: boolean;
  createFolderOpen: boolean;
  renameTarget: BrowserItem | null;
  canUpload: boolean;
  isUploading: boolean;
  setConfirmDeleteOpen: (value: boolean) => void;
  setCreateFolderOpen: (value: boolean) => void;
  setRenameTarget: (value: BrowserItem | null) => void;
  handleUploadFiles: (files: File[]) => Promise<void>;
  openPreview: (item: BrowserItem) => Promise<void>;
  navigatePreview: (offset: number) => Promise<void>;
  getContextMenuItems: (item: BrowserItem) => ContextMenuItem[];
  clearPreview: () => void;
}

export function S3Browser({ url, headers, config, className, upload, children, virtualization, appearance }: S3BrowserProps) {
  const browser = useBrowser({ url, headers, config });
  const breadcrumbs = useBreadcrumbs(browser.currentPath, config?.rootPrefix);
  const search = useSearch(browser.store);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<BrowserItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const previewRequestIdRef = useRef(0);

  const previewFile = browser.previewItem?.kind === "file" ? browser.previewItem : null;

  const files = useMemo(
    () => browser.items.filter((item): item is BrowserFile => item.kind === "file"),
    [browser.items],
  );

  const previewIndex = previewFile
    ? files.findIndex((file) => file.key === previewFile.key)
    : -1;

  const loadPreviewUrl = async (key: string) => {
    const requestId = ++previewRequestIdRef.current;
    setPreviewLoading(true);
    try {
      const urlValue = await browser.client.getPreviewUrl(key, browser.activeBucket || undefined);
      if (requestId !== previewRequestIdRef.current) return;
      setPreviewUrl(urlValue);
    } finally {
      if (requestId === previewRequestIdRef.current) {
        setPreviewLoading(false);
      }
    }
  };

  const openPreview = async (item: BrowserItem) => {
    if (item.kind !== "file") {
      browser.openFolder(item);
      return;
    }

    browser.setPreviewItem(item);
    await loadPreviewUrl(item.key);
  };

  const navigatePreview = async (offset: number) => {
    if (previewIndex < 0) return;
    const nextFile = files[previewIndex + offset];
    if (!nextFile) return;
    browser.setPreviewItem(nextFile);
    await loadPreviewUrl(nextFile.key);
  };

  const canUpload = Boolean(upload?.onUploadFiles || upload?.endpoint);

  const handleUploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    if (!canUpload) return;

    const context = {
      currentPath: browser.currentPath,
      activeBucket: browser.activeBucket || undefined,
    };

    setIsUploading(true);
    try {
      if (upload?.onUploadFiles) {
        await upload.onUploadFiles(files, context);
      } else if (upload?.endpoint) {
        const { uploadFiles } = genUploader<FileRouter>({ url: upload.url });
        const resolvedInput = typeof upload.input === "function"
          ? upload.input(context)
          : upload.input;
        await uploadFiles(upload.endpoint, {
          files,
          input: resolvedInput,
          headers: upload.headers,
        });
      }

      await browser.refresh();
      upload?.onUploadComplete?.();
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error("Upload failed");
      browser.store.setError(normalized.message);
      upload?.onUploadError?.(normalized);
    } finally {
      setIsUploading(false);
    }
  };

  const getContextMenuItems = (item: BrowserItem): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [
      {
        key: "open",
        label: item.kind === "folder" ? "Open folder" : "Open preview",
        onSelect: () => {
          void openPreview(item);
        },
      },
      {
        key: "rename",
        label: "Rename",
        onSelect: () => {
          setRenameTarget(item);
        },
      },
    ];

    if (item.kind === "file") {
      items.push({
        key: "download",
        label: "Download",
        onSelect: () => {
          void browser.downloadFile(item.key);
        },
      });
    }

    items.push({
      key: "delete",
      label: "Delete",
      destructive: true,
      onSelect: () => {
        browser.deselectAll();
        browser.select(item.key);
        setConfirmDeleteOpen(true);
      },
    });

    return items;
  };

  const handleItemClick = (key: string, event: React.MouseEvent) => {
    if (event.shiftKey && browser.selectedKeys.size > 0) {
      const lastSelected = Array.from(browser.selectedKeys).pop();
      if (lastSelected) browser.selectRange(lastSelected, key);
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      browser.toggleSelect(key);
      return;
    }
    browser.deselectAll();
    browser.select(key);
  };

  const handleItemDoubleClick = (item: BrowserItem) => {
    void openPreview(item);
  };

  const handleItemContextMenu = (item: BrowserItem, event: React.SyntheticEvent) => {
    event.preventDefault();
    browser.deselectAll();
    browser.select(item.key);
  };

  const clearPreview = () => {
    previewRequestIdRef.current += 1;
    browser.setPreviewItem(null);
    setPreviewUrl(null);
    setPreviewLoading(false);
  };

  const renderContext: S3BrowserRenderContext = {
    browser,
    breadcrumbs,
    search,
    files,
    previewFile,
    previewIndex,
    previewUrl,
    previewLoading,
    confirmDeleteOpen,
    createFolderOpen,
    renameTarget,
    canUpload,
    isUploading,
    setConfirmDeleteOpen,
    setCreateFolderOpen,
    setRenameTarget,
    handleUploadFiles,
    openPreview,
    navigatePreview,
    getContextMenuItems,
    clearPreview,
  };

  if (children) {
    return <>{children(renderContext)}</>;
  }

  return (
    <div
      className={`space-y-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm md:p-5 ${appearance?.container ?? ""} ${className ?? ""}`.trim()}
      onDragOver={(event) => {
        if (!canUpload) return;
        event.preventDefault();
      }}
      onDrop={(event) => {
        if (!canUpload) return;
        event.preventDefault();
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (files.length > 0) {
          void handleUploadFiles(files);
        }
      }}
    >
      <div className={`grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center ${appearance?.header ?? ""}`.trim()}>
        <Breadcrumbs segments={breadcrumbs} onNavigate={browser.navigateTo} />
        <SearchBar
          value={search.inputValue}
          onChange={search.handleChange}
          onClear={search.clear}
          className={appearance?.searchBar}
        />
      </div>

      <Toolbar
        buckets={browser.availableBuckets}
        activeBucket={browser.activeBucket}
        viewMode={browser.viewMode}
        sort={browser.sort}
        selectedCount={browser.selectedKeys.size}
        onBucketChange={browser.setActiveBucket}
        onViewModeChange={browser.setViewMode}
        onSortChange={browser.setSort}
        onCreateFolder={() => setCreateFolderOpen(true)}
        onDeleteSelected={() => setConfirmDeleteOpen(true)}
        onUploadFiles={canUpload ? handleUploadFiles : undefined}
        uploadAccept={upload?.accept}
        uploadMultiple={upload?.multiple}
        uploadLabel={upload?.label}
        uploadDisabled={isUploading}
        onRefresh={() => void browser.refresh()}
        className={appearance?.toolbar}
      />

      {browser.error ? (
        <div className={`rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive ${appearance?.error ?? ""}`.trim()}>
          {browser.error}
        </div>
      ) : null}

      {browser.viewMode === "grid" ? (
        <FileGrid
          items={browser.items}
          selectedKeys={browser.selectedKeys}
          onItemClick={handleItemClick}
          onItemDoubleClick={handleItemDoubleClick}
          onItemContextMenu={handleItemContextMenu}
          getContextMenuItems={getContextMenuItems}
          isLoading={browser.isLoading}
          isSearching={Boolean(browser.searchQuery)}
          virtualization={virtualization?.grid}
          className={appearance?.grid}
        />
      ) : (
        <FileListView
          items={browser.items}
          selectedKeys={browser.selectedKeys}
          sort={browser.sort}
          onSort={browser.setSort}
          onItemClick={handleItemClick}
          onItemDoubleClick={handleItemDoubleClick}
          onItemContextMenu={handleItemContextMenu}
          getContextMenuItems={getContextMenuItems}
          isLoading={browser.isLoading}
          isSearching={Boolean(browser.searchQuery)}
          virtualization={virtualization?.list}
          className={appearance?.list}
        />
      )}

      <SelectionBar
        count={browser.selectedKeys.size}
        onClear={browser.deselectAll}
        onDelete={() => setConfirmDeleteOpen(true)}
        className={appearance?.selectionBar}
      />

      <CreateFolderDialog
        open={createFolderOpen}
        onCancel={() => setCreateFolderOpen(false)}
        onSubmit={(name) => {
          setCreateFolderOpen(false);
          void browser.createFolder(name);
        }}
        className={appearance?.createFolderDialog}
      />

      <RenameDialog
        open={Boolean(renameTarget)}
        currentName={renameTarget?.name ?? ""}
        onCancel={() => setRenameTarget(null)}
        onSubmit={(newName) => {
          if (!renameTarget) return;
          const targetKey = renameTarget.key;
          setRenameTarget(null);
          void browser.renameItem(targetKey, newName);
        }}
        className={appearance?.renameDialog}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete selected items"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          setConfirmDeleteOpen(false);
          void browser.deleteSelected();
        }}
        className={appearance?.confirmDialog}
      />

      {previewFile && previewUrl ? (
        <PreviewModal
          file={previewFile}
          url={previewUrl}
          isLoading={previewLoading}
          onPrev={() => void navigatePreview(-1)}
          onNext={() => void navigatePreview(1)}
          onClose={() => {
            clearPreview();
          }}
          onDownload={() => void browser.downloadFile(previewFile.key)}
          hasPrev={previewIndex > 0}
          hasNext={previewIndex >= 0 && previewIndex < files.length - 1}
        />
      ) : null}
    </div>
  );
}
