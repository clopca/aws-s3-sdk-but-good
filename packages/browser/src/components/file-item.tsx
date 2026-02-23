import type { BrowserItem } from "@s3-good/shared";
import { getPreviewType } from "@s3-good/shared";
import type { ContextMenuItem } from "./context-menu";
import { ContextMenu } from "./context-menu";
import { FileIcon, FolderIcon } from "./file-icon";

export interface FileItemProps {
  item: BrowserItem;
  isSelected: boolean;
  viewMode: "grid" | "list";
  contextMenuItems?: ContextMenuItem[];
  onClick: (event: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
}

function formatSize(size: number): string {
  if (size === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const power = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** power;
  return `${value.toFixed(power === 0 ? 0 : 1)} ${units[power]}`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function FileItemButton({
  item,
  isSelected,
  viewMode,
  onClick,
  onDoubleClick,
  onContextMenu,
}: Omit<FileItemProps, "contextMenuItems">) {
  const selectedClass = isSelected
    ? "border-blue-400 bg-blue-50 shadow-sm"
    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm";

  const icon = item.kind === "folder"
    ? <FolderIcon size={viewMode === "grid" ? 42 : 22} />
    : <FileIcon type={getPreviewType(item.contentType, item.name)} size={viewMode === "grid" ? 42 : 22} />;

  if (viewMode === "grid") {
    return (
      <button
        type="button"
        className={`group flex min-h-[140px] w-full flex-col items-center rounded-xl border p-3 text-center transition-all ${selectedClass}`}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      >
        <div className="mb-2 flex h-12 items-center">{icon}</div>
        <div className="w-full truncate text-sm font-medium text-slate-800">{item.name}</div>
        {item.kind === "file" ? (
          <div className="mt-1 text-xs text-slate-500">{formatSize(item.size)}</div>
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`grid w-full grid-cols-[minmax(0,1fr)_110px_150px_120px] items-center gap-3 border-b px-3 py-2 text-left transition-colors ${
        isSelected ? "bg-blue-50" : "bg-white hover:bg-slate-50"
      }`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <div className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate text-sm font-medium text-slate-800">{item.name}</span>
      </div>
      <span className="text-xs text-slate-500">{item.kind === "file" ? formatSize(item.size) : "—"}</span>
      <span className="text-xs text-slate-500">{item.kind === "file" ? formatDate(item.lastModified) : "—"}</span>
      <span className="text-xs text-slate-500 uppercase">{item.kind === "file" ? getPreviewType(item.contentType, item.name) : "folder"}</span>
    </button>
  );
}

export function FileItem({ contextMenuItems, ...props }: FileItemProps) {
  const content = <FileItemButton {...props} />;

  if (!contextMenuItems || contextMenuItems.length === 0) return content;

  return <ContextMenu items={contextMenuItems}>{content}</ContextMenu>;
}
