import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  BrowserConfig,
  BrowserItem,
  BrowserListFilters,
  SortConfig,
  SortDirection,
  SortField,
  ViewMode,
} from "@s3-good/shared";
import {
  createBrowserClient,
  type BrowserClient,
  type BrowserClientOptions,
} from "../client";
import {
  createBrowserStore,
  sortAndFilterItems,
  type BrowserStore,
} from "../state";

export interface UseBrowserOptions {
  url?: string;
  headers?: BrowserClientOptions["headers"];
  config?: BrowserConfig;
}

function createDownloadAnchor(
  url: string,
  fileName?: string,
): HTMLAnchorElement {
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
  const buckets =
    config?.buckets?.map((bucket) => bucket.trim()).filter(Boolean) ?? [];
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

function areSameBuckets(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export interface UseBrowserReturn {
  availableBuckets: string[];
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
  const refreshAbortRef = useRef<AbortController | null>(null);
  const loadMoreAbortRef = useRef<AbortController | null>(null);
  const refreshRequestIdRef = useRef(0);
  const loadMoreRequestIdRef = useRef(0);
  const [activeBucket, setActiveBucketState] = useState(
    resolveDefaultBucket(options.config),
  );
  const [availableBuckets, setAvailableBuckets] = useState(
    resolveAllowedBuckets(options.config),
  );
  const [filters, setFiltersState] = useState<BrowserListFilters>({});

  // Stabilize headers reference to avoid client recreation on every render
  const headersRef = useRef(options.headers);
  headersRef.current = options.headers;

  if (!storeRef.current) {
    storeRef.current = createBrowserStore({
      currentPath: normalizeInitialPath(options.config),
      viewMode: options.config?.defaultView ?? "grid",
      sort: options.config?.defaultSort ?? { field: "name", direction: "asc" },
    });
  }

  const store = storeRef.current;
  const client = useMemo(
    () =>
      createBrowserClient({
        url: options.url ?? options.config?.url,
        // Wrap headers in a function that reads from the ref so the client
        // always uses the latest headers without needing to be recreated.
        headers: async () => {
          const h = headersRef.current;
          if (!h) return {};
          if (typeof h === "function") {
            const resolved = await h();
            return resolved;
          }
          return h;
        },
      }),
    // headersRef is intentionally excluded — it's a ref that always holds the
    // latest value, so the client doesn't need to be recreated when headers change.
    [options.config?.url, options.url],
  );

  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );

  // Memoize sorted/filtered items using the pure function with state from useSyncExternalStore snapshot
  // This prevents tearing in concurrent mode (reads from snapshot, not mutable store)
  const sortedItems = useMemo(
    () => sortAndFilterItems(state.items, state.sort, state.searchQuery),
    [state.items, state.sort, state.searchQuery],
  );

  const listFilters = useMemo<BrowserListFilters>(
    () => ({
      ...filters,
      prefix: state.currentPath,
      search: state.searchQuery,
    }),
    [filters, state.currentPath, state.searchQuery],
  );

  const refresh = useCallback(async (): Promise<void> => {
    refreshAbortRef.current?.abort();
    const controller = new AbortController();
    refreshAbortRef.current = controller;
    const requestId = refreshRequestIdRef.current + 1;
    refreshRequestIdRef.current = requestId;

    store.setLoading(true);
    try {
      const result = await client.list({
        bucket: activeBucket || undefined,
        prefix: state.currentPath,
        continuationToken: undefined,
        filters: listFilters,
        signal: controller.signal,
      });
      if (refreshRequestIdRef.current !== requestId) return;
      store.setItems(
        result.items,
        result.hasMore,
        result.continuationToken ?? result.nextCursor,
      );

      const metaBuckets =
        result.meta?.buckets?.map((bucket) => bucket.trim()).filter(Boolean) ??
        [];
      if (metaBuckets.length > 0) {
        setAvailableBuckets((prev) =>
          areSameBuckets(prev, metaBuckets) ? prev : metaBuckets,
        );
      }

      if (result.meta?.bucket && result.meta.bucket !== activeBucket) {
        setActiveBucketState(result.meta.bucket);
      }
    } catch (error) {
      if (isAbortError(error)) {
        if (refreshRequestIdRef.current === requestId) {
          store.setLoading(false);
        }
        return;
      }
      store.setError(
        error instanceof Error ? error.message : "Failed to load files",
      );
    }
  }, [activeBucket, client, listFilters, state.currentPath, store]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!state.hasMore || state.isLoading) return;

    loadMoreAbortRef.current?.abort();
    const controller = new AbortController();
    loadMoreAbortRef.current = controller;
    const requestId = loadMoreRequestIdRef.current + 1;
    loadMoreRequestIdRef.current = requestId;

    store.setLoading(true);
    try {
      const token = state.continuationToken;
      const result = await client.list({
        bucket: activeBucket || undefined,
        prefix: state.currentPath,
        continuationToken: token,
        cursor: token,
        filters: listFilters,
        signal: controller.signal,
      });
      if (loadMoreRequestIdRef.current !== requestId) return;
      store.appendItems(
        result.items,
        result.hasMore,
        result.continuationToken ?? result.nextCursor,
      );
    } catch (error) {
      if (isAbortError(error)) {
        if (loadMoreRequestIdRef.current === requestId) {
          store.setLoading(false);
        }
        return;
      }
      store.setError(
        error instanceof Error ? error.message : "Failed to load more files",
      );
    }
  }, [
    activeBucket,
    client,
    listFilters,
    state.continuationToken,
    state.currentPath,
    state.hasMore,
    state.isLoading,
    store,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return () => {
      refreshAbortRef.current?.abort();
      loadMoreAbortRef.current?.abort();
    };
  }, []);

  const setActiveBucket = useCallback(
    (bucket: string) => {
      if (bucket === activeBucket) return;
      const configuredBuckets = resolveAllowedBuckets(options.config);
      const allowedBuckets =
        availableBuckets.length > 0 ? availableBuckets : configuredBuckets;
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
    },
    [activeBucket, availableBuckets, options.config, store],
  );

  const setFilters = useCallback((next: BrowserListFilters) => {
    setFiltersState(next);
  }, []);

  const navigateTo = useCallback(
    (path: string) => {
      store.navigate(path);
    },
    [store],
  );

  const openFolder = useCallback(
    (item: BrowserItem) => {
      if (item.kind === "folder") {
        store.navigate(item.key);
      }
    },
    [store],
  );

  const deleteSelected = useCallback(async (): Promise<void> => {
    const keys = Array.from(state.selectedKeys);
    if (keys.length === 0) return;
    const deletingSingleFolder =
      keys.length === 1 && (keys[0]?.endsWith("/") ?? false);

    try {
      if (keys.length === 1 && !deletingSingleFolder) {
        await client.deleteFile(keys[0] ?? "", activeBucket || undefined);
      } else {
        await client.deleteMany(keys, activeBucket || undefined);
      }
      store.deselectAll();
      await refresh();
    } catch (error) {
      store.setError(
        error instanceof Error
          ? error.message
          : "Failed to delete selected files",
      );
    }
  }, [activeBucket, client, refresh, state.selectedKeys, store]);

  const renameItem = useCallback(
    async (key: string, newName: string): Promise<void> => {
      try {
        await client.rename(key, newName, activeBucket || undefined);
        await refresh();
      } catch (error) {
        store.setError(
          error instanceof Error ? error.message : "Failed to rename item",
        );
      }
    },
    [activeBucket, client, refresh, store],
  );

  const moveItem = useCallback(
    async (key: string, destination: string): Promise<void> => {
      try {
        await client.move(key, destination, activeBucket || undefined);
        await refresh();
      } catch (error) {
        store.setError(
          error instanceof Error ? error.message : "Failed to move item",
        );
      }
    },
    [activeBucket, client, refresh, store],
  );

  const copyItem = useCallback(
    async (key: string, destination: string): Promise<void> => {
      try {
        await client.copy(key, destination, activeBucket || undefined);
        await refresh();
      } catch (error) {
        store.setError(
          error instanceof Error ? error.message : "Failed to copy item",
        );
      }
    },
    [activeBucket, client, refresh, store],
  );

  const createFolder = useCallback(
    async (name: string): Promise<void> => {
      try {
        await client.createFolder(
          state.currentPath,
          name,
          activeBucket || undefined,
        );
        await refresh();
      } catch (error) {
        store.setError(
          error instanceof Error ? error.message : "Failed to create folder",
        );
      }
    },
    [activeBucket, client, refresh, state.currentPath, store],
  );

  const downloadFile = useCallback(
    async (key: string): Promise<void> => {
      try {
        const url = await client.getDownloadUrl(key, activeBucket || undefined);
        const fileName = key.split("/").pop();
        const anchor = createDownloadAnchor(url, fileName);
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      } catch (error) {
        store.setError(
          error instanceof Error ? error.message : "Failed to download file",
        );
      }
    },
    [activeBucket, client, store],
  );

  // Memoize the return object so consumers get a stable reference
  // when no actual state has changed
  return useMemo<UseBrowserReturn>(
    () => ({
      // State (from useSyncExternalStore snapshot - stable per render)
      availableBuckets,
      activeBucket,
      currentPath: state.currentPath,
      items: sortedItems,
      selectedKeys: state.selectedKeys,
      viewMode: state.viewMode,
      sort: state.sort,
      searchQuery: state.searchQuery,
      filters,
      isLoading: state.isLoading,
      error: state.error,
      hasMore: state.hasMore,
      previewItem: state.previewItem,

      // Stable callbacks (wrapped in useCallback above)
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

      // Stable references
      store,
      client,
    }),
    [
      // State values
      availableBuckets,
      activeBucket,
      state.currentPath,
      sortedItems,
      state.selectedKeys,
      state.viewMode,
      state.sort,
      state.searchQuery,
      filters,
      state.isLoading,
      state.error,
      state.hasMore,
      state.previewItem,

      // Callbacks
      navigateTo,
      openFolder,
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

      // Stable references
      store,
      client,
    ],
  );
}
