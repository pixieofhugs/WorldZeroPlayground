import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { extractError } from "../../utils/errors";
import AdminConfirm from "./AdminConfirm";

interface ModerateConfirmProps {
  heading: string;
  lead: string;
  confirmLabel: string;
  errorFallback: string;
  run: () => Promise<void>;
  /** Extra fields (a reason); `confirmDisabled` holds the button until they are filled. */
  children?: ReactNode;
  confirmDisabled?: boolean;
  onCancel: () => void;
}

/** `AdminConfirm` that owns its busy and error state; `run` resolving closes it (the caller unmounts it). */
export default function ModerateConfirm({
  heading,
  lead,
  confirmLabel,
  errorFallback,
  run,
  children,
  confirmDisabled,
  onCancel,
}: ModerateConfirmProps) {
  const { t } = useTranslation("admin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await run();
    } catch (err) {
      setError(extractError(err, errorFallback));
      setBusy(false);
    }
  };

  return (
    <AdminConfirm
      heading={heading}
      lead={lead}
      confirmLabel={confirmLabel}
      busyLabel={t("moderateConfirm.working")}
      cancelLabel={t("moderateConfirm.cancel")}
      busy={busy}
      confirmDisabled={confirmDisabled}
      error={error}
      onConfirm={() => void confirm()}
      onCancel={onCancel}
    >
      {children}
    </AdminConfirm>
  );
}
