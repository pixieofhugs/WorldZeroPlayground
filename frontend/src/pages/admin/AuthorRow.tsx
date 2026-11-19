import { useTranslation } from "react-i18next";
import type { FlaggedPraxisOut } from "../../api/admin";
import ModerateConfirm from "./ModerateConfirm";

export type AuthorAction = "ban" | "suspend";

const dangerButton = { borderColor: "var(--color-danger-ring)", color: "var(--color-danger)" };
const successButton = { borderColor: "var(--color-success)", color: "var(--color-success)" };

interface AuthorRowProps {
  praxis: FlaggedPraxisOut;
  confirming: AuthorAction | null;
  onAsk: (kind: AuthorAction) => void;
  onCancel: () => void;
  onModerate: (praxis: FlaggedPraxisOut, kind: AuthorAction, on: boolean) => Promise<void>;
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
  const undo = (kind: AuthorAction) => void onModerate(praxis, kind, false).catch(() => {});
  return (
    <div className="flex flex-col gap-2" style={{ marginTop: "var(--space-sm)" }}>
      <div className="flex items-center gap-2 flex-wrap">
        {banned && <span className="label-caption danger-text">{t("moderation.queue.author.banned")}</span>}
        {suspended && <span className="label-caption danger-text">{t("moderation.queue.author.suspended")}</span>}
        <button
          type="button"
          className="btn-outline text-xs"
          style={banned ? successButton : dangerButton}
          onClick={() => (banned ? undo("ban") : onAsk("ban"))}
        >
          {banned ? t("moderation.queue.author.unban") : t("moderation.queue.author.ban")}
        </button>
        <button
          type="button"
          className="btn-outline text-xs"
          style={suspended ? successButton : dangerButton}
          onClick={() => (suspended ? undo("suspend") : onAsk("suspend"))}
        >
          {suspended ? t("moderation.queue.author.unsuspend") : t("moderation.queue.author.suspend")}
        </button>
        <button
          type="button"
          className="label-caption"
          style={{ background: "none", border: "none", cursor: "pointer" }}
          onClick={() => onViewAccount(praxis.author_username)}
        >
          {t("moderation.queue.author.viewAccount")}
        </button>
      </div>
      {confirming && (
        <ModerateConfirm
          heading={t(`moderation.queue.author.${confirming}Confirm.heading`, { name })}
          lead={t(`moderation.queue.author.${confirming}Confirm.lead`, {
            name,
            username: praxis.author_username,
          })}
          confirmLabel={t(`moderation.queue.author.${confirming}Confirm.submit`)}
          errorFallback={t("moderation.actionError")}
          run={() => onModerate(praxis, confirming, true)}
          onCancel={onCancel}
        />
      )}
    </div>
  );
}
