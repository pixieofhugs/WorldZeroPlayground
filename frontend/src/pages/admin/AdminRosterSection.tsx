import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { getAdmins, grantAdmin, revokeAdmin } from "../../api/admin";
import type { AdminRow } from "../../api/admin";
import { extractError } from "../../utils/errors";
import AdminConfirm from "./AdminConfirm";

/**
 * The owner-only admin roster (#3258). The server says who the owner is
 * (`is_owner` on `/auth/me`); this component never guesses from a username, and
 * every route behind it is `require_owner` regardless of what renders here.
 */
export default function AdminRosterSection({ isOwner }: { isOwner: boolean }) {
  return isOwner ? <AdminRoster /> : null;
}

function AdminRoster() {
  const { t } = useTranslation("admin");
  const [admins, setAdmins] = useState<AdminRow[] | null>(null);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<AdminRow | null>(null);

  const refresh = () =>
    getAdmins()
      .then(setAdmins)
      .catch((err) => setError(extractError(err, t("admins.loadError"))));

  useEffect(() => {
    void refresh();
  }, []);

  const handleGrant = async (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await grantAdmin(username.trim());
      setUsername("");
      await refresh();
    } catch (err) {
      setError(extractError(err, t("admins.grantError")));
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (row: AdminRow) => {
    setBusy(true);
    setError(null);
    try {
      await revokeAdmin(row.username);
      setRevoking(null);
      await refresh();
    } catch (err) {
      setError(extractError(err, t("admins.revokeError")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card px-4 py-3 mb-6">
      <h2 className="label-heading">{t("admins.heading")}</h2>
      <p className="font-body content-text text-muted mb-3">{t("admins.lead")}</p>
      {error && !revoking && (
        <p role="alert" className="font-body content-text danger-text mb-3">
          {error}
        </p>
      )}
      {admins === null ? (
        <p className="font-body content-text text-muted">{t("admins.loading")}</p>
      ) : admins.length === 0 ? (
        <p className="font-body content-text text-muted">{t("admins.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2 mb-3">
          {admins.map((row) =>
            revoking?.username === row.username ? (
              <li key={row.username}>
                <AdminConfirm
                  heading={t("admins.revokeConfirm.heading")}
                  lead={t("admins.revokeConfirm.lead", {
                    name: row.display_name,
                    username: row.username,
                  })}
                  confirmLabel={t("admins.revokeConfirm.submit")}
                  busyLabel={t("admins.revokeConfirm.working")}
                  cancelLabel={t("admins.revokeConfirm.cancel")}
                  busy={busy}
                  error={error}
                  onConfirm={() => void handleRevoke(row)}
                  onCancel={() => {
                    setRevoking(null);
                    setError(null);
                  }}
                />
              </li>
            ) : (
              <li key={row.username} className="flex items-center gap-3">
                <span className="flex-1 font-body text-sm">
                  <span className="font-bold">{row.display_name}</span>
                  <span className="text-xs text-muted ml-2">@{row.username}</span>
                  {row.is_owner && (
                    <span className="text-xs text-muted ml-2">
                      {t("admins.ownerBadge")}
                    </span>
                  )}
                </span>
                {!row.is_owner && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setRevoking(row);
                    }}
                    className="btn-outline text-xs shrink-0"
                    style={{
                      borderColor: "var(--color-danger-ring)",
                      color: "var(--color-danger)",
                    }}
                  >
                    {t("admins.revoke")}
                  </button>
                )}
              </li>
            ),
          )}
        </ul>
      )}
      <form onSubmit={(event) => void handleGrant(event)} className="flex gap-2 flex-wrap">
        <input
          type="text"
          aria-label={t("admins.grantLabel")}
          placeholder={t("admins.grantPlaceholder")}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="border-2 border-border bg-card px-3 py-2 font-body content-text focus:outline-none focus:border-ink flex-1"
        />
        <button type="submit" disabled={busy || !username.trim()} className="btn-primary text-xs control-off">
          {busy ? t("admins.granting") : t("admins.grantSubmit")}
        </button>
      </form>
    </section>
  );
}
