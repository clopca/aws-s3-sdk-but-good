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

export interface CreateFolderDialogProps {
  open: boolean;
  onSubmit: (name: string) => void;
  onCancel: () => void;
  className?: string;
}

const CreateFolderDialog = forwardRef<HTMLDivElement, CreateFolderDialogProps>(
  ({ open, onSubmit, onCancel, className }, _ref) => {
    const [value, setValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (!open) {
        setValue("");
        return;
      }

      const frame = requestAnimationFrame(() => {
        inputRef.current?.focus();
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
          aria-label="Create folder dialog"
          className={cn(className)}
          data-state={open ? "open" : "closed"}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const name = value.trim();
              if (!name) return;
              onSubmit(name);
              setValue("");
            }}
          >
            <DialogTitle>Create folder</DialogTitle>
            <Input
              ref={inputRef}
              className="mt-3"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Folder name"
            />
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  },
);
CreateFolderDialog.displayName = "CreateFolderDialog";

export { CreateFolderDialog };
