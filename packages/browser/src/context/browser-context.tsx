import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { genUploader } from "s3-good/client";
import type { FileRouter } from "s3-good/server";
import type {
  BrowserConfig,
  BrowserItem,
  BrowserListFilters,
  PreviewType,
  SortConfig,
  SortDirection,
  SortField,
  ViewMode,
} from "s3-good/types";
import type { BrowserClient } from "../client";
import type { BrowserStore } from "../state";
import {
  useBreadcrumbs,
  useBrowser,
  useFilePreview,
  useFileSelection,
  useSearch,
  type BreadcrumbSegment,
  type SelectionClickEvent,
  type UseBrowserOptions,
} from "../hooks";

// ---------------------------------------------------------------------------
// Context value type
// ---------------------------------------------------------------------------

export interface BrowserContextValue {
  // State
  items: BrowserItem[];
  selectedKeys: Set<string>;
  currentPath: string;
  viewMode: ViewMode;
  sort: SortConfig;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  activeBucket: string;
  availableBuckets: string[];
  filters: BrowserListFilters;

  // Preview state
  previewItem: BrowserItem | null;
  previewUrl: string | null;
  isLoadingPreview: boolean;
  previewType: PreviewType | null;

  // Navigation
  navigateTo: (path: string) => void;
  openFolder: (item: BrowserItem) => void;
  goBack: () => void;
  goForward: () => void;
  goUp: () => void;
  breadcrumbs: BreadcrumbSegment[];

  // Selection (from useFileSelection)
  handleItemClick: (key: string, event: SelectionClickEvent) => void;
  selectedCount: number;
  isSelected: (key: string) => boolean;
  selectAll: () => void;
  deselectAll: () => void;

  // Selection (low-level from useBrowser)
  select: (key: string) => void;
  deselect: (key: string) => void;
  toggleSelect: (key: string) => void;
  selectRange: (fromKey: string, toKey: string) => void;

  // Actions
  deleteSelected: () => Promise<void>;
  renameItem: (key: string, newName: string) => Promise<void>;
  moveItem: (key: string, destination: string) => Promise<void>;
  copyItem: (key: string, destination: string) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  downloadFile: (key: string) => Promise<void>;

  // Preview actions
  openPreview: (item: BrowserItem) => Promise<void>;
  closePreview: () => void;
  navigatePreview: (direction: "prev" | "next") => Promise<void>;
  setPreviewItem: (item: BrowserItem | null) => void;

  // View
  setViewMode: (mode: ViewMode) => void;
  setSort: (field: SortField, direction?: SortDirection) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (next: BrowserListFilters) => void;
  setActiveBucket: (bucket: string) => void;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;

  // Search (from useSearch)
  searchInputValue: string;
  handleSearchChange: (value: string) => void;
  clearSearch: () => void;

  // Upload
  isUploading: boolean;
  uploadProgress: number;
  uploadFiles: (files: File[]) => Promise<void>;
  uploadEnabled: boolean;

  // Drag-and-drop
  isDragOver: boolean;
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;

  // Config
  config?: BrowserConfig;

  // Internal (for advanced sub-components)
  store: BrowserStore;
  client: BrowserClient;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const BrowserContext = createContext<BrowserContextValue | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the browser context value from within a `<BrowserProvider>`.
 *
 * @throws {Error} If called outside of a `<BrowserProvider>` or `<S3Browser.Root>`.
 */
export function useBrowserContext(): BrowserContextValue {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error(
      "useBrowserContext must be used within a <BrowserProvider> or <S3Browser.Root>. " +
        "Wrap your component tree with <BrowserProvider> to provide browser state.",
    );
  }
  return context;
}

// ---------------------------------------------------------------------------
// Upload configuration
// ---------------------------------------------------------------------------

export interface BrowserUploadConfig {
  /** URL for the upload API endpoint (passed to genUploader). */
  url?: string;
  /** The file-router endpoint slug (e.g. "imageUploader"). */
  endpoint?: string;
  /** Extra headers sent with upload requests. */
  headers?: HeadersInit | (() => Promise<HeadersInit> | HeadersInit);
  /**
   * Additional input passed to the upload endpoint.
   * Can be a static value or a function that receives the current browser context.
   */
  input?:
    | unknown
    | ((ctx: { currentPath: string; activeBucket?: string }) => unknown);
  /** Called when upload completes successfully. */
  onUploadComplete?: () => void;
  /** Called when upload fails. */
  onUploadError?: (error: Error) => void;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface BrowserProviderProps {
  url?: string;
  headers?: UseBrowserOptions["headers"];
  config?: BrowserConfig;
  /** Upload configuration. When provided, upload is enabled in the context. */
  upload?: BrowserUploadConfig;
  children: ReactNode;
}

export function BrowserProvider({
  url,
  headers,
  config,
  upload,
  children,
}: BrowserProviderProps) {
  const browser = useBrowser({ url, headers, config });
  const breadcrumbs = useBreadcrumbs(browser.currentPath, config?.rootPrefix);
  const search = useSearch(browser.store);
  const selection = useFileSelection(browser.store);
  const preview = useFilePreview(
    browser.store,
    browser.client,
    browser.activeBucket,
  );

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadEnabled = Boolean(upload?.endpoint);

  const uploader = useMemo(() => {
    if (!upload?.endpoint) return null;
    return genUploader<FileRouter>({ url: upload.url });
  }, [upload?.endpoint, upload?.url]);

  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      if (!uploader || !upload?.endpoint || files.length === 0) return;

      const context = {
        currentPath: browser.currentPath,
        activeBucket: browser.activeBucket || undefined,
      };

      setIsUploading(true);
      setUploadProgress(0);
      try {
        const resolvedInput =
          typeof upload.input === "function"
            ? upload.input(context)
            : upload.input;

        await uploader.uploadFiles(upload.endpoint, {
          files,
          input: resolvedInput,
          headers: upload.headers,
          onUploadProgress: ({ percentage }) => {
            setUploadProgress(percentage ?? 0);
          },
        });

        // Refresh file list after upload
        await browser.refresh();
        upload.onUploadComplete?.();
      } catch (error) {
        const normalized =
          error instanceof Error ? error : new Error("Upload failed");
        browser.store.setError(normalized.message);
        upload.onUploadError?.(normalized);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [uploader, upload, browser],
  );

  // Drag-and-drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        void handleUploadFiles(files);
      }
    },
    [handleUploadFiles],
  );

  const value: BrowserContextValue = useMemo(
    () => ({
      // State from useBrowser
      items: browser.items,
      selectedKeys: browser.selectedKeys,
      currentPath: browser.currentPath,
      viewMode: browser.viewMode,
      sort: browser.sort,
      searchQuery: browser.searchQuery,
      isLoading: browser.isLoading,
      error: browser.error,
      hasMore: browser.hasMore,
      activeBucket: browser.activeBucket,
      availableBuckets: browser.availableBuckets,
      filters: browser.filters,

      // Preview state from useFilePreview
      previewItem: preview.previewItem,
      previewUrl: preview.previewUrl,
      isLoadingPreview: preview.isLoadingPreview,
      previewType: preview.previewType,

      // Navigation
      navigateTo: browser.navigateTo,
      openFolder: browser.openFolder,
      goBack: browser.goBack,
      goForward: browser.goForward,
      goUp: browser.goUp,
      breadcrumbs,

      // Selection from useFileSelection
      handleItemClick: selection.handleClick,
      selectedCount: selection.selectedCount,
      isSelected: selection.isSelected,
      selectAll: selection.selectAll,
      deselectAll: selection.deselectAll,

      // Low-level selection from useBrowser
      select: browser.select,
      deselect: browser.deselect,
      toggleSelect: browser.toggleSelect,
      selectRange: browser.selectRange,

      // Actions
      deleteSelected: browser.deleteSelected,
      renameItem: browser.renameItem,
      moveItem: browser.moveItem,
      copyItem: browser.copyItem,
      createFolder: browser.createFolder,
      downloadFile: browser.downloadFile,

      // Preview actions from useFilePreview
      openPreview: preview.openPreview,
      closePreview: preview.closePreview,
      navigatePreview: preview.navigatePreview,
      setPreviewItem: browser.setPreviewItem,

      // View
      setViewMode: browser.setViewMode,
      setSort: browser.setSort,
      setSearchQuery: browser.setSearchQuery,
      setFilters: browser.setFilters,
      setActiveBucket: browser.setActiveBucket,
      loadMore: browser.loadMore,
      refresh: browser.refresh,

      // Search from useSearch
      searchInputValue: search.inputValue,
      handleSearchChange: search.handleChange,
      clearSearch: search.clear,

      // Upload
      isUploading,
      uploadProgress,
      uploadFiles: handleUploadFiles,
      uploadEnabled,

      // Drag-and-drop
      isDragOver,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,

      // Config
      config,

      // Internal
      store: browser.store,
      client: browser.client,
    }),
    [
      browser,
      breadcrumbs,
      selection,
      preview,
      search,
      config,
      isUploading,
      uploadProgress,
      handleUploadFiles,
      uploadEnabled,
      isDragOver,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
    ],
  );

  return (
    <BrowserContext.Provider value={value}>{children}</BrowserContext.Provider>
  );
}
