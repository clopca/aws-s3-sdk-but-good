import type { BrowserItem, SortConfig, SortField } from "@s3-good/shared";
import type { ContextMenuItem } from "./context-menu";
import { EmptyState } from "./empty-state";
import { FileItem } from "./file-item";

export interface FileListViewProps {
  items: BrowserItem[];
  selectedKeys: Set<string>;
  sort: SortConfig;
  onSort: (field: SortField) => void;
  onItemClick: (key: string, event: React.MouseEvent) => void;
  onItemDoubleClick: (item: BrowserItem) => void;
  onItemContextMenu: (item: BrowserItem, event: React.MouseEvent) => void;
  getContextMenuItems?: (item: BrowserItem) => ContextMenuItem[];
  isLoading: boolean;
  isSearching?: boolean;
  className?: string;
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
}: FileListViewProps) {
  if (isLoading) return <LoadingRows />;
  if (items.length === 0) return <EmptyState isSearching={isSearching} />;

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
      <div className="max-h-[60vh] divide-y divide-border/60 overflow-auto">
        {items.map((item) => (
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
  );
}
