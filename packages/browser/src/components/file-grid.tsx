import type { BrowserItem } from "@s3-good/shared";
import type { ContextMenuItem } from "./context-menu";
import { EmptyState } from "./empty-state";
import { FileItem } from "./file-item";

export interface FileGridProps {
  items: BrowserItem[];
  selectedKeys: Set<string>;
  onItemClick: (key: string, event: React.MouseEvent) => void;
  onItemDoubleClick: (item: BrowserItem) => void;
  onItemContextMenu: (item: BrowserItem, event: React.MouseEvent) => void;
  getContextMenuItems?: (item: BrowserItem) => ContextMenuItem[];
  isLoading: boolean;
  isSearching?: boolean;
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-[140px] animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
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
}: FileGridProps) {
  if (isLoading) return <LoadingSkeleton />;
  if (items.length === 0) return <EmptyState isSearching={isSearching} />;

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 p-1">
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
