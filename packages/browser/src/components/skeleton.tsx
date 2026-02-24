import { cn } from "./ui";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-muted", className)}
      {...props}
    />
  );
}

export function FileGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={`grid-skel-${String(i)}`} className="flex min-h-[140px] flex-col items-center rounded-xl border border-border bg-card p-3">
          <Skeleton className="mb-2 h-10 w-10 rounded-lg" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-1.5 h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

export function FileListSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-[minmax(0,1fr)_110px_150px_120px] gap-3 border-b border-border bg-muted/40 px-3 py-2.5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-10" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={`list-skel-${String(i)}`} className="grid grid-cols-[minmax(0,1fr)_110px_150px_120px] items-center gap-3 border-b border-border/70 px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}
