import { useEffect, useRef, useState } from "react";
import {
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from "../ui";

export interface RenameDialogProps {
  open: boolean;
  currentName: string;
  onSubmit: (newName: string) => void;
  onCancel: () => void;
}

export function RenameDialog({ open, currentName, onSubmit, onCancel }: RenameDialogProps) {
  const [value, setValue] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(currentName);
  }, [currentName]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return (
    <DialogRoot
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <DialogPortal>
        <DialogBackdrop className="fixed inset-0 z-50 bg-slate-900/45" />
        <DialogContent className="fixed inset-0 z-50 grid place-items-center p-4" aria-label="Rename item dialog">
          <form
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-lg"
            onSubmit={(event) => {
              event.preventDefault();
              const newName = value.trim();
              if (!newName) return;
              onSubmit(newName);
            }}
          >
            <DialogTitle className="text-lg font-semibold text-slate-900">Rename item</DialogTitle>
            <input
              ref={inputRef}
              className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <div className="mt-5 flex justify-end gap-2">
              <DialogClose
                className="rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-700"
                onClick={onCancel}
              >
                Cancel
              </DialogClose>
              <button type="submit" className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white">
                Save
              </button>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}
