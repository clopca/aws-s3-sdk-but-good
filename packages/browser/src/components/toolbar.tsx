import type { SortConfig, SortField, ViewMode } from "@s3-good/shared";
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectList,
  SelectPortal,
  SelectPositioner,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} from "./ui";

export interface ToolbarProps {
  buckets?: string[];
  activeBucket?: string;
  viewMode: ViewMode;
  sort: SortConfig;
  selectedCount: number;
  onBucketChange?: (bucket: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSortChange: (field: SortField) => void;
  onCreateFolder: () => void;
  onDeleteSelected: () => void;
  onRefresh?: () => void;
}

const SORT_LABELS: Record<SortField, string> = {
  name: "Name",
  size: "Size",
  lastModified: "Modified",
  contentType: "Type",
};

function controlButton(active: boolean): string {
  return `inline-flex h-10 items-center rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 ${
    active
      ? "border-slate-900 bg-slate-900 text-white"
      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
  }`;
}

function actionButton(variant: "neutral" | "primary" | "danger"): string {
  if (variant === "primary") {
    return "inline-flex h-10 items-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200";
  }
  if (variant === "danger") {
    return "inline-flex h-10 items-center rounded-md bg-rose-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-50";
  }
  return "inline-flex h-10 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200";
}

const selectTriggerClass = "inline-flex h-10 min-w-[160px] items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200";
const selectContentClass = "z-50 min-w-[160px] rounded-md border border-slate-200 bg-white p-1 shadow-lg";
const selectItemClass = "cursor-default rounded px-2.5 py-2 text-sm text-slate-700 outline-none data-[highlighted]:bg-slate-100";

export function Toolbar({
  buckets = [],
  activeBucket,
  viewMode,
  sort,
  selectedCount,
  onBucketChange,
  onViewModeChange,
  onSortChange,
  onCreateFolder,
  onDeleteSelected,
  onRefresh,
}: ToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {buckets.length > 0 ? (
          <SelectRoot
            value={activeBucket}
            onValueChange={(value) => {
              if (value && onBucketChange) onBucketChange(value);
            }}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue>{(value) => `Bucket: ${(value as string) ?? ""}`}</SelectValue>
              <SelectIcon className="text-xs text-slate-500">▾</SelectIcon>
            </SelectTrigger>
            <SelectPortal>
              <SelectPositioner sideOffset={6}>
                <SelectContent className={selectContentClass}>
                  <SelectList>
                    {buckets.map((bucket) => (
                      <SelectItem key={bucket} value={bucket} className={selectItemClass}>
                        {bucket}
                      </SelectItem>
                    ))}
                  </SelectList>
                </SelectContent>
              </SelectPositioner>
            </SelectPortal>
          </SelectRoot>
        ) : null}

        <div className="inline-flex rounded-md border border-slate-200 bg-white p-1 shadow-sm">
          <button type="button" className={controlButton(viewMode === "grid")} onClick={() => onViewModeChange("grid")}>
            Grid
          </button>
          <button type="button" className={controlButton(viewMode === "list")} onClick={() => onViewModeChange("list")}>
            List
          </button>
        </div>

        <SelectRoot value={sort.field}>
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue>{(value) => `Sort: ${SORT_LABELS[(value as SortField) ?? "name"]}`}</SelectValue>
            <SelectIcon className="text-xs text-slate-500">▾</SelectIcon>
          </SelectTrigger>
          <SelectPortal>
            <SelectPositioner sideOffset={6}>
              <SelectContent className={selectContentClass}>
                <SelectList>
                  <SelectItem value="name" className={selectItemClass} onClick={() => onSortChange("name")}>Name</SelectItem>
                  <SelectItem value="size" className={selectItemClass} onClick={() => onSortChange("size")}>Size</SelectItem>
                  <SelectItem value="lastModified" className={selectItemClass} onClick={() => onSortChange("lastModified")}>Modified</SelectItem>
                  <SelectItem value="contentType" className={selectItemClass} onClick={() => onSortChange("contentType")}>Type</SelectItem>
                </SelectList>
              </SelectContent>
            </SelectPositioner>
          </SelectPortal>
        </SelectRoot>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {selectedCount > 0 ? (
          <span className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            {selectedCount} selected
          </span>
        ) : null}
        {onRefresh ? (
          <button type="button" className={actionButton("neutral")} onClick={onRefresh}>
            Refresh
          </button>
        ) : null}
        <button type="button" className={actionButton("primary")} onClick={onCreateFolder}>
          New Folder
        </button>
        <button
          type="button"
          className={actionButton("danger")}
          onClick={onDeleteSelected}
          disabled={selectedCount === 0}
        >
          Delete ({selectedCount})
        </button>
      </div>
    </div>
  );
}
