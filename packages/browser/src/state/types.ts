import type {
  BrowserItem,
  SortConfig,
  SortDirection,
  SortField,
  ViewMode,
} from "@s3-good/shared";

export interface BrowserState {
  currentPath: string;
  items: BrowserItem[];
  selectedKeys: Set<string>;
  viewMode: ViewMode;
  sort: SortConfig;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  continuationToken: string | undefined;
  hasMore: boolean;
  previewItem: BrowserItem | null;
  history: string[];
  historyIndex: number;
}

export type BrowserStateListener = (state: BrowserState) => void;

export interface BrowserStore {
  getState: () => BrowserState;
  subscribe: (listener: BrowserStateListener) => () => void;
  setState: (partial: Partial<BrowserState>) => void;

  navigate: (path: string) => void;
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

  setItems: (
    items: BrowserItem[],
    hasMore: boolean,
    continuationToken?: string,
  ) => void;
  appendItems: (
    newItems: BrowserItem[],
    hasMore: boolean,
    continuationToken?: string,
  ) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setPreviewItem: (item: BrowserItem | null) => void;

  getSortedItems: () => BrowserItem[];
}
