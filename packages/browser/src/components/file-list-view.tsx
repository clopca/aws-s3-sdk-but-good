import { forwardRef, useEffect, useRef } from "react";
import {
  useVirtualizer,
  observeElementRect as defaultObserveElementRect,
} from "@tanstack/react-virtual";
import type { Rect, Virtualizer } from "@tanstack/react-virtual";
import type { BrowserItem, SortConfig, SortField } from "@s3-good/shared";
import type { ContextMenuItem } from "./context-menu";
import { EmptyState } from "./empty-state";
import { FileItem } from "./file-item";
import { FileListSkeleton } from "./skeleton";
import { cn } from "./ui";

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
      className={cn(
        "rounded-md px-1 py-0.5 text-left text-xs font-semibold uppercase tracking-wide transition-colors hover:text-foreground",
        isActive ? "text-foreground" : "text-muted-foreground",
      )}
      onClick={() => onSort(field)}
    >
      {label}
      {arrow}
    </button>
  );
}

/**
 * Creates an `observeElementRect` that falls back to the given dimensions
 * when the element reports zero size (e.g. in jsdom test environments).
 */
function observeElementRectWithFallback(fallback: Rect) {
  return <T extends Element>(
    instance: Virtualizer<T, Element>,
    cb: (rect: Rect) => void,
  ) => {
    return defaultObserveElementRect(instance, (rect) => {
      if (rect.width === 0 && rect.height === 0) {
        cb(fallback);
      } else {
        cb(rect);
      }
    });
  };
}

const FileListView = forwardRef<HTMLDivElement, FileListViewProps>(
  (
    {
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
    },
    ref,
  ) => {
    const scrollRef = useRef<HTMLDivElement | null>(null);

    const rowHeight = Math.max(
      1,
      virtualization?.rowHeight ?? DEFAULT_LIST_ROW_HEIGHT,
    );
    const overscan = Math.max(
      0,
      virtualization?.overscan ?? DEFAULT_LIST_OVERSCAN,
    );
    const threshold = Math.max(
      0,
      virtualization?.threshold ?? DEFAULT_LIST_VIRTUALIZATION_THRESHOLD,
    );
    const shouldVirtualize =
      Boolean(virtualization?.enabled) && items.length >= threshold;

    const virtualizer = useVirtualizer({
      count: shouldVirtualize ? items.length : 0,
      getScrollElement: () => scrollRef.current,
      estimateSize: () => rowHeight,
      overscan,
      observeElementRect: observeElementRectWithFallback({
        width: 0,
        height: FALLBACK_VIEWPORT_HEIGHT,
      }),
    });

    // Reset scroll position when item list changes
    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
      if (shouldVirtualize) {
        virtualizer.scrollToOffset(0);
      }
    }, [items, shouldVirtualize, virtualizer]);

    if (isLoading) return <FileListSkeleton />;
    if (items.length === 0) return <EmptyState isSearching={isSearching} />;

    const virtualItems = virtualizer.getVirtualItems();

    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
          className,
        )}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_92px] items-center gap-3 border-b border-border bg-muted/40 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_110px_150px_120px]">
          <SortHeader field="name" label="Name" sort={sort} onSort={onSort} />
          <SortHeader field="size" label="Size" sort={sort} onSort={onSort} />
          <div className="hidden md:block">
            <SortHeader
              field="lastModified"
              label="Modified"
              sort={sort}
              onSort={onSort}
            />
          </div>
          <div className="hidden md:block">
            <SortHeader
              field="contentType"
              label="Type"
              sort={sort}
              onSort={onSort}
            />
          </div>
        </div>
        <div
          ref={scrollRef}
          className={cn(
            "max-h-[60vh] overflow-auto",
            !shouldVirtualize && "divide-y divide-border/60",
          )}
        >
          {shouldVirtualize ? (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                position: "relative",
                width: "100%",
              }}
            >
              {virtualItems.map((virtualRow) => {
                const item = items[virtualRow.index];
                if (!item) return null;
                return (
                  <div
                    key={item.key}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <FileItem
                      item={item}
                      isSelected={selectedKeys.has(item.key)}
                      viewMode="list"
                      contextMenuItems={getContextMenuItems?.(item)}
                      onClick={(event) => onItemClick(item.key, event)}
                      onDoubleClick={() => onItemDoubleClick(item)}
                      onContextMenu={(event) => onItemContextMenu(item, event)}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            items.map((item) => (
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
  },
);
FileListView.displayName = "FileListView";

export { FileListView };
