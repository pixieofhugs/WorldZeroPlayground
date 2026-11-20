import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getVoteRing } from "../../api/admin";
import type { VoteRing } from "../../api/admin";
import { extractError } from "../../utils/errors";
import "./adminPeople.css";

const pct = (share: number) => `${Math.round(share * 100)}%`;

/** Presentational half, so the test renders it without a fetch. */
export function VoteRingView({ name, ring }: { name: string; ring: VoteRing }) {
  const { t } = useTranslation("admin");
  const baseline = ring.eligible > 0 ? 1 / ring.eligible : null;
  const top = ring.recipients[0];
  return (
    <section className="adm-sec" data-testid="vote-ring">
      <h3 className="adm-h2">{t("console.people.ring.heading")}</h3>
      {!top ? (
        <p className="adm-muted">{t("console.people.ring.empty")}</p>
      ) : (
        <>
          <p>
            {t("console.people.ring.summary", {
              votes: ring.total_votes,
              count: ring.recipients.length,
              eligible: ring.eligible,
            })}
          </p>
          <div className="adm-ring">
            {ring.recipients.map((r) => (
              <RingRow key={r.account_id} name={r.display_name} share={r.share} baseline={baseline} warn={r === top && r.votes_back > 0} />
            ))}
          </div>
          <p className="adm-muted">
            {baseline !== null && t("console.people.ring.baseline", { share: pct(baseline) })}
            {top.votes_back > 0 &&
              ` ${t("console.people.ring.votesBack", { top: top.display_name, back: top.votes_back, of: top.votes_back_of, name })}`}
          </p>
        </>
      )}
    </section>
  );
}

function RingRow({ name, share, baseline, warn }: { name: string; share: number; baseline: number | null; warn: boolean }) {
  return (
    <>
      <span>{name}</span>
      <span className="adm-bar-track">
        <span className={warn ? "adm-bar-fill adm-bar-fill-warn" : "adm-bar-fill"} style={{ width: pct(share) }} />
        {baseline !== null && <span className="adm-bar-even" style={{ left: pct(baseline) }} />}
      </span>
      <span className="adm-num">{pct(share)}</span>
    </>
  );
}

export default function VoteRingPanel({ accountId, name }: { accountId: number; name: string }) {
  const { t } = useTranslation("admin");
  const [ring, setRing] = useState<VoteRing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRing(null);
    setError(null);
    let stale = false;
    getVoteRing(accountId)
      .then((r) => !stale && setRing(r))
      .catch((err) => !stale && setError(extractError(err, t("console.people.ring.loadError"))));
    return () => {
      stale = true;
    };
  }, [accountId, t]);

  if (error) return <p className="adm-err">{error}</p>;
  if (!ring) return null;
  return <VoteRingView name={name} ring={ring} />;
}
