import {
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from "../ui";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AlertDialogRoot
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <AlertDialogPortal>
        <AlertDialogBackdrop className="fixed inset-0 z-50 bg-slate-900/45" />
        <AlertDialogContent className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <AlertDialogTitle className="text-lg font-semibold text-slate-900">{title}</AlertDialogTitle>
            {description ? (
              <AlertDialogDescription className="mt-2 text-sm text-slate-600">{description}</AlertDialogDescription>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <AlertDialogClose
                className="rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-700"
                onClick={onCancel}
              >
                {cancelLabel}
              </AlertDialogClose>
              <button
                type="button"
                className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white"
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  );
}
