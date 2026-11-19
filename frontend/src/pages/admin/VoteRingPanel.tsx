import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getVoteRing } from "../../api/admin";
import type { VoteRing } from "../../api/admin";
import { extractError } from "../../utils/errors";

const pct = (share: number) => `${Math.round(share * 100)}%`;

/** Presentational half, so the test renders it without a fetch. */
export function VoteRingView({
  id,
  ring,
  onWalk,
}: {
  id: number;
  ring: VoteRing;
  onWalk: (accountId: number) => void;
}) {
  const { t } = useTranslation("admin");
  return (
    <div className="mt-4" data-testid="vote-ring">
      <p className="label-heading mb-2">{t("accounts.ring.heading", { id })}</p>
      {ring.recipients.length === 0 ? (
        <p className="font-body content-text text-muted">{t("accounts.ring.empty")}</p>
      ) : (
        <>
          <p className="font-body content-text mb-2">
            {t("accounts.ring.summary", {
              votes: ring.total_votes,
              share: pct(ring.top3_share),
            })}
          </p>
          <ul className="flex flex-col gap-2">
            {ring.recipients.map((r) => (
              <li key={r.account_id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <button
                  type="button"
                  onClick={() => onWalk(r.account_id)}
                  className="font-body text-sm font-bold underline bg-transparent border-0 p-0 cursor-pointer"
                  aria-label={`${t("accounts.ring.walk")}: ${r.display_name}`}
                >
                  {r.display_name}
                </button>
                <span className="font-body text-xs text-muted">
                  {t("accounts.ring.recipient", {
                    votes: r.votes,
                    stars: r.average_stars.toFixed(1),
                    share: pct(r.share),
                  })}
                </span>
                {r.reciprocal && (
                  <span className="font-body text-xs font-bold danger-text">
                    {t("accounts.ring.reciprocal")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default function VoteRingPanel({ accountId }: { accountId: number }) {
  const { t } = useTranslation("admin");
  const [id, setId] = useState(accountId);
  const [ring, setRing] = useState<VoteRing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRing(null);
    setError(null);
    getVoteRing(id)
      .then(setRing)
      .catch((err) => setError(extractError(err, t("accounts.ring.loadError"))));
  }, [id, t]);

  if (error) return <p className="font-body content-text danger-text mt-4">{error}</p>;
  if (!ring) return null;
  return <VoteRingView id={id} ring={ring} onWalk={setId} />;
}
