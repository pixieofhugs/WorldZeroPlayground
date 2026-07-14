import { useTranslation } from "react-i18next";
import type { VoteUIProps } from "./VoteUI";
import { useVote } from "./useVote";
import { VoteLoginGate, VoteSummary } from "./VoteShell";
import { CONCORD, toRoman } from "../cards/ephemeristsAtoms";
import { VOTE_REFRAMES } from "./voteReframes";

/**
 * The Ephemerists vote UI — THE CONCORDANCE. The 1–5 approval becomes a
 * wax-seal ramp ("how well does the filed truth hold up?"): apocryphal → the
 * authoritative ink seal at V. Round seal buttons with a dashed inset, Cinzel
 * roman numerals, italic tier labels. Drives the shared useVote hook.
 */
const SEAL_SIZE = 42;

/** Visual tokens (fill, ink) keyed by tier value — labels come from voteReframes. */
const CONCORD_VISUALS: Record<number, { fill: string; ink: string }> = Object.fromEntries(
  CONCORD.map((tier) => [tier.v, { fill: tier.fill, ink: tier.ink }])
);

const TIERS = VOTE_REFRAMES['ephemerists'].tiers;

export default function EphemeristsVote({
  praxisId,
  currentValue,
  points,
  totalVotes,
}: VoteUIProps) {
  const { t } = useTranslation("votes");
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue);

  if (!user) {
    return <VoteLoginGate />;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {TIERS.map((tier) => {
          const visual = CONCORD_VISUALS[tier.value] ?? CONCORD_VISUALS[1];
          const filled = selected >= tier.value;
          const active = selected === tier.value;
          return (
            <div key={tier.value} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <button
                disabled={saving}
                onClick={() => void vote(tier.value)}
                aria-label={t("chrome.ephemerists.rateAria", { value: tier.value, label: tier.label })}
                style={{
                  position: "relative",
                  width: SEAL_SIZE,
                  height: SEAL_SIZE,
                  cursor: saving ? "default" : "pointer",
                  padding: 0,
                  borderRadius: "50%",
                  border: "2px solid var(--eph-ink)",
                  background: filled ? visual.fill : "var(--eph-vellum)",
                  color: filled ? visual.ink : "var(--eph-muted)",
                  fontFamily: "var(--eph-display)",
                  fontWeight: 700,
                  fontSize: SEAL_SIZE * 0.34,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: active ? "rotate(-5deg) scale(1.09)" : "none",
                  transition: "all 110ms",
                  boxShadow: filled
                    ? "inset 0 -2px 4px rgba(0,0,0,0.3), inset 0 2px 3px rgba(255,255,255,0.18)"
                    : "none",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    inset: 3,
                    borderRadius: "50%",
                    border: `1px dashed ${
                      filled
                        ? "color-mix(in srgb, #fff 40%, transparent)"
                        : "color-mix(in srgb, var(--eph-vellum-text) 28%, transparent)"
                    }`,
                    pointerEvents: "none",
                  }}
                />
                {toRoman(tier.value)}
              </button>
              <span
                style={{
                  fontFamily: "var(--eph-serif)",
                  fontSize: 8,
                  fontStyle: "italic",
                  letterSpacing: "0.02em",
                  color: active ? "var(--eph-rubric)" : "var(--eph-muted)",
                  maxWidth: SEAL_SIZE + 12,
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                {tier.label}
              </span>
            </div>
          );
        })}
      </div>

      <VoteSummary
        selected={selected}
        points={points}
        totalVotes={totalVotes}
        error={error}
        theme={{
          muted: "var(--eph-muted)",
          accent: "var(--eph-rubric)",
          accentFont: "var(--eph-display)",
          avgFontSize: 15,
          errorColor: "var(--eph-rubric)",
          avgLetterSpacing: "0.02em",
        }}
      />
    </div>
  );
}
