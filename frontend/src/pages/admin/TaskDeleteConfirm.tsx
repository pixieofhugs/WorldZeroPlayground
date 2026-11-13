import { useTranslation } from "react-i18next";
import AdminConfirm from "./AdminConfirm";

interface TaskDeleteConfirmProps {
  title: string;
  deleting: boolean;
  /** The server's refusal, shown here rather than at the top of a long list. */
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The words of the task-delete confirm (#3062). The panel itself — the
 * alertdialog, the focus on cancel, the busy state — is `AdminConfirm`.
 */
export default function TaskDeleteConfirm({
  title,
  deleting,
  error,
  onConfirm,
  onCancel,
}: TaskDeleteConfirmProps) {
  const { t } = useTranslation("admin");
  return (
    <AdminConfirm
      heading={t("tasks.deleteConfirm.heading")}
      lead={t("tasks.deleteConfirm.lead", { title })}
      confirmLabel={t("tasks.deleteConfirm.submit")}
      busyLabel={t("tasks.deleteConfirm.working")}
      cancelLabel={t("tasks.deleteConfirm.cancel")}
      busy={deleting}
      error={error}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <p className="font-body content-text text-muted">
        {t("tasks.deleteConfirm.scope")}
      </p>
      <p className="font-body content-text font-bold">
        {t("tasks.deleteConfirm.undo")}
      </p>
    </AdminConfirm>
  );
}
