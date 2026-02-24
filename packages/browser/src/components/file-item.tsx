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
  onContextMenu: (event: React.SyntheticEvent) => void;
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

function buildAccessibleItemLabel(item: BrowserItem): string {
  if (item.kind === "folder") {
    return `Folder ${item.name}`;
  }
  return `File ${item.name}, ${formatSize(item.size)}`;
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
    ? "border-primary/50 bg-accent ring-1 ring-ring/50 shadow-sm"
    : "border-border bg-card hover:bg-accent/50 hover:shadow-sm";

  const icon = item.kind === "folder"
    ? <FolderIcon size={viewMode === "grid" ? 42 : 22} />
    : <FileIcon type={getPreviewType(item.contentType, item.name)} size={viewMode === "grid" ? 42 : 22} />;
  const accessibleLabel = buildAccessibleItemLabel(item);

  if (viewMode === "grid") {
    return (
      <button
        type="button"
        className={`group flex min-h-[140px] w-full flex-col items-center rounded-xl border p-3 text-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${selectedClass}`}
        aria-label={accessibleLabel}
        aria-pressed={isSelected}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        onKeyDown={(event) => {
          if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
            event.preventDefault();
            onContextMenu(event);
          }
        }}
      >
        <div className="mb-2 flex h-12 items-center transition-transform duration-150 group-hover:scale-105">{icon}</div>
        <div className="w-full truncate text-sm font-medium text-foreground" title={item.name}>{item.name}</div>
        {item.kind === "file" ? (
          <div className="mt-1 text-xs text-muted-foreground">{formatSize(item.size)}</div>
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`grid w-full grid-cols-[minmax(0,1fr)_92px] items-center gap-3 border-b border-border/70 px-3 py-2.5 text-left transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 md:grid-cols-[minmax(0,1fr)_110px_150px_120px] ${
        isSelected ? "bg-accent/70" : "bg-card hover:bg-accent/40"
      }`}
      aria-label={accessibleLabel}
      aria-pressed={isSelected}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onKeyDown={(event) => {
        if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
          event.preventDefault();
          onContextMenu(event);
        }
      }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {icon}
        <span className="truncate text-sm font-medium text-foreground" title={item.name}>{item.name}</span>
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{item.kind === "file" ? formatSize(item.size) : "—"}</span>
      <span className="hidden text-xs text-muted-foreground md:block">{item.kind === "file" ? formatDate(item.lastModified) : "—"}</span>
      <span className="hidden text-xs uppercase text-muted-foreground md:block">{item.kind === "file" ? getPreviewType(item.contentType, item.name) : "folder"}</span>
    </button>
  );
}

export function FileItem({ contextMenuItems, ...props }: FileItemProps) {
  const content = <FileItemButton {...props} />;

  if (!contextMenuItems || contextMenuItems.length === 0) return content;

  return <ContextMenu items={contextMenuItems}>{content}</ContextMenu>;
}
