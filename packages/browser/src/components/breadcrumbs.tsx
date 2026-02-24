import type { BreadcrumbSegment } from "../hooks";
import { Button } from "./ui";

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
            <Button
              variant="ghost"
              size="sm"
              className={isLast ? "font-semibold text-foreground" : "text-muted-foreground"}
              onClick={() => onNavigate(segment.path)}
              disabled={isLast}
            >
              {segment.label}
            </Button>
            {!isLast ? <span className="text-muted-foreground/70">/</span> : null}
          </span>
        );
      })}
    </nav>
  );
}
