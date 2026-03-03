import type {
  BrowserItem,
  SortConfig,
  SortDirection,
  SortField,
  ViewMode,
} from "@s3-good-internal/shared";
import type { BrowserState, BrowserStateListener, BrowserStore } from "./types";

const DEFAULT_SORT: SortConfig = { field: "name", direction: "asc" };

function normalizePath(path: string): string {
  if (!path) return "";
  return path.endsWith("/") ? path : `${path}/`;
}

function compareValues(
  a: string | number,
  b: string | number,
  direction: SortDirection,
): number {
  if (typeof a === "number" && typeof b === "number") {
    return direction === "asc" ? a - b : b - a;
  }

  const result = String(a).localeCompare(String(b), undefined, {
    sensitivity: "base",
    numeric: true,
  });
  return direction === "asc" ? result : -result;
}

function itemSortValue(item: BrowserItem, field: SortField): string | number {
  if (field === "size") {
    return item.kind === "file" ? item.size : -1;
  }
  if (field === "lastModified") {
    return item.kind === "file" ? item.lastModified.getTime() : -1;
  }
  if (field === "contentType") {
    return item.kind === "file" ? item.contentType : "";
  }
  return item.name;
}

/**
 * Pure function that sorts and filters items based on sort config and search query.
 * Takes state as input to avoid reading from mutable store (prevents tearing in concurrent mode).
 */
export function sortAndFilterItems(
  items: BrowserItem[],
  sort: SortConfig,
  searchQuery: string,
): BrowserItem[] {
  const query = searchQuery.trim().toLowerCase();

  const filtered = query
    ? items.filter((item) => item.name.toLowerCase().includes(query))
    : items;

  return [...filtered].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return compareValues(
      itemSortValue(a, sort.field),
      itemSortValue(b, sort.field),
      sort.direction,
    );
  });
}

export function createBrowserStore(
  initialState?: Partial<BrowserState>,
): BrowserStore {
  let state: BrowserState = {
    currentPath: "",
    items: [],
    selectedKeys: new Set(),
    viewMode: "grid",
    sort: DEFAULT_SORT,
    searchQuery: "",
    isLoading: false,
    error: null,
    continuationToken: undefined,
    hasMore: false,
    previewItem: null,
    history: [""],
    historyIndex: 0,
    ...initialState,
  };

  const listeners = new Set<BrowserStateListener>();

  function getState(): BrowserState {
    return state;
  }

  function notify(): void {
    for (const listener of listeners) {
      listener(state);
    }
  }

  function setState(partial: Partial<BrowserState>): void {
    state = { ...state, ...partial };
    notify();
  }

  function subscribe(listener: BrowserStateListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function resetForNavigation(
    path: string,
    newHistory?: string[],
    historyIndex?: number,
  ): void {
    setState({
      currentPath: normalizePath(path),
      items: [],
      selectedKeys: new Set(),
      continuationToken: undefined,
      hasMore: false,
      searchQuery: "",
      error: null,
      ...(newHistory ? { history: newHistory } : {}),
      ...(historyIndex !== undefined ? { historyIndex } : {}),
    });
  }

  function navigate(path: string): void {
    const normalizedPath = normalizePath(path);
    const prev = getState();
    const newHistory = [
      ...prev.history.slice(0, prev.historyIndex + 1),
      normalizedPath,
    ];

    resetForNavigation(normalizedPath, newHistory, newHistory.length - 1);
  }

  function goBack(): void {
    const prev = getState();
    if (prev.historyIndex <= 0) return;
    const newIndex = prev.historyIndex - 1;
    const path = prev.history[newIndex] ?? "";
    resetForNavigation(path, undefined, newIndex);
  }

  function goForward(): void {
    const prev = getState();
    if (prev.historyIndex >= prev.history.length - 1) return;
    const newIndex = prev.historyIndex + 1;
    const path = prev.history[newIndex] ?? "";
    resetForNavigation(path, undefined, newIndex);
  }

  function goUp(): void {
    const prev = getState();
    const current = prev.currentPath.replace(/\/$/, "");
    if (!current) {
      navigate("");
      return;
    }

    const parts = current.split("/").filter(Boolean);
    parts.pop();
    navigate(parts.length > 0 ? `${parts.join("/")}/` : "");
  }

  function select(key: string): void {
    const next = new Set(getState().selectedKeys);
    next.add(key);
    setState({ selectedKeys: next });
  }

  function deselect(key: string): void {
    const next = new Set(getState().selectedKeys);
    next.delete(key);
    setState({ selectedKeys: next });
  }

  function toggleSelect(key: string): void {
    const selected = getState().selectedKeys;
    if (selected.has(key)) {
      deselect(key);
      return;
    }
    select(key);
  }

  function selectAll(): void {
    const keys = new Set(getState().items.map((item) => item.key));
    setState({ selectedKeys: keys });
  }

  function deselectAll(): void {
    setState({ selectedKeys: new Set() });
  }

  function selectRange(fromKey: string, toKey: string): void {
    const items = getState().items;
    const keys = items.map((item) => item.key);
    const from = keys.indexOf(fromKey);
    const to = keys.indexOf(toKey);
    if (from === -1 || to === -1) return;

    const start = Math.min(from, to);
    const end = Math.max(from, to);
    const next = new Set(getState().selectedKeys);

    for (let i = start; i <= end; i += 1) {
      const key = keys[i];
      if (key) next.add(key);
    }

    setState({ selectedKeys: next });
  }

  function setViewMode(mode: ViewMode): void {
    setState({ viewMode: mode });
  }

  function setSort(field: SortField, direction?: SortDirection): void {
    const prev = getState();
    const nextDirection =
      direction ??
      (prev.sort.field === field && prev.sort.direction === "asc"
        ? "desc"
        : "asc");

    setState({
      sort: {
        field,
        direction: nextDirection,
      },
    });
  }

  function setSearchQuery(query: string): void {
    setState({ searchQuery: query });
  }

  function setItems(
    items: BrowserItem[],
    hasMore: boolean,
    continuationToken?: string,
  ): void {
    setState({
      items,
      hasMore,
      continuationToken,
      isLoading: false,
      error: null,
    });
  }

  function appendItems(
    newItems: BrowserItem[],
    hasMore: boolean,
    continuationToken?: string,
  ): void {
    setState({
      items: [...getState().items, ...newItems],
      hasMore,
      continuationToken,
      isLoading: false,
      error: null,
    });
  }

  function setLoading(isLoading: boolean): void {
    setState({ isLoading });
  }

  function setError(error: string | null): void {
    setState({ error, isLoading: false });
  }

  function setPreviewItem(item: BrowserItem | null): void {
    setState({ previewItem: item });
  }

  function getSortedItems(): BrowserItem[] {
    const snapshot = getState();
    return sortAndFilterItems(
      snapshot.items,
      snapshot.sort,
      snapshot.searchQuery,
    );
  }

  return {
    getState,
    subscribe,
    setState,
    navigate,
    goBack,
    goForward,
    goUp,
    select,
    deselect,
    toggleSelect,
    selectAll,
    deselectAll,
    selectRange,
    setViewMode,
    setSort,
    setSearchQuery,
    setItems,
    appendItems,
    setLoading,
    setError,
    setPreviewItem,
    getSortedItems,
  };
}
