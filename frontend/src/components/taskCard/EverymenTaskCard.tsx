import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import { EverymenBand } from "../cardMasthead/factionBands";
import PointsRoundel from "../factionMarks/PointsRoundel";
import { EverymenCog } from "../factionMarks/everymenCogs";
import { FistAndBolt } from "../factionMarks/everymenFistBolt";
import { CARD_CTA_ROW, EVERYMEN_CARD_CTA } from "./cardCta";
import { CardCtaControl } from "./CardCtaControl";
import { taskCardSignupCta } from "./signupAffordance";
import { useGroundIsBusy } from "../backdrop/BackdropContext";
import i18n from "../../i18n";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";
import { factionRoleVars } from "../../utils/factionRoles";
import { factionBodyVars } from "../../utils/factionBodyFace";

/**
 * Everymen — THE HELP WANTED BILL (task card v2, #1023).
 *
 * A WPA union broadsheet posted on a wall: a double-ruled red masthead flanked
 * by toothed cogs, poster rays fanning out from behind it, a typewritten
 * dispatch in Courier Prime, a rubber-stamp points seal struck a few degrees off
 * true, a red dashed rule, and a full-bleed report-for-duty bar. Bebas Neue
 * carries every headline and label; Courier Prime carries everything read.
 *
 * This replaces "The Rally Bill" (ADR-0055 / ADR-0056). Same family of
 * references, rebuilt on the shared v2 information structure: eyebrow → LEVEL +
 * POINTS hero → title → brief → in-progress → CTA.
 *
 * ONE RESPONSIVE COMPONENT (ADR-0056): `useFormFactor` picks the size set, not a
 * different card. There is no mobile twin — this file serves both form factors.
 *
 * v3 ornament (#2034): the seal is now the SHARED {@link PointsRoundel} rather
 * than a second circle drawn here, the poster rays converge on the sheet's
 * centre instead of its upper third, and a fist gripping a bolt flanks the
 * sign-up on both sides. All the GEOMETRY is inline SVG and `color-mix` on
 * existing tokens, because the task card is a lazy archetype
 * (`factions/everymen.ts`) and bytes drawn here never touch the critical path.
 *
 * The MOTION cannot be drawn here — a reduced-motion gate has no inline form —
 * and #2034 dropped it rather than spend the blocking stylesheet. #2071 rules
 * the discharge back in, and #2073's deferred `src/motion.ornament.css` is where
 * it goes: off the critical path, so the old objection no longer applies. The
 * classes are `.evm-arc` and `.evm-bolt`; see {@link FistAndBolt}.
 *
 * Colour comes almost entirely from the existing `--everymen-*` family, which
 * the design's own palette turned out to match value-for-value; only the
 * masthead, the CTA bar, the modifier ink and the three washes needed new
 * `--faction-everymen-bill-*` tokens. Light/dark flips through the
 * `[data-theme="dark"]` cascade, never a ternary.
 */

const POSTER = "var(--ev-task-face)"; /* Bebas Neue */
const TYPED = "var(--faction-everymen-body-font)"; /* Courier Prime */

/**
 * The sheet's ink — the paper's own text colour, which FLIPS with the paper.
 * Deliberately not `--everymen-ink`, which is a near-black structure colour in
 * dark and would vanish on a dark bill.
 */
const INK = "var(--everymen-paper-text)";

interface SizeSet {
  /**
   * Card width: the raw px number this archetype drew (geometry,
   * WORLD_ZERO_STYLE §4a) on the desktop, and the whole content column on a
   * phone — below 768px a card fills its column (#2763).
   */
  cardWidth: number | "100%";
  bodyPad: string;
  titleSize: string;
  levelSize: string;
  /** Diameter of the rubber-stamp seal — the roundel typesets itself from it. */
  seal: number;
  /**
   * The fist-and-bolt's width beside the CTA — a flex BASIS, not a fixed size.
   * The design draws it at 104 on a card wide enough to hold two of them plus
   * the button; ours is 384 at most and `maxWidth:100%` under that, so the pair
   * shrinks with the row rather than pushing the button out of it. Geometry.
   */
  mark: number;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    cardWidth: 384,
    bodyPad: "var(--space-lg) var(--space-xl) var(--space-xl)",
    titleSize: "var(--text-heading)",
    levelSize: "var(--text-display)",
    seal: 70,
    mark: 96,
  },
  mobile: {
    cardWidth: "100%",
    bodyPad: "var(--space-lg) var(--space-lg) var(--space-lg)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-heading)",
    seal: 62,
    mark: 84,
  },
};

/** Poster label voice — condensed caps, the bill's whole chrome. */
const LABEL: CSSProperties = {
  fontFamily: POSTER,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};

export default function EverymenTaskCard({
  task,
  basePoints,
  multiplier,
  inProgressCount,
  onSignup,
}: CardProps) {
  const formFactor = useFormFactor();
  const groundIsBusy = useGroundIsBusy();
  const size = SIZES[formFactor];
  const cta = taskCardSignupCta(task, onSignup);
  const showMultiplier = !isNeutralMultiplier(multiplier);

  return (
    <div
      data-form-factor={formFactor}
      style={{
        ...factionBodyVars("everymen"), ...factionRoleVars("everymen", "ev-task"),
        width: size.cardWidth,
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <article
        style={{
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          width: "100%",
          background: "var(--everymen-paper)",
          color: INK,
          border: `2px solid ${INK}`,
          borderRadius: 2,
          padding: "var(--space-xs)",
          boxShadow: "var(--faction-everymen-bill-shadow)",
        }}
      >
        <div style={{ position: "relative", overflow: "hidden", border: `1px solid ${INK}`, borderRadius: 1 }}>
          {/* THE FACTION'S ONE ORNAMENT, and it alternates (#2195/#2393).

              The drawing — poster rays converging on the sheet's centre under
              two corner glows and a radial mask — is `.em-burst` in index.css.
              It was written out here, and eight other Everymen surfaces each
              wrote out a variant of it; the owner ruled one drawing per faction,
              so this card names the class the rest of the kit now mounts too.

              On a PATTERNED page ground it is not mounted at all: a card on an
              ornamented ground goes plain, and plain means bare — never a
              second texture. The predicate is any patterned ground, not just
              Everymen's own (owner ruled (a)); a faction page claims an
              exemption and keeps it. Nothing ELSE on this card branches — the
              masthead, the frame, the seal, the dashed rule and the CTA bar are
              identical either way, which is what makes this an ornament rule
              and not a second card. */}
          {!groundIsBusy && <div aria-hidden="true" className="em-burst" />}

          {/* Masthead — the union's red bar, mounted from the shared band
              (#2185) so the Everymen praxis card wears the identical one. It
              did not: the praxis card drew its own bar in `--everymen-red` with
              two cogs and no name. The paint, and why the cogs stood down, live
              at `cardMasthead/factionBands`. */}
          <EverymenBand />

          <div style={{ position: "relative", zIndex: 2, padding: size.bodyPad }}>
            {/* Everything but the CTA reads the full call — a card-sized target
                that stays valid HTML (no <button> nested in an <a>). */}
            <Link to={`/tasks/${task.id}`} data-card-link="" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
              {/* The dateline carried the uniform "Task {id}" ordinal and nothing
                  else, so #1124's retirement of the id takes the whole line. */}
              {/* LEVEL and the seal ride in two EQUAL halves with the cog
                  between them, so the cog lands on the sheet's own centreline —
                  the axis the masthead pair and the rays' convergence already
                  share (#1965). It used to be the midpoint of the dashed rule,
                  which begins after LEVEL and ends before the seal: a span whose
                  centre is (levelWidth − sealWidth) / 2 ≈ 20px LEFT of the card's,
                  which is exactly how far off true the cog read.

                  ponytail: the halves are equal only while each holds less than
                  half the row. LEVEL always does; the right half does too until
                  the ×modifier badge appears beside the seal, which era_1's
                  neutralized multipliers never let happen. Ceiling: an era that
                  ships a non-1.0 modifier pushes the cog left again on mobile.
                  Upgrade path: at that point the badge wants its own line under
                  the seal rather than a third thing crowding one row. */}
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
                <div style={{ flex: "1 1 0", display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                  <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}>
                    <span style={{ ...LABEL, fontSize: "var(--text-base)", color: "var(--everymen-muted)", marginBottom: "var(--space-xs)" }}>
                      {i18n.t("feed:taskCard.levelCaption")}
                    </span>
                    <span style={{ fontFamily: POSTER, fontSize: size.levelSize, lineHeight: 0.82 }}>
                      {task.level_required}
                    </span>
                  </div>
                  <span aria-hidden="true" style={{ flex: 1, height: 0, borderTop: "2px dashed var(--everymen-red)" }} />
                </div>

                <EverymenCog size={15} fill="var(--everymen-red)" hub="var(--everymen-paper)" />

                <div style={{ flex: "1 1 0", display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                  <span aria-hidden="true" style={{ flex: 1, height: 0, borderTop: "2px dashed var(--everymen-red)" }} />

                  {/* The faction modifier — hidden at ×1.00, so invisible under
                      era_1's neutralized modifiers and automatic the day one moves
                      (ADR-0055). */}
                  {showMultiplier && (
                    <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-xs)" }}>
                      <span
                        style={{
                          ...LABEL,
                          fontSize: "var(--text-lg)",
                          letterSpacing: "0.04em",
                          color: "var(--faction-everymen-bill-mult-ink)",
                          border: "1.5px solid var(--everymen-gold)",
                          borderRadius: 2,
                          padding: "var(--space-xs) var(--space-sm)",
                        }}
                      >
                        {i18n.t("feed:taskCard.multiplier", { value: multiplier.toFixed(2) })}
                      </span>
                      <span style={{ ...LABEL, fontSize: "var(--text-md)", color: "var(--everymen-muted)" }}>
                        {i18n.t("feed:taskCard.modifierCaption")}
                      </span>
                    </div>
                  )}

                  {/* The rubber-stamp points seal, struck a few degrees off
                      true — and since #2034 it is the SHARED roundel, not a
                      second circle drawn here. The mark already existed
                      (`factionMarks/PointsRoundel`, #841/ADR-0049) and the
                      praxis card's score stamp already struck it; this card was
                      the one surface of the two still drawing its own, which
                      #2042's survey named. Everything it holds is typeset in
                      the roundel's own 0..100 user space, so one `size` moves
                      the ring, the figure and the caption together.

                      It carries no `arcLabel`: the legend reads "★ VERIFIED ★
                      ON THE RECORD", which a task nobody has attempted cannot
                      claim. New copy is #2028's, and it is closed.

                      The unit word is #1911's shared `pointsUnit` — the roundel
                      uppercases it, so the catalog's "Points" still strikes as
                      POINTS. Do not undo that. */}
                  <PointsRoundel
                    total={String(basePoints)}
                    unitLabel={i18n.t("feed:taskCard.pointsUnit", { count: basePoints })}
                    size={size.seal}
                    color="var(--everymen-red)"
                  />
                </div>
              </div>

              <h2
                style={{
                  fontFamily: POSTER,
                  fontSize: size.titleSize,
                  lineHeight: 0.96,
                  letterSpacing: "0.01em",
                  textTransform: "uppercase",
                  margin: "0 0 var(--space-sm)",
                  overflowWrap: "anywhere",
                }}
              >
                {task.title}
              </h2>

              {task.description && (
                <p
                  className="card-description"
                  style={{
                    fontFamily: TYPED,
                    lineHeight: 1.55,
                    color: "var(--everymen-muted)",
                    margin: "0 0 var(--space-md)",
                  }}
                >
                  {task.description}
                </p>
              )}

              <div aria-hidden="true" style={{ borderTop: "2px dashed var(--everymen-red)", margin: "0 0 var(--space-md)" }} />

              {inProgressCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                  <EverymenCog size={15} fill="var(--everymen-red)" hub="var(--everymen-paper)" />
                  <span style={{ fontFamily: TYPED, fontSize: "var(--text-lg)", color: "var(--everymen-muted)" }}>
                    {i18n.t("feed:taskCard.inProgress", { count: inProgressCount })}
                  </span>
                </div>
              )}
            </Link>
          </div>

          {/* The report-for-duty bar ran the width of the bill. #2030 makes it
              a struck block with air under it; the dashed red rule above the
              in-progress line is the bill's own bottom treatment, so no rule is
              added here. */}
          {/* The pair flanks the button INSIDE the shared row rather than
              beside it, so #2030's centring and its clearance still hold: three
              flex items, none positioned, the button `0 0 auto` and the two
              marks `0 1` — the button never yields a pixel and the marks give
              way first at any card width. */}
          {cta && (
            <div style={{ ...CARD_CTA_ROW, alignItems: "center", gap: "var(--space-sm)", position: "relative", zIndex: 2 }}>
              <FistAndBolt width={size.mark} mirrored />
              {/* ONE PAINT, TWO SURFACES (#2642) — `EverymenTaskDetail` spreads
                  this same constant, and nothing may be added at either site. */}
              <CardCtaControl cta={cta} style={EVERYMEN_CARD_CTA}>
                {cta.label}
              </CardCtaControl>
              <FistAndBolt width={size.mark} />
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
