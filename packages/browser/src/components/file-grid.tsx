import type { BrowserItem } from "@s3-good/shared";
import type { ContextMenuItem } from "./context-menu";
import { EmptyState } from "./empty-state";
import { FileItem } from "./file-item";

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
}: FileGridProps) {
  if (isLoading) return <LoadingSkeleton />;
  if (items.length === 0) return <EmptyState isSearching={isSearching} />;

  return (
    <div className={`grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 p-1 ${className ?? ""}`.trim()}>
      {items.map((item) => (
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
  );
}
