import { useEffect } from "react";

export function Dialog({
  title,
  body,
  confirmLabel,
  cancelLabel = "Batal",
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const textBtn =
    "h-10 rounded-full px-3 text-[14px] font-medium leading-5 tracking-[0.1px] text-m3-primary outline-none transition-colors active:bg-m3-primary/[0.12] focus-visible:ring-2 focus-visible:ring-m3-primary";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/[0.32] px-6"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-body"
        onClick={(e) => e.stopPropagation()}
        className="w-full min-w-[280px] max-w-[312px] rounded-[28px] bg-[color:var(--m3-surface-high)] p-6"
      >
        <h3 id="dialog-title" className="text-[24px] font-normal leading-8 text-m3-on-surface">
          {title}
        </h3>
        <p
          id="dialog-body"
          className="mt-4 whitespace-pre-line text-[14px] leading-5 tracking-[0.25px] text-m3-on-surface-variant"
        >
          {body}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" autoFocus onClick={onCancel} className={textBtn}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={textBtn}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
