export interface EmptyStateProps {
  isSearching?: boolean;
}

export function EmptyState({ isSearching = false }: EmptyStateProps) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
      <div className="mb-4 text-4xl">{isSearching ? "🔎" : "📂"}</div>
      <h3 className="text-base font-semibold text-foreground">
        {isSearching ? "No files match your search" : "This folder is empty"}
      </h3>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
        {isSearching ? "Try another keyword or clear the search." : "Upload files or create a folder to get started."}
      </p>
    </div>
  );
}
