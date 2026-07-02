/**
 * DuelCrossLink — the read-page duel surface (#313), one shared faction-tokened
 * component dropped below every praxis-read archetype (per the grilled #310
 * decision: a mechanism, not a per-faction identity statement). It inherits the
 * opponent's faction tokens so it reads native inside any archetype.
 *
 * Lifecycle states (ADR-0011, designs in #310):
 *  - active   (accepted, pre-settle): a "⚔ Dueling [opponent]" marker only — no
 *              tally (voting isn't open; the opponent may be unsubmitted).
 *  - settled  (both submitted): live points-from-votes tally on both sides, who's
 *              ahead (floats with the votes, never frozen), and a cross-link.
 *  - forfeited (opponent unsubmitted/banned, #307): "won by default" on the
 *              winner / "you forfeited" for the thrower; the thrown-side link
 *              404s gracefully (it's a plain link, so it never breaks this page).
 */
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { factionCssVar, factionName } from "../../utils/factions";
import { mediaUrl } from "../../utils/media";
import type { PraxisOut } from "../../api/praxis";
import type { DuelDetailOut, DuelSideOut } from "../../api/duel";

function OpponentBadge({ side }: { side: DuelSideOut }) {
  const border = factionCssVar(side.faction_slug, "border");
  const soft = factionCssVar(side.faction_slug, "light");
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {side.avatar_url ? (
        <img
          src={mediaUrl(side.avatar_url)}
          alt=""
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            objectFit: "cover",
            border: `1px solid ${border}`,
          }}
        />
      ) : (
        <span
          aria-hidden
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: soft,
            border: `1px solid ${border}`,
          }}
        />
      )}
      <span>
        <strong>{side.display_name}</strong>
        <span style={{ opacity: 0.7 }}> · {factionName(side.faction_slug)}</span>
      </span>
    </span>
  );
}

export default function DuelCrossLink({
  praxis,
  duel,
}: {
  praxis: PraxisOut;
  duel: DuelDetailOut;
}) {
  const isChallenger = praxis.id === duel.challenger.praxis_id;
  const me: DuelSideOut = isChallenger ? duel.challenger : duel.opponent;
  const foe: DuelSideOut = isChallenger ? duel.opponent : duel.challenger;

  const accent = factionCssVar(foe.faction_slug);
  const soft = factionCssVar(foe.faction_slug, "light");

  const wrapper: CSSProperties = {
    maxWidth: "42rem",
    margin: "16px 0",
    padding: "12px 16px",
    borderLeft: `3px solid ${accent}`,
    background: soft,
    fontFamily: "var(--font-body)",
    fontSize: "var(--text-sm)",
    color: "var(--color-text)",
  };

  const forfeited = duel.forfeited_by_character_id != null;

  // active: marker only.
  if (duel.status === "active" && !forfeited) {
    return (
      <div style={wrapper}>
        <span style={{ fontWeight: 700 }}>⚔ Dueling {foe.display_name}</span>
      </div>
    );
  }

  // forfeited: won-by-default / you-forfeited. The foe link 404s if the thrown
  // side was withdrawn — a plain <Link>, so clicking it 404s without breaking us.
  if (forfeited) {
    const iForfeited = duel.forfeited_by_character_id === me.character_id;
    return (
      <div style={wrapper}>
        {iForfeited ? (
          <span>You forfeited this duel.</span>
        ) : (
          <span>
            <strong>⚔ Won by default</strong> — {foe.display_name} forfeited
            {foe.praxis_id != null && (
              <>
                {" "}
                (
                <Link to={`/praxes/${foe.praxis_id}`} style={{ color: accent }}>
                  their entry
                </Link>
                )
              </>
            )}
            .
          </span>
        )}
      </div>
    );
  }

  // settled: live tally + cross-link.
  const diff = me.points_from_votes - foe.points_from_votes;
  const standing =
    diff === 0 ? "Tied" : diff > 0 ? "You're ahead" : "You're behind";
  return (
    <div style={wrapper}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span>
          <span style={{ fontWeight: 700 }}>⚔ Duel</span> vs{" "}
          {foe.praxis_id != null ? (
            <Link to={`/praxes/${foe.praxis_id}`} style={{ color: accent }}>
              <OpponentBadge side={foe} />
            </Link>
          ) : (
            <OpponentBadge side={foe} />
          )}
        </span>
        <span style={{ whiteSpace: "nowrap" }}>
          <strong>{me.points_from_votes}</strong>
          <span style={{ opacity: 0.6 }}> — </span>
          <strong>{foe.points_from_votes}</strong>
        </span>
      </div>
      <div style={{ marginTop: 4, fontSize: "var(--text-xs)", opacity: 0.85 }}>
        {standing} · live — the winner floats with the votes until era reset.
      </div>
    </div>
  );
}
