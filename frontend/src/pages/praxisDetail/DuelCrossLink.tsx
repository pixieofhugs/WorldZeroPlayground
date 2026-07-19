/**
 * DuelCrossLink — the read-page duel RAIL (#313, grown to a full rail in #718).
 *
 * One shared faction-tokened component dropped above every praxis-read archetype
 * (per the grilled #310 decision: a mechanism, not a per-faction identity
 * statement). It inherits the OPPONENT's faction tokens so the foreign element
 * looks foreign — the numbers, by contrast, come from the VIEWER's own faction
 * config, because the modifier that applies to you is yours.
 *
 * #718 replaced the one-line body with the design's rail content — cast-status
 * roster, next-step line, persistent stakes — but deliberately NOT the design's
 * two-pane workspace layout: no two-column layout exists anywhere in
 * praxisDetail/, and mobile forbids one outright (SPEC-faction-ui-profile §1a).
 * All the logic lives in `components/duel/shared.tsx` slots; this file is a
 * frame plus the per-status branch table.
 *
 * Lifecycle states (ADR-0011) — one branch per DuelStatus, no fallthrough
 * (#717: pending/declined used to render a live settled tally):
 *  - pending  (challenge sent, unanswered): "waiting to accept". Casting isn't
 *              gated on accept, so a praxis can exist here. No tally, and the
 *              stakes slot shows the solo-fallback line instead of a win/lose pair.
 *  - declined (opponent said no): scores as an ordinary praxis — no multiplier.
 *  - active   (accepted, pre-settle): roster + next step. No tally — voting isn't
 *              open and the duel hasn't settled.
 *  - settled  (both submitted): live points-from-votes tally on both sides, who's
 *              ahead (floats with the votes, never frozen), and a cross-link.
 *  - forfeited (opponent unsubmitted/banned, #307): "won by default" on the
 *              winner / "you forfeited" for the thrower; the thrown-side link
 *              404s gracefully (it's a plain link, so it never breaks this page).
 */
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { factionCssVar, factionName } from "../../utils/factions";
import { pickVariant } from "../../utils/factionDispatch";
import { surfaceMap } from "../../factions";
import { useFormFactor } from "../../hooks/useFormFactor";
import { mediaUrl } from "../../utils/media";
import type { PraxisOut } from "../../api/praxis";
import type { DuelDetailOut, DuelSideOut } from "../../api/duel";
import {
  NextStepLine,
  RaceRoster,
  StakesTiles,
  type DuelSlotTheme,
} from "../../components/duel/shared";

/**
 * The rail is mounted by the dispatcher, above the archetype, so it can't read
 * the archetype's own content width — and the old hardcoded 42rem left it
 * visibly short on the two archetypes that aren't max-w-2xl (#718). One row per
 * exception; everything else is the 42rem that six archetypes and CommentThread
 * already share.
 */
const RAIL_WIDTH_BY_SLUG: Record<string, string> = {
  everymen: "46rem", // EverymenPraxisDetail
  wow: "720px", // CovenPraxisDetail
};
const DEFAULT_RAIL_WIDTH = "42rem";

/* -------------------------------------------------------------------------- */
/* Skin contract (#720)                                                        */
/* -------------------------------------------------------------------------- */

/**
 * What a rail SKIN receives. Every branch — forfeited-pre-empts-status, the
 * per-`DuelStatus` table, and the slot composition inside `body` — is resolved
 * by the dispatcher below and handed over as already-rendered nodes. A skin
 * therefore *cannot* recompute a figure or re-derive a status; it can only
 * arrange these four slots inside its own chrome. It must never drop one.
 *
 * `accent`/`soft` are the OPPONENT's faction tokens (the foreign element looks
 * foreign, per #310) and are handed down pre-resolved so a skin never re-reads
 * the faction registry either.
 *
 * A skin must NOT set `fontSize` on its wrapper (#769). Every slot arrives
 * already sized by its own role class, and a wrapper size silently overrides
 * all of them at once — which is exactly how the rail body ended up at 9px.
 * A skin owns font, colour and ornament, never type size (WORLD_ZERO_STYLE §4a).
 */
export interface DuelRailSkinProps {
  /** Opponent-faction accent, pre-resolved to a CSS var reference. */
  accent: string;
  /** Opponent-faction soft/light wash, pre-resolved. */
  soft: string;
  /** The archetype-matched rail width for the TASK's faction. */
  maxWidth: string;
  /** The state headline — one line per branch. Always present. */
  headline: ReactNode;
  /** Settled-only live score pair. `null` in every other state. */
  tally: ReactNode | null;
  /** Settled-only "who's ahead" note. `null` in every other state. */
  note: ReactNode | null;
  /** Roster + next-step + stakes. `null` for declined and forfeited, which have no race left. */
  body: ReactNode | null;
}

/** The plain rail: a soft wash with an accent edge, the shape #313 shipped. */
export function DefaultDuelRail({
  accent,
  soft,
  maxWidth,
  headline,
  tally,
  note,
  body,
}: DuelRailSkinProps) {
  const wrapper: CSSProperties = {
    maxWidth,
    margin: "var(--space-lg) 0",
    padding: "var(--space-md) var(--space-lg)",
    borderLeft: `3px solid ${accent}`,
    background: soft,
    fontFamily: "var(--font-body)",
    color: "var(--color-text)",
  };
  return (
    // .content-text, not a wrapper `fontSize` (#769). This wrapper used to set
    // var(--text-sm) — 9px, Label tier — and every slot inside it inherited
    // that. A skin owns font, colour and ornament, never type size (§4a).
    <div className="content-text" style={wrapper}>
      {tally ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "var(--space-md)",
            flexWrap: "wrap",
          }}
        >
          {headline}
          {tally}
        </div>
      ) : (
        headline
      )}
      {note}
      {body}
    </div>
  );
}

function OpponentBadge({ side }: { side: DuelSideOut }) {
  const { t } = useTranslation("praxis");
  const border = factionCssVar(side.faction_slug, "border");
  const soft = factionCssVar(side.faction_slug, "light");
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-sm)" }}>
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
        <span style={{ opacity: 0.7 }}>{t("duelCrossLink.factionSuffix", { faction: factionName(side.faction_slug) })}</span>
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
  const { t } = useTranslation("praxis");
  const isChallenger = praxis.id === duel.challenger.praxis_id;
  const me: DuelSideOut = isChallenger ? duel.challenger : duel.opponent;
  const foe: DuelSideOut = isChallenger ? duel.opponent : duel.challenger;

  const accent = factionCssVar(foe.faction_slug);
  const soft = factionCssVar(foe.faction_slug, "light");

  // The skin is chosen by the TASK's faction (like the archetype it sits above);
  // only the tokens above are the opponent's.
  const formFactor = useFormFactor();
  const Skin =
    formFactor === "mobile"
      ? pickVariant(
          surfaceMap('mobileDuelRail'),
          praxis.task_faction_slug,
          DefaultDuelRail,
        )
      : pickVariant(
          surfaceMap('duelRail'),
          praxis.task_faction_slug,
          DefaultDuelRail,
        );

  const frame = {
    accent,
    soft,
    maxWidth:
      RAIL_WIDTH_BY_SLUG[praxis.task_faction_slug ?? ""] ?? DEFAULT_RAIL_WIDTH,
  };

  const theme: DuelSlotTheme = { accent };
  const forfeited = duel.forfeited_by_character_id != null;

  // The rail body every live state shares: who has cast, what happens next, and
  // what it's worth. The slots own every branch inside them. `settled` passes
  // nextStep={false} — its own "live" standing line already says the same thing.
  const body = (nextStep: boolean) => (
    <>
      <RaceRoster me={me} foe={foe} theme={theme} />
      {nextStep && <NextStepLine duel={duel} me={me} foe={foe} theme={theme} />}
      <StakesTiles
        viewerFactionSlug={me.faction_slug}
        opponentFactionSlug={foe.faction_slug}
        opponentName={foe.display_name}
        taskPointValue={praxis.task_point_value}
        status={duel.status}
        theme={theme}
      />
    </>
  );

  // forfeited: won-by-default / you-forfeited. Checked before status, since a
  // forfeit can land on a duel in any live state. The foe link 404s if the
  // thrown side was withdrawn — a plain <Link>, so it never breaks this page.
  if (forfeited) {
    const iForfeited = duel.forfeited_by_character_id === me.character_id;
    return (
      <Skin
        {...frame}
        tally={null}
        note={null}
        body={null}
        headline={
          iForfeited ? (
            <span>{t("duelCrossLink.youForfeited")}</span>
          ) : (
            <span>
              <strong>{t("duelCrossLink.wonByDefault")}</strong>
              {t("duelCrossLink.wonByDefaultSuffix", { name: foe.display_name })}
              {foe.praxis_id != null && (
                <>
                  {" "}
                  (
                  <Link to={`/praxes/${foe.praxis_id}`} style={{ color: accent }}>
                    {t("duelCrossLink.theirEntry")}
                  </Link>
                  )
                </>
              )}
              .
            </span>
          )
        }
      />
    );
  }

  // pending: the challenge is out but unanswered. Casting isn't gated on accept,
  // so this praxis can exist before the opponent responds — no tally yet, and
  // StakesTiles swaps its win/lose pair for the solo-fallback line.
  if (duel.status === "pending") {
    return (
      <Skin
        {...frame}
        tally={null}
        note={null}
        headline={
          <span>{t("duelCrossLink.pending", { name: foe.display_name })}</span>
        }
        body={body(true)}
      />
    );
  }

  // declined: no duel happened. praxis_scoring only picks up active/settled
  // duels, so this praxis takes no duel multiplier — say so plainly and stop.
  // No roster, no stakes: there is nothing left to race for or win.
  if (duel.status === "declined") {
    return (
      <Skin
        {...frame}
        tally={null}
        note={null}
        body={null}
        headline={
          <span>{t("duelCrossLink.declined", { name: foe.display_name })}</span>
        }
      />
    );
  }

  // active: accepted, not yet settled. Roster + next step + stakes, no tally —
  // voting isn't open and at most one side has cast.
  if (duel.status === "active") {
    return (
      <Skin
        {...frame}
        tally={null}
        note={null}
        headline={
          <span style={{ fontWeight: 700 }}>
            {t("duelCrossLink.dueling", { name: foe.display_name })}
          </span>
        }
        body={body(true)}
      />
    );
  }

  // settled: both sides cast. Live tally + cross-link, on top of the shared body.
  const diff = me.points_from_votes - foe.points_from_votes;
  const standing =
    diff === 0
      ? t("duelCrossLink.standing.tied")
      : diff > 0
      ? t("duelCrossLink.standing.ahead")
      : t("duelCrossLink.standing.behind");
  return (
    <Skin
      {...frame}
      headline={
        <span>
          <span style={{ fontWeight: 700 }}>{t("duelCrossLink.duel")}</span>{" "}
          {t("duelCrossLink.vs")}{" "}
          {foe.praxis_id != null ? (
            <Link to={`/praxes/${foe.praxis_id}`} style={{ color: accent }}>
              <OpponentBadge side={foe} />
            </Link>
          ) : (
            <OpponentBadge side={foe} />
          )}
        </span>
      }
      tally={
        /* A live score pair: a number the player cares about, so content tier
           (.content-title) rather than whatever the frame happens to set. */
        <span className="content-title" style={{ whiteSpace: "nowrap" }}>
          <strong>{me.points_from_votes}</strong>
          <span style={{ opacity: 0.6 }}> — </span>
          <strong>{foe.points_from_votes}</strong>
        </span>
      }
      note={
        <div className="content-text" style={{ marginTop: "var(--space-xs)", opacity: 0.85 }}>
          {t("duelCrossLink.live", { standing })}
        </div>
      }
      body={body(false)}
    />
  );
}
