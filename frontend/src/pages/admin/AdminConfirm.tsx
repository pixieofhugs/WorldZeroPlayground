import { useId } from "react";
import type { ReactNode } from "react";

interface AdminConfirmProps {
  heading: string;
  lead: string;
  /** Whatever else the admin should read, or fill in, before confirming. */
  children?: ReactNode;
  confirmLabel: string;
  /** The confirm button's words while the request is out. */
  busyLabel: string;
  cancelLabel: string;
  busy: boolean;
  /** The server's refusal, shown here rather than at the top of a long list. */
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The admin area's in-page confirm (#3062, shared since #3061). Takes the
 * row's place, the way an inline edit form does, and follows `EraTab`'s
 * destructive confirm: the frame is red, but the WORDS are what say what is
 * about to happen — so the caller supplies all of them.
 *
 * Opening it unmounts the button that was focused, so focus lands on cancel —
 * never on the destructive button — and the alertdialog role reads the panel
 * out as it arrives.
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
        {/* Hidden rather than disabled while the request is out: cancelling
            cannot recall a request that is already on its way. */}
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
