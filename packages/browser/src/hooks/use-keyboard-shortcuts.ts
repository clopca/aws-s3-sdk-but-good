import { useEffect } from "react";

export interface UseKeyboardShortcutsOptions {
  selectedCount: number;
  onDelete: () => void;
  onRename: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function useKeyboardShortcuts(opts: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't handle if focused on an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (opts.selectedCount > 0) {
          e.preventDefault();
          opts.onDelete();
        }
      } else if (e.key === "F2") {
        if (opts.selectedCount === 1) {
          e.preventDefault();
          opts.onRename();
        }
      } else if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        opts.onSelectAll();
      } else if (e.key === "Escape") {
        opts.onDeselectAll();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [opts.selectedCount, opts.onDelete, opts.onRename, opts.onSelectAll, opts.onDeselectAll]);
}
