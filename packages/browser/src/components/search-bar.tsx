import { forwardRef } from "react";
import { Button, cn, Input } from "./ui";

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  appearance?: Partial<{
    root: string;
    input: string;
    clearButton: string;
    icon: string;
  }>;
}

const SearchBar = forwardRef<HTMLDivElement, SearchBarProps>(
  (
    {
      value,
      onChange,
      onClear,
      placeholder = "Search files...",
      className,
      appearance,
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "group flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-within:ring-2 focus-within:ring-ring/50",
          appearance?.root,
          className,
        )}
      >
        <span
          className={cn(
            "text-muted-foreground transition-colors group-focus-within:text-foreground",
            appearance?.icon,
          )}
          aria-hidden="true"
        >
          ⌕
        </span>
        <Input
          className={cn(
            "h-auto border-0 bg-transparent p-0 text-foreground shadow-none focus-visible:ring-0",
            appearance?.input,
          )}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label="Search files"
        />
        {value && onClear ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2 text-xs text-muted-foreground",
              appearance?.clearButton,
            )}
            onClick={onClear}
          >
            Clear
          </Button>
        ) : null}
      </div>
    );
  },
);
SearchBar.displayName = "SearchBar";

export { SearchBar };
