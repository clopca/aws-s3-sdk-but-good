export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = "Search files...",
}: SearchBarProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
      <span className="text-slate-400">⌕</span>
      <input
        className="w-full border-0 bg-transparent text-sm outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      {value && onClear ? (
        <button
          type="button"
          className="rounded px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
          onClick={onClear}
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
