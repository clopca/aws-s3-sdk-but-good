import { useEffect, useMemo, useRef, useState } from "react";
import type { BrowserItem } from "@s3-good/shared";
import type { ContextMenuItem } from "./context-menu";
import { EmptyState } from "./empty-state";
import { FileItem } from "./file-item";

const DEFAULT_GRID_ITEM_MIN_WIDTH = 140;
const DEFAULT_GRID_ROW_HEIGHT = 152;
const DEFAULT_GRID_GAP = 12;
const DEFAULT_GRID_OVERSCAN_ROWS = 2;
const DEFAULT_GRID_VIRTUALIZATION_THRESHOLD = 180;
const FALLBACK_GRID_VIEWPORT_HEIGHT = 480;
const FALLBACK_GRID_CONTAINER_WIDTH = 960;

export interface FileGridVirtualizationOptions {
  enabled?: boolean;
  itemMinWidth?: number;
  rowHeight?: number;
  gap?: number;
  overscanRows?: number;
  threshold?: number;
}

export interface FileGridProps {
  items: BrowserItem[];
  selectedKeys: Set<string>;
  onItemClick: (key: string, event: React.MouseEvent) => void;
  onItemDoubleClick: (item: BrowserItem) => void;
  onItemContextMenu: (item: BrowserItem, event: React.SyntheticEvent) => void;
  getContextMenuItems?: (item: BrowserItem) => ContextMenuItem[];
  isLoading: boolean;
  isSearching?: boolean;
  className?: string;
  virtualization?: FileGridVirtualizationOptions;
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 p-1">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-border bg-card p-3">
          <div className="mb-2 h-10 w-10 animate-pulse rounded-lg bg-muted" />
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function FileGrid({
  items,
  selectedKeys,
  onItemClick,
  onItemDoubleClick,
  onItemContextMenu,
  getContextMenuItems,
  isLoading,
  isSearching,
  className,
  virtualization,
}: FileGridProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(FALLBACK_GRID_VIEWPORT_HEIGHT);
  const [containerWidth, setContainerWidth] = useState(FALLBACK_GRID_CONTAINER_WIDTH);

  const itemMinWidth = Math.max(1, virtualization?.itemMinWidth ?? DEFAULT_GRID_ITEM_MIN_WIDTH);
  const rowHeight = Math.max(1, virtualization?.rowHeight ?? DEFAULT_GRID_ROW_HEIGHT);
  const gap = Math.max(0, virtualization?.gap ?? DEFAULT_GRID_GAP);
  const overscanRows = Math.max(0, virtualization?.overscanRows ?? DEFAULT_GRID_OVERSCAN_ROWS);
  const threshold = Math.max(0, virtualization?.threshold ?? DEFAULT_GRID_VIRTUALIZATION_THRESHOLD);
  const shouldVirtualize = Boolean(virtualization?.enabled) && items.length >= threshold;

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const updateMeasurements = () => {
      const measuredHeight = element.clientHeight || FALLBACK_GRID_VIEWPORT_HEIGHT;
      const measuredWidth = element.clientWidth || FALLBACK_GRID_CONTAINER_WIDTH;
      setViewportHeight(measuredHeight);
      setContainerWidth(measuredWidth);
    };

    updateMeasurements();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateMeasurements);
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
  }, [items, shouldVirtualize, itemMinWidth, rowHeight, gap, overscanRows, threshold]);

  const itemCount = items.length;
  const columnCount = Math.max(1, Math.floor((containerWidth + gap) / (itemMinWidth + gap)));
  const rowCount = Math.ceil(items.length / columnCount);

  const virtualWindow = useMemo(() => {
    if (!shouldVirtualize) {
      return {
        startIndex: 0,
        endIndex: itemCount,
        offsetTop: 0,
        totalHeight: 0,
      };
    }

    const firstVisibleRow = Math.floor(scrollTop / rowHeight);
    const visibleRowCount = Math.ceil(viewportHeight / rowHeight);
    const startRow = Math.max(0, firstVisibleRow - overscanRows);
    const endRow = Math.min(rowCount, firstVisibleRow + visibleRowCount + overscanRows);
    const startIndex = startRow * columnCount;
    const endIndex = Math.min(itemCount, endRow * columnCount);

    return {
      startIndex,
      endIndex,
      offsetTop: startRow * rowHeight,
      totalHeight: rowCount * rowHeight,
    };
  }, [shouldVirtualize, itemCount, scrollTop, rowHeight, viewportHeight, overscanRows, rowCount, columnCount]);

  const visibleItems = shouldVirtualize
    ? items.slice(virtualWindow.startIndex, virtualWindow.endIndex)
    : items;

  const regularGridClassName = `grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 p-1 ${className ?? ""}`.trim();

  if (isLoading) return <LoadingSkeleton />;
  if (itemCount === 0) return <EmptyState isSearching={isSearching} />;

  return (
    <div
      ref={scrollRef}
      className={shouldVirtualize ? `max-h-[60vh] overflow-auto ${className ?? ""}`.trim() : undefined}
      onScroll={(event) => {
        if (!shouldVirtualize) return;
        setScrollTop(event.currentTarget.scrollTop);
      }}
    >
      {shouldVirtualize ? (
        <div style={{ height: `${virtualWindow.totalHeight}px`, position: "relative" }}>
          <div
            className="grid p-1"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${virtualWindow.offsetTop}px`,
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
              gap: `${gap}px`,
            }}
          >
            {visibleItems.map((item) => (
              <FileItem
                key={item.key}
                item={item}
                isSelected={selectedKeys.has(item.key)}
                viewMode="grid"
                contextMenuItems={getContextMenuItems?.(item)}
                onClick={(event) => onItemClick(item.key, event)}
                onDoubleClick={() => onItemDoubleClick(item)}
                onContextMenu={(event) => onItemContextMenu(item, event)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className={regularGridClassName}>
          {visibleItems.map((item) => (
            <FileItem
              key={item.key}
              item={item}
              isSelected={selectedKeys.has(item.key)}
              viewMode="grid"
              contextMenuItems={getContextMenuItems?.(item)}
              onClick={(event) => onItemClick(item.key, event)}
              onDoubleClick={() => onItemDoubleClick(item)}
              onContextMenu={(event) => onItemContextMenu(item, event)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
