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
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2">
        {buckets.length > 0 ? (
          <SelectRoot
            value={activeBucket}
            onValueChange={(value) => {
              if (value && onBucketChange) onBucketChange(value);
            }}
          >
            <SelectTrigger className="inline-flex min-w-[180px] items-center justify-between rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-800">
              <SelectValue>{(value) => `Bucket: ${(value as string) ?? ""}`}</SelectValue>
              <SelectIcon className="text-xs text-slate-500">▾</SelectIcon>
            </SelectTrigger>
            <SelectPortal>
              <SelectPositioner sideOffset={6}>
                <SelectContent className="z-50 min-w-[180px] rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                  <SelectList>
                    {buckets.map((bucket) => (
                      <SelectItem
                        key={bucket}
                        value={bucket}
                        className="cursor-default rounded px-2 py-1.5 text-sm text-slate-700 outline-none data-[highlighted]:bg-slate-100"
                      >
                        {bucket}
                      </SelectItem>
                    ))}
                  </SelectList>
                </SelectContent>
              </SelectPositioner>
            </SelectPortal>
          </SelectRoot>
        ) : null}

        <button
          type="button"
          className={`rounded-md px-3 py-1.5 text-sm ${viewMode === "grid" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
          onClick={() => onViewModeChange("grid")}
        >
          Grid
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 text-sm ${viewMode === "list" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
          onClick={() => onViewModeChange("list")}
        >
          List
        </button>

        <SelectRoot
          value={sort.field}
        >
          <SelectTrigger className="inline-flex min-w-[132px] items-center justify-between rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-800">
            <SelectValue>{(value) => `Sort: ${SORT_LABELS[(value as SortField) ?? "name"]}`}</SelectValue>
            <SelectIcon className="text-xs text-slate-500">▾</SelectIcon>
          </SelectTrigger>
          <SelectPortal>
            <SelectPositioner sideOffset={6}>
              <SelectContent className="z-50 min-w-[132px] rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                <SelectList>
                  <SelectItem
                    value="name"
                    className="cursor-default rounded px-2 py-1.5 text-sm text-slate-700 outline-none data-[highlighted]:bg-slate-100"
                    onClick={() => onSortChange("name")}
                  >
                    Name
                  </SelectItem>
                  <SelectItem
                    value="size"
                    className="cursor-default rounded px-2 py-1.5 text-sm text-slate-700 outline-none data-[highlighted]:bg-slate-100"
                    onClick={() => onSortChange("size")}
                  >
                    Size
                  </SelectItem>
                  <SelectItem
                    value="lastModified"
                    className="cursor-default rounded px-2 py-1.5 text-sm text-slate-700 outline-none data-[highlighted]:bg-slate-100"
                    onClick={() => onSortChange("lastModified")}
                  >
                    Modified
                  </SelectItem>
                  <SelectItem
                    value="contentType"
                    className="cursor-default rounded px-2 py-1.5 text-sm text-slate-700 outline-none data-[highlighted]:bg-slate-100"
                    onClick={() => onSortChange("contentType")}
                  >
                    Type
                  </SelectItem>
                </SelectList>
              </SelectContent>
            </SelectPositioner>
          </SelectPortal>
        </SelectRoot>
      </div>

      <div className="flex items-center gap-2">
        {onRefresh ? (
          <button
            type="button"
            className="rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-700"
            onClick={onRefresh}
          >
            Refresh
          </button>
        ) : null}
        <button
          type="button"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white"
          onClick={onCreateFolder}
        >
          New Folder
        </button>
        <button
          type="button"
          className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onDeleteSelected}
          disabled={selectedCount === 0}
        >
          Delete ({selectedCount})
        </button>
      </div>
    </div>
  );
}
