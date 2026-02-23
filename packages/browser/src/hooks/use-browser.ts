import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type {
  BrowserConfig,
  BrowserItem,
  BrowserListFilters,
  SortConfig,
  SortDirection,
  SortField,
  ViewMode,
} from "@s3-good/shared";
import { createBrowserClient, type BrowserClient, type BrowserClientOptions } from "../client";
import { createBrowserStore, type BrowserStore } from "../state";

export interface UseBrowserOptions {
  url?: string;
  headers?: BrowserClientOptions["headers"];
  config?: BrowserConfig;
}

function createDownloadAnchor(url: string, fileName?: string): HTMLAnchorElement {
  const anchor = document.createElement("a");
  anchor.href = url;
  if (fileName) anchor.download = fileName;
  anchor.rel = "noopener noreferrer";
  return anchor;
}

function normalizeInitialPath(config?: BrowserConfig): string {
  return config?.rootPrefix ?? "";
}

function resolveAllowedBuckets(config?: BrowserConfig): string[] {
  const buckets = config?.buckets?.map((bucket) => bucket.trim()).filter(Boolean) ?? [];
  return buckets;
}

function resolveDefaultBucket(config?: BrowserConfig): string {
  const allowedBuckets = resolveAllowedBuckets(config);
  if (allowedBuckets.length === 0) {
    return config?.defaultBucket ?? "";
  }

  if (config?.defaultBucket && allowedBuckets.includes(config.defaultBucket)) {
    return config.defaultBucket;
  }

  return allowedBuckets[0] ?? "";
}

export interface UseBrowserReturn {
  activeBucket: string;
  currentPath: string;
  items: BrowserItem[];
  selectedKeys: Set<string>;
  viewMode: ViewMode;
  sort: SortConfig;
  searchQuery: string;
  filters: BrowserListFilters;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  previewItem: BrowserItem | null;
  navigateTo: (path: string) => void;
  openFolder: (item: BrowserItem) => void;
  goBack: () => void;
  goForward: () => void;
  goUp: () => void;
  select: (key: string) => void;
  deselect: (key: string) => void;
  toggleSelect: (key: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  selectRange: (fromKey: string, toKey: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setSort: (field: SortField, direction?: SortDirection) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (next: BrowserListFilters) => void;
  setActiveBucket: (bucket: string) => void;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  deleteSelected: () => Promise<void>;
  renameItem: (key: string, newName: string) => Promise<void>;
  moveItem: (key: string, destination: string) => Promise<void>;
  copyItem: (key: string, destination: string) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  downloadFile: (key: string) => Promise<void>;
  setPreviewItem: (item: BrowserItem | null) => void;
  store: BrowserStore;
  client: BrowserClient;
}

export function useBrowser(options: UseBrowserOptions = {}): UseBrowserReturn {
  const storeRef = useRef<BrowserStore | null>(null);
  const [activeBucket, setActiveBucketState] = useState(resolveDefaultBucket(options.config));
  const [filters, setFiltersState] = useState<BrowserListFilters>({});

  if (!storeRef.current) {
    storeRef.current = createBrowserStore({
      currentPath: normalizeInitialPath(options.config),
      viewMode: options.config?.defaultView ?? "grid",
      sort: options.config?.defaultSort ?? { field: "name", direction: "asc" },
    });
  }

  const store = storeRef.current;
  const client = useMemo(
    () => createBrowserClient({
      url: options.url ?? options.config?.url,
      headers: options.headers,
    }),
    [options.config?.url, options.headers, options.url],
  );

  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);

  const listFilters = useMemo<BrowserListFilters>(() => ({
    ...filters,
    prefix: state.currentPath,
    search: state.searchQuery,
  }), [filters, state.currentPath, state.searchQuery]);

  const refresh = useCallback(async (): Promise<void> => {
    store.setLoading(true);
    try {
      const result = await client.list({
        bucket: activeBucket || undefined,
        prefix: state.currentPath,
        continuationToken: undefined,
        filters: listFilters,
      });
      store.setItems(result.items, result.hasMore, result.continuationToken ?? result.nextCursor);
    } catch (error) {
      store.setError(error instanceof Error ? error.message : "Failed to load files");
    }
  }, [activeBucket, client, listFilters, state.currentPath, store]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!state.hasMore || state.isLoading) return;

    store.setLoading(true);
    try {
      const token = state.continuationToken;
      const result = await client.list({
        bucket: activeBucket || undefined,
        prefix: state.currentPath,
        continuationToken: token,
        cursor: token,
        filters: listFilters,
      });
      store.appendItems(result.items, result.hasMore, result.continuationToken ?? result.nextCursor);
    } catch (error) {
      store.setError(error instanceof Error ? error.message : "Failed to load more files");
    }
  }, [activeBucket, client, listFilters, state.continuationToken, state.currentPath, state.hasMore, state.isLoading, store]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setActiveBucket = useCallback((bucket: string) => {
    if (bucket === activeBucket) return;
    const allowedBuckets = resolveAllowedBuckets(options.config);
    if (allowedBuckets.length > 0 && !allowedBuckets.includes(bucket)) return;

    setActiveBucketState(bucket);
    const initialPath = normalizeInitialPath(options.config);
    store.setState({
      currentPath: initialPath,
      items: [],
      selectedKeys: new Set(),
      continuationToken: undefined,
      hasMore: false,
      previewItem: null,
      history: [initialPath],
      historyIndex: 0,
      error: null,
    });
  }, [activeBucket, options.config, store]);

  const setFilters = useCallback((next: BrowserListFilters) => {
    setFiltersState(next);
  }, []);

  const navigateTo = useCallback((path: string) => {
    store.navigate(path);
  }, [store]);

  const openFolder = useCallback((item: BrowserItem) => {
    if (item.kind === "folder") {
      store.navigate(item.key);
    }
  }, [store]);

  const deleteSelected = useCallback(async (): Promise<void> => {
    const keys = Array.from(state.selectedKeys);
    if (keys.length === 0) return;

    try {
      if (keys.length === 1) {
        await client.deleteFile(keys[0] ?? "", activeBucket || undefined);
      } else {
        await client.deleteMany(keys, activeBucket || undefined);
      }
      store.deselectAll();
      await refresh();
    } catch (error) {
      store.setError(error instanceof Error ? error.message : "Failed to delete selected files");
    }
  }, [activeBucket, client, refresh, state.selectedKeys, store]);

  const renameItem = useCallback(async (key: string, newName: string): Promise<void> => {
    try {
      await client.rename(key, newName, activeBucket || undefined);
      await refresh();
    } catch (error) {
      store.setError(error instanceof Error ? error.message : "Failed to rename item");
    }
  }, [activeBucket, client, refresh, store]);

  const moveItem = useCallback(async (key: string, destination: string): Promise<void> => {
    try {
      await client.move(key, destination, activeBucket || undefined);
      await refresh();
    } catch (error) {
      store.setError(error instanceof Error ? error.message : "Failed to move item");
    }
  }, [activeBucket, client, refresh, store]);

  const copyItem = useCallback(async (key: string, destination: string): Promise<void> => {
    try {
      await client.copy(key, destination, activeBucket || undefined);
      await refresh();
    } catch (error) {
      store.setError(error instanceof Error ? error.message : "Failed to copy item");
    }
  }, [activeBucket, client, refresh, store]);

  const createFolder = useCallback(async (name: string): Promise<void> => {
    try {
      await client.createFolder(state.currentPath, name, activeBucket || undefined);
      await refresh();
    } catch (error) {
      store.setError(error instanceof Error ? error.message : "Failed to create folder");
    }
  }, [activeBucket, client, refresh, state.currentPath, store]);

  const downloadFile = useCallback(async (key: string): Promise<void> => {
    try {
      const url = await client.getDownloadUrl(key, activeBucket || undefined);
      const fileName = key.split("/").pop();
      const anchor = createDownloadAnchor(url, fileName);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch (error) {
      store.setError(error instanceof Error ? error.message : "Failed to download file");
    }
  }, [activeBucket, client, store]);

  return {
    activeBucket,
    currentPath: state.currentPath,
    items: store.getSortedItems(),
    selectedKeys: state.selectedKeys,
    viewMode: state.viewMode,
    sort: state.sort,
    searchQuery: state.searchQuery,
    filters,
    isLoading: state.isLoading,
    error: state.error,
    hasMore: state.hasMore,
    previewItem: state.previewItem,
    navigateTo,
    openFolder,
    goBack: store.goBack,
    goForward: store.goForward,
    goUp: store.goUp,
    select: store.select,
    deselect: store.deselect,
    toggleSelect: store.toggleSelect,
    selectAll: store.selectAll,
    deselectAll: store.deselectAll,
    selectRange: store.selectRange,
    setViewMode: store.setViewMode,
    setSort: store.setSort,
    setSearchQuery: store.setSearchQuery,
    setFilters,
    setActiveBucket,
    refresh,
    loadMore,
    deleteSelected,
    renameItem,
    moveItem,
    copyItem,
    createFolder,
    downloadFile,
    setPreviewItem: store.setPreviewItem,
    store,
    client,
  };
}
