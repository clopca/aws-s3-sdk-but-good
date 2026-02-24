import { forwardRef } from "react";
import { cn } from "./ui";

export interface EmptyStateProps {
  isSearching?: boolean;
  className?: string;
}

const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ isSearching = false, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center",
          className,
        )}
      >
        <div className="mb-4 text-4xl">{isSearching ? "🔎" : "📂"}</div>
        <h3 className="text-base font-semibold text-foreground">
          {isSearching ? "No files match your search" : "This folder is empty"}
        </h3>
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
          {isSearching
            ? "Try another keyword or clear the search."
            : "Upload files or create a folder to get started."}
        </p>
      </div>
    );
  },
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
