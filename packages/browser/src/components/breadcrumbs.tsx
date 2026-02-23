import type { BreadcrumbSegment } from "../hooks";

export interface BreadcrumbsProps {
  segments: BreadcrumbSegment[];
  onNavigate: (path: string) => void;
}

export function Breadcrumbs({ segments, onNavigate }: BreadcrumbsProps) {
  return (
    <nav className="flex min-h-10 flex-wrap items-center gap-1 text-sm" aria-label="Breadcrumb">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        return (
          <span key={segment.path} className="flex items-center gap-1">
            <button
              type="button"
              className={`rounded-md px-2 py-1 transition-colors ${
                isLast
                  ? "font-semibold text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
              onClick={() => onNavigate(segment.path)}
              disabled={isLast}
            >
              {segment.label}
            </button>
            {!isLast ? <span className="text-slate-400">/</span> : null}
          </span>
        );
      })}
    </nav>
  );
}
