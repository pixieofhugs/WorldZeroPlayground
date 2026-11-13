import { useId } from "react";
import type { ReactNode } from "react";

interface AdminConfirmProps {
  heading: string;
  lead: string;
  children?: ReactNode;
  confirmLabel: string;
  busyLabel: string;
  cancelLabel: string;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The admin in-page confirm (#3062), replacing its row. The caller supplies
 * the words (the red frame alone says nothing). Focus lands on cancel, never
 * the destructive button; `alertdialog` announces it.
 */
export default function AdminConfirm({
  heading,
  lead,
  children,
  confirmLabel,
  busyLabel,
  cancelLabel,
  busy,
  error,
  onConfirm,
  onCancel,
}: AdminConfirmProps) {
  const headingId = useId();
  const leadId = useId();
  return (
    <div
      role="alertdialog"
      aria-labelledby={headingId}
      aria-describedby={leadId}
      className="flex flex-col gap-2 border-2 danger-edge px-3 py-2"
    >
      <p id={headingId} className="label-heading danger-text">
        {heading}
      </p>
      <p id={leadId} className="font-body content-text">
        {lead}
      </p>
      {children}
      {error && (
        <p role="alert" className="font-body content-text danger-text">
          {error}
        </p>
      )}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="btn-primary text-xs control-off"
        >
          {busy ? busyLabel : confirmLabel}
        </button>
        {/* Hidden in flight: cancelling cannot recall the request. */}
        {!busy && (
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="btn-outline text-xs"
          >
            {cancelLabel}
          </button>
        )}
      </div>
    </div>
  );
}
