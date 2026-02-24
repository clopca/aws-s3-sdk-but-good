import { forwardRef } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  Button,
  cn,
} from "../ui";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

const ConfirmDialog = forwardRef<HTMLDivElement, ConfirmDialogProps>(
  (
    {
      open,
      title,
      description,
      confirmLabel = "Confirm",
      cancelLabel = "Cancel",
      onConfirm,
      onCancel,
      className,
    },
    _ref,
  ) => {
    return (
      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) onCancel();
        }}
      >
        <AlertDialogContent
          className={cn(className)}
          data-state={open ? "open" : "closed"}
        >
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription className="mt-2">
              {description}
            </AlertDialogDescription>
          ) : null}
          <AlertDialogFooter>
            <Button variant="outline" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button variant="destructive" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  },
);
ConfirmDialog.displayName = "ConfirmDialog";

export { ConfirmDialog };
