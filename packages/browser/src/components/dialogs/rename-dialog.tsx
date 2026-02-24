import { forwardRef, useEffect, useRef, useState } from "react";
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  Input,
} from "../ui";

export interface RenameDialogProps {
  open: boolean;
  currentName: string;
  onSubmit: (newName: string) => void;
  onCancel: () => void;
  className?: string;
}

const RenameDialog = forwardRef<HTMLDivElement, RenameDialogProps>(
  ({ open, currentName, onSubmit, onCancel, className }, _ref) => {
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
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) onCancel();
        }}
      >
        <DialogContent
          aria-label="Rename item dialog"
          className={cn(className)}
          data-state={open ? "open" : "closed"}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const newName = value.trim();
              if (!newName) return;
              onSubmit(newName);
            }}
          >
            <DialogTitle>Rename item</DialogTitle>
            <Input
              ref={inputRef}
              className="mt-3"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  },
);
RenameDialog.displayName = "RenameDialog";

export { RenameDialog };
