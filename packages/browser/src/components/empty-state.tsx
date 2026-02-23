export interface EmptyStateProps {
  isSearching?: boolean;
}

export function EmptyState({ isSearching = false }: EmptyStateProps) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center">
      <div className="mb-3 text-3xl">{isSearching ? "🔎" : "📂"}</div>
      <h3 className="text-base font-semibold text-slate-800">
        {isSearching ? "No files match your search" : "This folder is empty"}
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        {isSearching ? "Try another keyword." : "Upload files or create a folder to get started."}
      </p>
    </div>
  );
}
