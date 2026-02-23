export interface SelectionBarProps {
  count: number;
  onClear: () => void;
  onDelete: () => void;
}

export function SelectionBar({ count, onClear, onDelete }: SelectionBarProps) {
  if (count === 0) return null;

  return (
    <div className="sticky bottom-3 z-20 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-2">
      <span className="text-sm font-medium text-blue-900">{count} selected</span>
      <div className="flex items-center gap-2">
        <button type="button" className="rounded-md bg-white px-3 py-1.5 text-sm text-slate-700" onClick={onClear}>
          Clear
        </button>
        <button type="button" className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}
