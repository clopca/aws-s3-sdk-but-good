import { Button, cn } from "./ui";

export interface SelectionBarProps {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  className?: string;
  appearance?: Partial<{
    root: string;
    label: string;
    clearButton: string;
    deleteButton: string;
  }>;
}

export function SelectionBar({ count, onClear, onDelete, className, appearance }: SelectionBarProps) {
  if (count === 0) return null;

  return (
    <div className={cn("sticky bottom-3 z-20 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 shadow-md", appearance?.root, className)}>
      <span aria-live="polite" className={cn("text-sm font-medium text-primary", appearance?.label)}>{count} selected</span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className={appearance?.clearButton}
          onClick={onClear}
        >
          Clear
        </Button>
        <Button
          type="button"
          variant="destructive"
          className={appearance?.deleteButton}
          onClick={onDelete}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
