import { useId } from "react";
import { useTranslation } from "react-i18next";

interface TaskDeleteConfirmProps {
  title: string;
  deleting: boolean;
  /** The server's refusal, shown here rather than at the top of a long list. */
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The in-page confirm for deleting a task (#3062). Takes the row's place, the
 * way the inline edit form does, and follows `EraTab`'s destructive confirm:
 * the frame is red, but the WORDS are what say this cannot be undone.
 *
 * Opening it unmounts the button that was focused, so focus lands on cancel —
 * never on the destructive button — and the alertdialog role reads the panel
 * out as it arrives.
 */
export default function TaskDeleteConfirm({
  title,
  deleting,
  error,
  onConfirm,
  onCancel,
}: TaskDeleteConfirmProps) {
  const { t } = useTranslation("admin");
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
        {t("tasks.deleteConfirm.heading")}
      </p>
      <p id={leadId} className="font-body content-text">
        {t("tasks.deleteConfirm.lead", { title })}
      </p>
      <p className="font-body content-text text-muted">
        {t("tasks.deleteConfirm.scope")}
      </p>
      <p className="font-body content-text font-bold">
        {t("tasks.deleteConfirm.noUndo")}
      </p>
      {error && (
        <p role="alert" className="font-body content-text danger-text">
          {error}
        </p>
      )}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          className="btn-primary text-xs control-off"
        >
          {deleting
            ? t("tasks.deleteConfirm.working")
            : t("tasks.deleteConfirm.submit")}
        </button>
        {/* Hidden rather than disabled while the request is out: cancelling
            cannot recall a delete that is already happening. */}
        {!deleting && (
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="btn-outline text-xs"
          >
            {t("tasks.deleteConfirm.cancel")}
          </button>
        )}
      </div>
    </div>
  );
}
