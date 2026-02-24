import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { genUploader } from "@s3-good/core/client";
import type { FileRouter } from "@s3-good/core/server";
import type { BrowserConfig, BrowserFile, BrowserItem } from "@s3-good/shared";
import {
  useBreadcrumbs,
  useBrowser,
  useKeyboardShortcuts,
  useSearch,
} from "../hooks";
import type {
  BreadcrumbSegment,
  UseSearchReturn,
  UseBrowserReturn,
} from "../hooks";
import {
  BrowserProvider,
  useBrowserContext,
  type BrowserProviderProps,
} from "../context/browser-context";
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
import { Button } from "./ui";
import { cn } from "./ui/utils";
import { UploadOverlay } from "./upload-overlay";
import {
  BrowserToolbar,
  BrowserBreadcrumbs,
  BrowserSearchBar,
  BrowserFileView,
  BrowserSelectionBar,
  BrowserPreviewModal,
  BrowserUploadButton,
} from "./compound";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface S3BrowserPaginationOptions {
  mode?: "manual" | "infinite";
  rootMargin?: string;
  threshold?: number;
}

export interface S3BrowserNotification {
  type: "success" | "error" | "info";
  message: string;
}

export interface S3BrowserProps {
  url?: string;
  headers?: HeadersInit | (() => Promise<HeadersInit> | HeadersInit);
  config?: BrowserConfig;
  className?: string;
  /**
   * Optional callback invoked after browser actions (create folder, rename, delete).
   * Use this to wire up toast notifications in the consuming app.
   */
  onNotify?: (notification: S3BrowserNotification) => void;
  upload?: {
    endpoint?: string;
    url?: string;
    input?:
      | unknown
      | ((ctx: { currentPath: string; activeBucket?: string }) => unknown);
    headers?: HeadersInit | (() => Promise<HeadersInit> | HeadersInit);
    accept?: string;
    multiple?: boolean;
    label?: string;
    onUploadFiles?: (
      files: File[],
      ctx: { currentPath: string; activeBucket?: string },
    ) => void | Promise<void>;
    onUploadComplete?: () => void;
    onUploadError?: (error: Error) => void;
  };
  children?: (ctx: S3BrowserRenderContext) => ReactNode;
  pagination?: S3BrowserPaginationOptions;
  /**
   * Optional virtualization controls for large directories.
   * Keep disabled for small folders and enable where item counts are high.
   */
  virtualization?: Partial<{
    grid: FileGridVirtualizationOptions;
    list: FileListVirtualizationOptions;
  }>;
  /**
   * Optional style slots to integrate with host app theming.
   */
  appearance?: Partial<{
    container: string;
    header: string;
    searchBar: string;
    toolbar: string;
    grid: string;
    list: string;
    loadMoreContainer: string;
    loadMoreButton: string;
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

// ---------------------------------------------------------------------------
// S3BrowserRoot – compound root that wraps children in BrowserProvider
// ---------------------------------------------------------------------------

export interface S3BrowserRootProps extends BrowserProviderProps {
  className?: string;
}

/**
 * Compound root component. Wraps children in `BrowserProvider` and renders
 * a styled container with `data-state` reflecting the browser state.
 *
 * Usage:
 * ```tsx
 * <S3Browser.Root url="/api/browser" config={config}>
 *   <S3Browser.Toolbar />
 *   <S3Browser.Breadcrumbs />
 *   <S3Browser.FileView />
 *   <S3Browser.SelectionBar />
 *   <S3Browser.PreviewModal />
 * </S3Browser.Root>
 * ```
 */
function S3BrowserCompoundRoot({
  children,
  className,
  ...providerProps
}: S3BrowserRootProps) {
  return (
    <BrowserProvider {...providerProps}>
      <S3BrowserRootContainer className={className}>
        {children}
      </S3BrowserRootContainer>
    </BrowserProvider>
  );
}

/** Inner container that reads context to set data-state and wire drag-and-drop. */
function S3BrowserRootContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const {
    isLoading,
    error,
    uploadEnabled,
    isDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  } = useBrowserContext();
  const dataState = isLoading ? "loading" : error ? "error" : "ready";

  return (
    <div
      className={cn(
        "relative space-y-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm md:p-5",
        className,
      )}
      data-state={dataState}
      onDragEnter={uploadEnabled ? handleDragEnter : undefined}
      onDragLeave={uploadEnabled ? handleDragLeave : undefined}
      onDragOver={uploadEnabled ? handleDragOver : undefined}
      onDrop={uploadEnabled ? handleDrop : undefined}
    >
      {children}
      {uploadEnabled && <UploadOverlay isDragOver={isDragOver} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// S3BrowserDefault – backward-compatible default layout
// ---------------------------------------------------------------------------

/**
 * Default `S3Browser` component. Renders the full standard layout with
 * toolbar, breadcrumbs, file view, selection bar, dialogs, and preview modal.
 *
 * This is the backward-compatible API:
 * ```tsx
 * <S3Browser url="/api/browser" config={config} />
 * ```
 *
 * For custom layouts, use the compound API:
 * ```tsx
 * <S3Browser.Root url="/api/browser">
 *   <S3Browser.Toolbar />
 *   <S3Browser.FileView />
 * </S3Browser.Root>
 * ```
 */
function S3BrowserDefault({
  url,
  headers,
  config,
  className,
  onNotify,
  upload,
  children,
  pagination,
  virtualization,
  appearance,
}: S3BrowserProps) {
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
  const loadMoreInFlightRef = useRef(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const previewFile =
    browser.previewItem?.kind === "file" ? browser.previewItem : null;

  const files = useMemo(
    () =>
      browser.items.filter((item): item is BrowserFile => item.kind === "file"),
    [browser.items],
  );

  const previewIndex = previewFile
    ? files.findIndex((file) => file.key === previewFile.key)
    : -1;

  const loadPreviewUrl = async (key: string) => {
    const requestId = ++previewRequestIdRef.current;
    setPreviewLoading(true);
    try {
      const urlValue = await browser.client.getPreviewUrl(
        key,
        browser.activeBucket || undefined,
      );
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
  const paginationMode = pagination?.mode ?? "manual";
  const supportsIntersectionObserver =
    typeof IntersectionObserver !== "undefined";
  const useInfinitePagination =
    paginationMode === "infinite" && supportsIntersectionObserver;

  const handleUploadFiles = async (uploadedFiles: File[]) => {
    if (uploadedFiles.length === 0) return;
    if (!canUpload) return;

    const context = {
      currentPath: browser.currentPath,
      activeBucket: browser.activeBucket || undefined,
    };

    setIsUploading(true);
    try {
      if (upload?.onUploadFiles) {
        await upload.onUploadFiles(uploadedFiles, context);
      } else if (upload?.endpoint) {
        const { uploadFiles } = genUploader<FileRouter>({ url: upload.url });
        const resolvedInput =
          typeof upload.input === "function"
            ? upload.input(context)
            : upload.input;
        await uploadFiles(upload.endpoint, {
          files: uploadedFiles,
          input: resolvedInput,
          headers: upload.headers,
        });
      }

      await browser.refresh();
      upload?.onUploadComplete?.();
    } catch (error) {
      const normalized =
        error instanceof Error ? error : new Error("Upload failed");
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

  const handleItemContextMenu = (
    item: BrowserItem,
    event: React.SyntheticEvent,
  ) => {
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

  const getThumbnailUrl = useCallback(
    (key: string) =>
      browser.client.getPreviewUrl(key, browser.activeBucket || undefined),
    [browser.client, browser.activeBucket],
  );

  const requestLoadMore = useCallback(() => {
    if (loadMoreInFlightRef.current) return;
    loadMoreInFlightRef.current = true;
    void browser.loadMore().finally(() => {
      loadMoreInFlightRef.current = false;
    });
  }, [browser]);

  useKeyboardShortcuts({
    selectedCount: browser.selectedKeys.size,
    onDelete: () => setConfirmDeleteOpen(true),
    onRename: () => {
      const selected = Array.from(browser.selectedKeys);
      if (selected.length === 1) {
        const item = browser.items.find((i) => i.key === selected[0]);
        if (item) setRenameTarget(item);
      }
    },
    onSelectAll: () => {
      for (const item of browser.items) {
        browser.select(item.key);
      }
    },
    onDeselectAll: browser.deselectAll,
  });

  useEffect(() => {
    if (!useInfinitePagination) return;
    if (!browser.hasMore) return;
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          requestLoadMore();
        }
      },
      {
        root: null,
        rootMargin: pagination?.rootMargin ?? "200px 0px",
        threshold: pagination?.threshold ?? 0,
      },
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [
    browser.hasMore,
    pagination?.rootMargin,
    pagination?.threshold,
    requestLoadMore,
    useInfinitePagination,
  ]);

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
      className={cn(
        "space-y-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm md:p-5",
        appearance?.container,
        className,
      )}
      data-state={
        browser.isLoading ? "loading" : browser.error ? "error" : "ready"
      }
      onDragOver={(event) => {
        if (!canUpload) return;
        event.preventDefault();
      }}
      onDrop={(event) => {
        if (!canUpload) return;
        event.preventDefault();
        const droppedFiles = Array.from(event.dataTransfer?.files ?? []);
        if (droppedFiles.length > 0) {
          void handleUploadFiles(droppedFiles);
        }
      }}
    >
      <div
        className={cn(
          "grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center",
          appearance?.header,
        )}
      >
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
        <div
          role="alert"
          aria-live="assertive"
          className={cn(
            "rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive",
            appearance?.error,
          )}
        >
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
          getPreviewUrl={getThumbnailUrl}
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

      {browser.hasMore && !useInfinitePagination ? (
        <div
          className={cn("flex justify-center", appearance?.loadMoreContainer)}
        >
          <Button
            type="button"
            variant="outline"
            disabled={browser.isLoading}
            className={appearance?.loadMoreButton}
            onClick={() => {
              requestLoadMore();
            }}
          >
            {browser.isLoading ? "Loading..." : "Load more"}
          </Button>
        </div>
      ) : null}
      {browser.hasMore && useInfinitePagination ? (
        <div
          ref={loadMoreSentinelRef}
          aria-label="Load more sentinel"
          className={cn("h-4", appearance?.loadMoreContainer)}
        />
      ) : null}

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
          void browser.createFolder(name).then(
            () => onNotify?.({ type: "success", message: "Folder created" }),
            (error: unknown) => {
              const message =
                error instanceof Error
                  ? error.message
                  : "Failed to create folder";
              onNotify?.({ type: "error", message });
            },
          );
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
          void browser.renameItem(targetKey, newName).then(
            () => onNotify?.({ type: "success", message: "Item renamed" }),
            (error: unknown) => {
              const message =
                error instanceof Error
                  ? error.message
                  : "Failed to rename item";
              onNotify?.({ type: "error", message });
            },
          );
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
          void browser.deleteSelected().then(
            () => onNotify?.({ type: "success", message: "Items deleted" }),
            (error: unknown) => {
              const message =
                error instanceof Error
                  ? error.message
                  : "Failed to delete items";
              onNotify?.({ type: "error", message });
            },
          );
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

// ---------------------------------------------------------------------------
// Compound component assembly via Object.assign
// ---------------------------------------------------------------------------

/**
 * S3Browser compound component.
 *
 * **Easy mode** (backward compatible – renders the full default layout):
 * ```tsx
 * <S3Browser url="/api/browser" config={config} />
 * ```
 *
 * **Custom mode** (composable – pick and arrange sub-components):
 * ```tsx
 * <S3Browser.Root url="/api/browser" config={config}>
 *   <S3Browser.Toolbar />
 *   <S3Browser.Breadcrumbs />
 *   <S3Browser.FileView />
 *   <S3Browser.SelectionBar />
 *   <S3Browser.PreviewModal />
 * </S3Browser.Root>
 * ```
 *
 * Sub-components:
 * - `S3Browser.Root` – wraps children in `BrowserProvider` with a styled container
 * - `S3Browser.Toolbar` – bucket selector, view mode, sort, actions
 * - `S3Browser.Breadcrumbs` – path breadcrumbs
 * - `S3Browser.SearchBar` – search input
 * - `S3Browser.FileView` – grid/list file view
 * - `S3Browser.SelectionBar` – selection count + bulk actions
 * - `S3Browser.PreviewModal` – file preview overlay
 */
export const S3Browser = Object.assign(S3BrowserDefault, {
  Root: S3BrowserCompoundRoot,
  Toolbar: BrowserToolbar,
  Breadcrumbs: BrowserBreadcrumbs,
  SearchBar: BrowserSearchBar,
  FileView: BrowserFileView,
  SelectionBar: BrowserSelectionBar,
  PreviewModal: BrowserPreviewModal,
  UploadButton: BrowserUploadButton,
  UploadZone: UploadOverlay,
});
