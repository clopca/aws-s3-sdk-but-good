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
  const arrow = isActive ? (sort.direction === "asc" ? "↑" : "↓") : "";

  return (
    <button
      type="button"
      className={`text-left text-xs font-semibold uppercase tracking-wide ${
        isActive ? "text-slate-800" : "text-slate-500"
      }`}
      onClick={() => onSort(field)}
    >
      {label} {arrow}
    </button>
  );
}

function LoadingRows() {
  return (
    <div>
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-10 animate-pulse border-b border-slate-200 bg-slate-100" />
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
}: FileListViewProps) {
  if (isLoading) return <LoadingRows />;
  if (items.length === 0) return <EmptyState isSearching={isSearching} />;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-[minmax(0,1fr)_110px_150px_120px] items-center gap-3 border-b border-slate-200 px-3 py-2">
        <SortHeader field="name" label="Name" sort={sort} onSort={onSort} />
        <SortHeader field="size" label="Size" sort={sort} onSort={onSort} />
        <SortHeader field="lastModified" label="Modified" sort={sort} onSort={onSort} />
        <SortHeader field="contentType" label="Type" sort={sort} onSort={onSort} />
      </div>
      <div className="max-h-[60vh] overflow-auto">
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
