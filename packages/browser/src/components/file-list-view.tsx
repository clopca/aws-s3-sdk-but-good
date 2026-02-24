import { useEffect, useMemo, useRef, useState } from "react";
import type { BrowserItem, SortConfig, SortField } from "@s3-good/shared";
import type { ContextMenuItem } from "./context-menu";
import { EmptyState } from "./empty-state";
import { FileItem } from "./file-item";

const DEFAULT_LIST_ROW_HEIGHT = 46;
const DEFAULT_LIST_OVERSCAN = 6;
const DEFAULT_LIST_VIRTUALIZATION_THRESHOLD = 120;
const FALLBACK_VIEWPORT_HEIGHT = 480;

export interface FileListVirtualizationOptions {
  enabled?: boolean;
  rowHeight?: number;
  overscan?: number;
  threshold?: number;
}

export interface FileListViewProps {
  items: BrowserItem[];
  selectedKeys: Set<string>;
  sort: SortConfig;
  onSort: (field: SortField) => void;
  onItemClick: (key: string, event: React.MouseEvent) => void;
  onItemDoubleClick: (item: BrowserItem) => void;
  onItemContextMenu: (item: BrowserItem, event: React.SyntheticEvent) => void;
  getContextMenuItems?: (item: BrowserItem) => ContextMenuItem[];
  isLoading: boolean;
  isSearching?: boolean;
  className?: string;
  virtualization?: FileListVirtualizationOptions;
}

function SortHeader({
  field,
  label,
  sort,
  onSort,
}: {
  field: SortField;
  label: string;
  sort: SortConfig;
  onSort: (field: SortField) => void;
}) {
  const isActive = sort.field === field;
  const arrow = isActive ? (sort.direction === "asc" ? " ↑" : " ↓") : "";

  return (
    <button
      type="button"
      className={`rounded-md px-1 py-0.5 text-left text-xs font-semibold uppercase tracking-wide transition-colors hover:text-foreground ${
        isActive ? "text-foreground" : "text-muted-foreground"
      }`}
      onClick={() => onSort(field)}
    >
      {label}{arrow}
    </button>
  );
}

function LoadingRows() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex h-11 items-center gap-3 border-b border-border/60 px-3">
          <div className="h-5 w-5 animate-pulse rounded bg-muted" />
          <div className="h-3.5 flex-1 animate-pulse rounded bg-muted" style={{ maxWidth: `${180 + index * 20}px` }} />
        </div>
      ))}
    </div>
  );
}

export function FileListView({
  items,
  selectedKeys,
  sort,
  onSort,
  onItemClick,
  onItemDoubleClick,
  onItemContextMenu,
  getContextMenuItems,
  isLoading,
  isSearching,
  className,
  virtualization,
}: FileListViewProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(FALLBACK_VIEWPORT_HEIGHT);

  const rowHeight = Math.max(1, virtualization?.rowHeight ?? DEFAULT_LIST_ROW_HEIGHT);
  const overscan = Math.max(0, virtualization?.overscan ?? DEFAULT_LIST_OVERSCAN);
  const threshold = Math.max(0, virtualization?.threshold ?? DEFAULT_LIST_VIRTUALIZATION_THRESHOLD);
  const shouldVirtualize = Boolean(virtualization?.enabled) && items.length >= threshold;

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const updateViewport = () => {
      const measured = element.clientHeight || FALLBACK_VIEWPORT_HEIGHT;
      setViewportHeight(measured);
    };

    updateViewport();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateViewport);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    setScrollTop(0);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [items, shouldVirtualize, rowHeight, overscan, threshold]);

  if (isLoading) return <LoadingRows />;
  if (items.length === 0) return <EmptyState isSearching={isSearching} />;

  const visibleRange = useMemo(() => {
    if (!shouldVirtualize) {
      return {
        start: 0,
        end: items.length,
        totalHeight: 0,
      };
    }

    const firstVisibleRow = Math.floor(scrollTop / rowHeight);
    const visibleCount = Math.ceil(viewportHeight / rowHeight);
    const start = Math.max(0, firstVisibleRow - overscan);
    const end = Math.min(items.length, firstVisibleRow + visibleCount + overscan);
    return {
      start,
      end,
      totalHeight: items.length * rowHeight,
    };
  }, [items.length, overscan, rowHeight, scrollTop, shouldVirtualize, viewportHeight]);

  const visibleItems = shouldVirtualize
    ? items.slice(visibleRange.start, visibleRange.end)
    : items;

  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-card shadow-sm ${className ?? ""}`.trim()}>
      <div className="grid grid-cols-[minmax(0,1fr)_92px] items-center gap-3 border-b border-border bg-muted/40 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_110px_150px_120px]">
        <SortHeader field="name" label="Name" sort={sort} onSort={onSort} />
        <SortHeader field="size" label="Size" sort={sort} onSort={onSort} />
        <div className="hidden md:block">
          <SortHeader field="lastModified" label="Modified" sort={sort} onSort={onSort} />
        </div>
        <div className="hidden md:block">
          <SortHeader field="contentType" label="Type" sort={sort} onSort={onSort} />
        </div>
      </div>
      <div
        ref={scrollRef}
        className={`max-h-[60vh] overflow-auto ${shouldVirtualize ? "" : "divide-y divide-border/60"}`}
        onScroll={(event) => {
          if (!shouldVirtualize) return;
          setScrollTop(event.currentTarget.scrollTop);
        }}
      >
        {shouldVirtualize ? (
          <div style={{ height: `${visibleRange.totalHeight}px`, position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${visibleRange.start * rowHeight}px`,
              }}
            >
              {visibleItems.map((item) => (
                <FileItem
                  key={item.key}
                  item={item}
                  isSelected={selectedKeys.has(item.key)}
                  viewMode="list"
                  contextMenuItems={getContextMenuItems?.(item)}
                  onClick={(event) => onItemClick(item.key, event)}
                  onDoubleClick={() => onItemDoubleClick(item)}
                  onContextMenu={(event) => onItemContextMenu(item, event)}
                />
              ))}
            </div>
          </div>
        ) : (
          visibleItems.map((item) => (
            <FileItem
              key={item.key}
              item={item}
              isSelected={selectedKeys.has(item.key)}
              viewMode="list"
              contextMenuItems={getContextMenuItems?.(item)}
              onClick={(event) => onItemClick(item.key, event)}
              onDoubleClick={() => onItemDoubleClick(item)}
              onContextMenu={(event) => onItemContextMenu(item, event)}
            />
          ))
        )}
      </div>
    </div>
  );
}
