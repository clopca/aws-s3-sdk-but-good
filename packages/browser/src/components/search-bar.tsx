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
    <div className="group flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm transition-colors focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
      <span className="text-slate-400 transition-colors group-focus-within:text-blue-500" aria-hidden="true">⌕</span>
      <input
        className="w-full border-0 bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label="Search files"
      />
      {value && onClear ? (
        <button
          type="button"
          className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          onClick={onClear}
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
