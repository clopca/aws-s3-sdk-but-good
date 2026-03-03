import { forwardRef, useEffect, useRef, useState } from "react";
import {
  useVirtualizer,
  observeElementRect as defaultObserveElementRect,
} from "@tanstack/react-virtual";
import type { Rect, Virtualizer } from "@tanstack/react-virtual";
import type { BrowserItem } from "@s3-good-internal/shared";
import type { ContextMenuItem } from "./context-menu";
import { EmptyState } from "./empty-state";
import { FileItem } from "./file-item";
import { FileGridSkeleton } from "./skeleton";
import { cn } from "./ui";

const DEFAULT_GRID_ITEM_MIN_WIDTH = 140;
const DEFAULT_GRID_ROW_HEIGHT = 152;
const DEFAULT_GRID_GAP = 12;
const DEFAULT_GRID_OVERSCAN_ROWS = 2;
const DEFAULT_GRID_VIRTUALIZATION_THRESHOLD = 180;
const FALLBACK_GRID_CONTAINER_WIDTH = 960;
const FALLBACK_GRID_VIEWPORT_HEIGHT = 480;

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
  getPreviewUrl?: (key: string) => Promise<string>;
  isLoading: boolean;
  isSearching?: boolean;
  className?: string;
  virtualization?: FileGridVirtualizationOptions;
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

const FileGrid = forwardRef<HTMLDivElement, FileGridProps>(
  (
    {
      items,
      selectedKeys,
      onItemClick,
      onItemDoubleClick,
      onItemContextMenu,
      getContextMenuItems,
      getPreviewUrl,
      isLoading,
      isSearching,
      className,
      virtualization,
    },
    ref,
  ) => {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
    const [containerWidth, setContainerWidth] = useState(
      FALLBACK_GRID_CONTAINER_WIDTH,
    );
    const [focusedIndex, setFocusedIndex] = useState(0);

    const itemMinWidth = Math.max(
      1,
      virtualization?.itemMinWidth ?? DEFAULT_GRID_ITEM_MIN_WIDTH,
    );
    const rowHeight = Math.max(
      1,
      virtualization?.rowHeight ?? DEFAULT_GRID_ROW_HEIGHT,
    );
    const gap = Math.max(0, virtualization?.gap ?? DEFAULT_GRID_GAP);
    const overscanRows = Math.max(
      0,
      virtualization?.overscanRows ?? DEFAULT_GRID_OVERSCAN_ROWS,
    );
    const threshold = Math.max(
      0,
      virtualization?.threshold ?? DEFAULT_GRID_VIRTUALIZATION_THRESHOLD,
    );
    const firstItemKey = items[0]?.key ?? "";
    const shouldVirtualize =
      Boolean(virtualization?.enabled) && items.length >= threshold;

    // Track container width via ResizeObserver for column calculation
    useEffect(() => {
      const element = scrollRef.current;
      if (!element) return;

      const updateWidth = () => {
        const measuredWidth =
          element.clientWidth || FALLBACK_GRID_CONTAINER_WIDTH;
        setContainerWidth(measuredWidth);
      };

      updateWidth();
      if (typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(updateWidth);
      observer.observe(element);

      return () => {
        observer.disconnect();
      };
    }, []);

    const columnCount = Math.max(
      1,
      Math.floor((containerWidth + gap) / (itemMinWidth + gap)),
    );
    const rowCount = Math.ceil(items.length / columnCount);

    const virtualizer = useVirtualizer({
      count: shouldVirtualize ? rowCount : 0,
      getScrollElement: () => scrollRef.current,
      estimateSize: () => rowHeight,
      overscan: overscanRows,
      observeElementRect: observeElementRectWithFallback({
        width: FALLBACK_GRID_CONTAINER_WIDTH,
        height: FALLBACK_GRID_VIEWPORT_HEIGHT,
      }),
    });

    // Reset scroll position when item list changes
    useEffect(() => {
      // Reset when visible dataset changes.
      void firstItemKey;
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
      if (shouldVirtualize) {
        virtualizer.scrollToOffset(0);
      }
    }, [firstItemKey, shouldVirtualize, virtualizer]);

    useEffect(() => {
      if (items.length === 0) {
        setFocusedIndex(0);
        return;
      }
      setFocusedIndex((prev) => Math.min(prev, items.length - 1));
    }, [items.length]);

    const focusedItem = items[focusedIndex];

    useEffect(() => {
      if (!focusedItem) return;

      if (shouldVirtualize) {
        const rowIndex = Math.floor(focusedIndex / columnCount);
        virtualizer.scrollToIndex(rowIndex, { align: "auto" });
      }

      const frame = requestAnimationFrame(() => {
        itemRefs.current.get(focusedItem.key)?.focus();
      });

      return () => cancelAnimationFrame(frame);
    }, [focusedIndex, focusedItem, shouldVirtualize, columnCount, virtualizer]);

    const moveFocus = (nextIndex: number) => {
      if (items.length === 0) return;
      const clamped = Math.max(0, Math.min(nextIndex, items.length - 1));
      setFocusedIndex(clamped);
    };

    const handleItemKeyDown = (
      index: number,
      item: BrowserItem,
      event: React.KeyboardEvent<HTMLButtonElement>,
    ) => {
      switch (event.key) {
        case "ArrowRight": {
          event.preventDefault();
          moveFocus(index + 1);
          return;
        }
        case "ArrowLeft": {
          event.preventDefault();
          moveFocus(index - 1);
          return;
        }
        case "ArrowDown": {
          event.preventDefault();
          moveFocus(index + columnCount);
          return;
        }
        case "ArrowUp": {
          event.preventDefault();
          moveFocus(index - columnCount);
          return;
        }
        case "Home": {
          event.preventDefault();
          moveFocus(0);
          return;
        }
        case "End": {
          event.preventDefault();
          moveFocus(items.length - 1);
          return;
        }
        case "Enter":
        case " ": {
          event.preventDefault();
          onItemDoubleClick(item);
          return;
        }
        default:
          return;
      }
    };

    if (isLoading) return <FileGridSkeleton />;
    if (items.length === 0) return <EmptyState isSearching={isSearching} />;

    const virtualRows = virtualizer.getVirtualItems();

    return (
      <div
        ref={(node) => {
          // Merge forwarded ref and internal scrollRef
          scrollRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn(
          shouldVirtualize && "max-h-[60vh] overflow-auto",
          className,
        )}
        role="listbox"
        aria-label="File grid"
        aria-multiselectable="true"
      >
        {shouldVirtualize ? (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: "relative",
              width: "100%",
            }}
          >
            {virtualRows.map((virtualRow) => {
              const startIndex = virtualRow.index * columnCount;
              const rowItems = items.slice(
                startIndex,
                startIndex + columnCount,
              );

              return (
                <div
                  key={virtualRow.index}
                  className="grid p-1"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                    gap: `${gap}px`,
                  }}
                >
                  {rowItems.map((item, colIndex) => {
                    const itemIndex = startIndex + colIndex;
                    return (
                      <FileItem
                        key={item.key}
                        ref={(node) => {
                          if (!node) {
                            itemRefs.current.delete(item.key);
                            return;
                          }
                          itemRefs.current.set(item.key, node);
                        }}
                        item={item}
                        isSelected={selectedKeys.has(item.key)}
                        viewMode="grid"
                        role="option"
                        ariaSelected={selectedKeys.has(item.key)}
                        tabIndex={itemIndex === focusedIndex ? 0 : -1}
                        contextMenuItems={getContextMenuItems?.(item)}
                        getPreviewUrl={getPreviewUrl}
                        onClick={(event) => onItemClick(item.key, event)}
                        onDoubleClick={() => onItemDoubleClick(item)}
                        onContextMenu={(event) =>
                          onItemContextMenu(item, event)
                        }
                        onKeyDown={(event) =>
                          handleItemKeyDown(itemIndex, item, event)
                        }
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className={cn(
              "grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 p-1",
            )}
          >
            {items.map((item, index) => (
              <FileItem
                key={item.key}
                ref={(node) => {
                  if (!node) {
                    itemRefs.current.delete(item.key);
                    return;
                  }
                  itemRefs.current.set(item.key, node);
                }}
                item={item}
                isSelected={selectedKeys.has(item.key)}
                viewMode="grid"
                role="option"
                ariaSelected={selectedKeys.has(item.key)}
                tabIndex={index === focusedIndex ? 0 : -1}
                contextMenuItems={getContextMenuItems?.(item)}
                getPreviewUrl={getPreviewUrl}
                onClick={(event) => onItemClick(item.key, event)}
                onDoubleClick={() => onItemDoubleClick(item)}
                onContextMenu={(event) => onItemContextMenu(item, event)}
                onKeyDown={(event) => handleItemKeyDown(index, item, event)}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);
FileGrid.displayName = "FileGrid";

export { FileGrid };
