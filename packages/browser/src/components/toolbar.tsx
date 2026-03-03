import { forwardRef, useRef } from "react";
import type { SortConfig, SortField, ViewMode } from "@s3-good-internal/shared";
import {
  Button,
  cn,
  Select,
  SelectContent,
  SelectItem,
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
  onUploadFiles?: (files: File[]) => void | Promise<void>;
  uploadLabel?: string;
  uploadAccept?: string;
  uploadMultiple?: boolean;
  uploadDisabled?: boolean;
  onRefresh?: () => void;
  className?: string;
  appearance?: Partial<{
    root: string;
    controls: string;
    actions: string;
    bucketSelect: string;
    sortSelect: string;
    selectedBadge: string;
  }>;
}

const SORT_LABELS: Record<SortField, string> = {
  name: "Name",
  size: "Size",
  lastModified: "Modified",
  contentType: "Type",
};

const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  (
    {
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
      onUploadFiles,
      uploadLabel = "Upload",
      uploadAccept,
      uploadMultiple = true,
      uploadDisabled = false,
      onRefresh,
      className,
      appearance,
    },
    ref,
  ) => {
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const bucketItems = buckets.map((bucket) => ({
      label: bucket,
      value: bucket,
    }));
    const sortItems = [
      { label: "Name", value: "name" },
      { label: "Size", value: "size" },
      { label: "Modified", value: "lastModified" },
      { label: "Type", value: "contentType" },
    ] satisfies Array<{ label: string; value: SortField }>;

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-3 md:flex-row md:items-center md:justify-between",
          appearance?.root,
          className,
        )}
      >
        <div
          className={cn(
            "flex flex-wrap items-center gap-2",
            appearance?.controls,
          )}
        >
          {buckets.length > 0 ? (
            <div
              className={cn(
                "min-w-0 max-w-[320px] grow sm:grow-0",
                appearance?.bucketSelect,
              )}
            >
              <Select
                items={bucketItems}
                value={activeBucket}
                onValueChange={(value) => {
                  if (value && onBucketChange) onBucketChange(value);
                }}
              >
                <SelectTrigger className="w-full min-w-0" aria-label="Bucket">
                  <SelectValue
                    className="truncate"
                    placeholder="Select bucket"
                  />
                </SelectTrigger>
                <SelectContent>
                  {bucketItems.map((bucket) => (
                    <SelectItem
                      key={bucket.value}
                      value={bucket.value}
                      className="truncate"
                    >
                      {bucket.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div
            role="radiogroup"
            aria-label="View mode"
            className="inline-flex rounded-lg border border-border bg-muted p-0.5"
          >
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "rounded-md",
                viewMode !== "grid" && "text-muted-foreground shadow-none",
              )}
              data-state={viewMode === "grid" ? "active" : "inactive"}
              role="radio"
              aria-checked={viewMode === "grid"}
              aria-label="Grid view"
              onClick={() => onViewModeChange("grid")}
            >
              Grid
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "rounded-md",
                viewMode !== "list" && "text-muted-foreground shadow-none",
              )}
              data-state={viewMode === "list" ? "active" : "inactive"}
              role="radio"
              aria-checked={viewMode === "list"}
              aria-label="List view"
              onClick={() => onViewModeChange("list")}
            >
              List
            </Button>
          </div>

          <Select
            items={sortItems}
            value={sort.field}
            onValueChange={(value) => {
              if (value) onSortChange(value as SortField);
            }}
          >
            <SelectTrigger
              className={cn("min-w-[140px]", appearance?.sortSelect)}
              aria-label="Sort by"
            >
              <SelectValue>
                {(value) =>
                  `Sort: ${SORT_LABELS[(value as SortField) ?? "name"]}`
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sortItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          className={cn(
            "flex flex-wrap items-center justify-end gap-2",
            appearance?.actions,
          )}
        >
          {selectedCount > 0 ? (
            <span
              className={cn(
                "rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary",
                appearance?.selectedBadge,
              )}
            >
              {selectedCount} selected
            </span>
          ) : null}
          {onRefresh ? (
            <Button type="button" variant="outline" onClick={onRefresh}>
              Refresh
            </Button>
          ) : null}
          {onUploadFiles ? (
            <>
              <input
                ref={uploadInputRef}
                type="file"
                className="hidden"
                accept={uploadAccept}
                multiple={uploadMultiple}
                onChange={(event) => {
                  const files = Array.from(event.currentTarget.files ?? []);
                  if (files.length === 0) return;
                  void onUploadFiles(files);
                  event.currentTarget.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploadDisabled}
                aria-busy={uploadDisabled || undefined}
                aria-label={uploadLabel}
                onClick={() => uploadInputRef.current?.click()}
              >
                {uploadLabel}
              </Button>
            </>
          ) : null}
          <Button type="button" onClick={onCreateFolder}>
            New Folder
          </Button>
          <Button
            type="button"
            variant={selectedCount > 0 ? "destructive" : "outline"}
            onClick={onDeleteSelected}
            disabled={selectedCount === 0}
          >
            Delete ({selectedCount})
          </Button>
        </div>
      </div>
    );
  },
);
Toolbar.displayName = "Toolbar";

export { Toolbar };
