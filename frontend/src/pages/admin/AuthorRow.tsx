import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FlaggedPraxisOut } from "../../api/admin";
import ModerateConfirm from "./ModerateConfirm";

export type AuthorAction = "ban" | "suspend" | "removeAll";

interface AuthorRowProps {
  praxis: FlaggedPraxisOut;
  confirming: AuthorAction | null;
  onAsk: (kind: AuthorAction) => void;
  onCancel: () => void;
  onModerate: (praxis: FlaggedPraxisOut, kind: AuthorAction, on: boolean, note?: string) => Promise<void>;
  onViewAccount: (search: string) => void;
}

/** A flagged post's author, moderated from the card: ban and suspend confirm first, their undos do not. */
export default function AuthorRow({
  praxis,
  confirming,
  onAsk,
  onCancel,
  onModerate,
  onViewAccount,
}: AuthorRowProps) {
  const { t } = useTranslation("admin");
  const banned = praxis.author_status === "banned";
  const suspended = praxis.author_account_status === "suspended";
  const name = praxis.created_by_display_name;
  const count = praxis.author_flagged_count;
  const undo = (kind: AuthorAction) => void onModerate(praxis, kind, false).catch(() => {});
  return (
    <div className="rp-author">
      <div className="adm-btns">
        <span className="rp-muted">{t("console.reports.author.label", { name })}</span>
        <button type="button" className="rp-btn" onClick={() => onViewAccount(praxis.author_username)}>
          {t("console.reports.author.openPeople")}
        </button>
        <button type="button" className="rp-btn" onClick={() => onAsk("removeAll")}>
          {t("console.reports.author.removeAll", { count })}
        </button>
        {banned && <span className="rp-tag">{t("console.reports.author.banned")}</span>}
        <button
          type="button"
          className={banned ? "rp-btn" : "rp-btn rp-btn-dng"}
          onClick={() => (banned ? undo("ban") : onAsk("ban"))}
        >
          {banned ? t("console.reports.author.unban") : t("console.reports.author.ban")}
        </button>
        {suspended && <span className="rp-tag">{t("console.reports.author.suspended")}</span>}
        <button
          type="button"
          className={suspended ? "rp-btn" : "rp-btn rp-btn-dng"}
          onClick={() => (suspended ? undo("suspend") : onAsk("suspend"))}
        >
          {suspended ? t("console.reports.author.unsuspend") : t("console.reports.author.suspend")}
        </button>
      </div>
      {confirming && (
        <AuthorConfirm praxis={praxis} kind={confirming} onModerate={onModerate} onCancel={onCancel} />
      )}
    </div>
  );
}

/** Removing a post tells its author why, so "remove all" asks for the reason too. */
function AuthorConfirm({
  praxis,
  kind,
  onModerate,
  onCancel,
}: Pick<AuthorRowProps, "praxis" | "onModerate" | "onCancel"> & { kind: AuthorAction }) {
  const { t } = useTranslation("admin");
  const [note, setNote] = useState("");
  const name = praxis.created_by_display_name;
  const count = praxis.author_flagged_count;
  const needsNote = kind === "removeAll";
  return (
    <ModerateConfirm
      heading={t(`console.reports.author.${kind}Confirm.heading`, { name, count })}
      lead={t(`console.reports.author.${kind}Confirm.lead`, {
        name,
        username: praxis.author_username,
        count,
      })}
      confirmLabel={t(`console.reports.author.${kind}Confirm.submit`, { count })}
      errorFallback={t("console.reports.actionError")}
      confirmDisabled={needsNote && !note.trim()}
      run={() => (needsNote ? onModerate(praxis, kind, true, note.trim()) : onModerate(praxis, kind, true))}
      onCancel={onCancel}
    >
      {needsNote && (
        <label className="adm-field">
          {t("console.reports.decision.reasonLabel")}
          <input
            className="rp-input"
            placeholder={t("console.reports.decision.reasonHint")}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      )}
    </ModerateConfirm>
  );
}
