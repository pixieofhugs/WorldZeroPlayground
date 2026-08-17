import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import CardMasthead from "./CardMasthead";
import { CARD_CTA, CARD_CTA_ROW } from "./cardCta";
import { taskCardSignupCta } from "./signupAffordance";
import i18n from "../../i18n";
import { factionName } from "../../utils/factions";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";

/**
 * S.N.I.D.E. — THE RANSOM CLIPPING (task card v2, #1023).
 *
 * A photocopied clipping pinned to the wall half a degree off true: a near-black
 * header bar carrying the wordmark and a broken acid rule, a headline cut from
 * four different faces word by word, the points circled in pink pen, censor
 * rules ruling off each section, and a full-bleed acid CTA. Anton, Archivo Black
 * and Special Elite all appear in the headline — a ransom note mixes faces by
 * definition, and here that is literal rather than decorative.
 *
 * THE CENSOR REDACTS ORNAMENT, NEVER CONTENT. The design also struck two words
 * of the task's own brief out as black bars, seeded off the task id. Owner
 * ruling (#1023): a skin does not get to mutilate user-authored text, however
 * well the joke fits — so the brief renders whole, like every other card's.
 * What carries the metaphor instead is the pair of things that redact nothing
 * real: `.snd-censor`, a decorative strip of redaction blocks used as a rule,
 * and the cut-up headline, which RESTYLES words rather than destroying them.
 * Do not reintroduce the word-level strike.
 *
 * This replaces the "Ransom Dispatch" (ADR-0055 / ADR-0056). Same reference,
 * rebuilt on the shared v2 information structure: masthead → LEVEL + POINTS hero
 * → title → brief → in-progress → CTA. The per-CHARACTER cut-out title is gone;
 * cutting per WORD is what a real ransom note does, and it is what survives a
 * forty-character title.
 *
 * ONE RESPONSIVE COMPONENT (ADR-0056): `useFormFactor` picks the size set, not a
 * different card. There is no mobile twin: ADR-0056 was accepted and the
 * `mobileTaskCard` surface retired, so this file serves both form factors.
 *
 * All colour via `--faction-snide-note-*`, which unlike the faction's older
 * ink-dark families FLIPS under `[data-theme="dark"]`: the clipping is a sheet
 * of paper, so it goes photocopier-black at night rather than staying dark. Two
 * light-half inks are walked down for AA — see index.css.
 *
 * The design's fourth face, Permanent Marker, arrives on the SPRAYED CTA and
 * nowhere else (#2035). It stays out of the in-progress line, which is the one
 * job v2's design gave it — setting the COUNT apart from its words — because
 * the uniform "{n} in progress" label (#1020) is a single indivisible string,
 * and recovering that effect would mean regex-slicing a localized sentence.
 */

const IMPACT = "var(--faction-snide-font-impact)"; /* Anton */
const BLACK = "var(--faction-snide-font-black)"; /* Archivo Black */
const TYPE = "var(--faction-snide-font-type)"; /* Special Elite */
const MARKER = "var(--faction-snide-font-marker)"; /* Permanent Marker */

const PAPER = "var(--faction-snide-note-paper)";
const INK = "var(--faction-snide-note-ink)";
const MUTED = "var(--faction-snide-note-muted)";

interface SizeSet {
  /** Card width. Geometry, so a raw px number (WORLD_ZERO_STYLE §4a). */
  cardWidth: number;
  bodyPad: string;
  titleSize: string;
  levelSize: string;
  /** Width of the circled points stamp. Geometry. */
  stamp: number;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    cardWidth: 384,
    bodyPad: "0 var(--space-xl) var(--space-xl)",
    titleSize: "var(--text-heading)",
    levelSize: "var(--text-display)",
    stamp: 96,
  },
  mobile: {
    cardWidth: 340,
    bodyPad: "0 var(--space-lg) var(--space-lg)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-heading)",
    stamp: 86,
  },
};

/**
 * The four sources the headline is cut from. A word takes its cut by index, so
 * a given title always cuts the same way (the seed is the task's own id) and no
 * two neighbouring words share a face.
 *
 * Cut 2 is a knockout, and it names its own pair rather than reusing
 * paper/ink — those two SWAP under the dark cascade, and a knockout that swaps
 * with its ground is an invisible word.
 */
const CUTS: CSSProperties[] = [
  { fontFamily: IMPACT, color: INK, textTransform: "uppercase", transform: "rotate(-1deg)" },
  {
    fontFamily: IMPACT,
    color: "var(--faction-snide-note-cta-ink)",
    background: "var(--faction-snide-acid)",
    padding: "0 var(--space-xs)",
    textTransform: "uppercase",
    transform: "rotate(0.8deg)",
  },
  {
    fontFamily: BLACK,
    color: "var(--faction-snide-note-knockout-ink)",
    background: "var(--faction-snide-note-knockout-bg)",
    // eslint-disable-next-line local/no-raw-style-values -- ornament: the knockout's 1px bleed IS the drawn cut; a 4px rung fattens it into a label chip.
    padding: "1px var(--space-xs)",
    // eslint-disable-next-line local/no-raw-style-values -- ornament: a cut's size is RELATIVE to the headline it was pasted into, not a tier of the type scale.
    fontSize: "0.82em",
    textTransform: "uppercase",
    transform: "rotate(-1.6deg)",
  },
  {
    fontFamily: TYPE,
    color: INK,
    // eslint-disable-next-line local/no-raw-style-values -- ornament: as above; the smallest cut, clipped from body copy rather than a headline.
    fontSize: "0.72em",
    textTransform: "uppercase",
    borderBottom: "2px solid var(--faction-snide-pink)",
    transform: "rotate(1.2deg)",
  },
];

/** A tiled strip of redaction blocks. `.snd-censor` owns its pigments. */
function CensorRule({ style }: { style?: CSSProperties }) {
  return <span aria-hidden="true" className="snd-censor" style={style} />;
}

/**
 * The points, circled in pink pen — the loop grown 1.18x (#2035).
 *
 * The GROWTH IS ON THE SVG ALONE, so the numeral and its caption stay where
 * they are and the loop opens away from them. That is the point of the move
 * (UA's ensō makes the same one): a scale on the whole stamp would grow the
 * type with the line and clear nothing. The loop spans 80 of the 100 viewBox
 * units, so at 1.18x it reaches 94.4 — still inside its own box, which is why
 * nothing beside it in the hero row has to move.
 */
function PenCircle({ size, points }: { size: number; points: number }) {
  return (
    <div
      style={{
        position: "relative",
        flex: "0 0 auto",
        width: size,
        height: size * 0.78,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: "rotate(-5deg)",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 78"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, overflow: "visible", transform: "scale(1.18)" }}
      >
        <g fill="none" stroke="var(--faction-snide-pink)" strokeLinecap="round">
          <path
            d="M14 40 C13 19 38 7 56 9 C79 11 91 24 89 40 C87 59 61 71 43 68 C23 65 12 55 13 37 C13 28 18 19 27 13"
            strokeWidth="2.6"
          />
          <path d="M27 12 C16 18 11 28 11 39" strokeWidth="1.8" opacity="0.75" />
        </g>
      </svg>
      <span
        style={{
          position: "relative",
          fontFamily: IMPACT,
          fontSize: "var(--text-heading)",
          lineHeight: 0.9,
          color: INK,
          letterSpacing: "-0.01em",
        }}
      >
        {points}
      </span>
      <span
        style={{
          position: "relative",
          fontFamily: IMPACT,
          // eslint-disable-next-line local/no-raw-style-values -- ornament: pen-circle caption, sized to the drawn loop rather than the label ramp (§4a).
          fontSize: 10,
          letterSpacing: "0.22em",
          // eslint-disable-next-line local/no-raw-style-values -- ornament: the caption's lead inside the drawn loop; a 4px rung pushes it off the numeral.
          marginTop: 2,
          color: "var(--faction-snide-note-pink-ink)",
        }}
      >
        {i18n.t("feed:taskCard.pointsUnit")}
      </span>
    </div>
  );
}

export default function SnideTaskCard({
  task,
  basePoints,
  multiplier,
  inProgressCount,
  onSignup,
}: CardProps) {
  const formFactor = useFormFactor();
  const size = SIZES[formFactor];
  const cta = taskCardSignupCta(task, onSignup);
  const showMultiplier = !isNeutralMultiplier(multiplier);

  return (
    <div
      data-form-factor={formFactor}
      style={{ width: size.cardWidth, maxWidth: "100%", boxSizing: "border-box" }}
    >
      <article
        style={{
          position: "relative",
          boxSizing: "border-box",
          width: "100%",
          color: INK,
          background: PAPER,
          backgroundImage:
            "repeating-linear-gradient(0deg, var(--faction-snide-note-grain) 0 1px, transparent 1px 3px)",
          boxShadow: "var(--faction-snide-note-shadow)",
          transform: "rotate(-0.4deg)",
        }}
      >
        {/* The header bar, on the kit's shared anatomy (#2029) — the mark hard
            left, the wordmark centred on the band.

            The broken acid rule that used to fill the bar's right end is gone
            with the centring: it was a flex filler taking the width #1124's
            retired ordinal left behind, and that width is exactly where the
            centred wordmark now sits. The clipping keeps its acid elsewhere —
            the CTA, the knockout cuts, the pen circle. */}
        <CardMasthead
          slug="snide"
          style={{
            background: "var(--faction-snide-note-bar)",
            color: "var(--faction-snide-note-bar-ink)",
          }}
        >
          {/* eslint-disable-next-line local/no-raw-style-values -- ornament: cut-out wordmark; Anton at a label-ramp size stops reading as a masthead. */}
          <span style={{ fontFamily: IMPACT, fontSize: 22, letterSpacing: "0.06em", lineHeight: 1, color: "var(--faction-snide-acid)" }}>
            {factionName("snide")}
          </span>
        </CardMasthead>

        <div style={{ position: "relative", zIndex: 2, padding: size.bodyPad }}>
          {/* Everything but the CTA reads the full call — a card-sized target
              that stays valid HTML (no <button> nested in an <a>). */}
          <Link to={`/tasks/${task.id}`} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-md)", padding: "var(--space-lg) 0 var(--space-md)" }}>
              <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <span
                  style={{
                    fontFamily: TYPE,
                    fontSize: "var(--text-md)",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: MUTED,
                  }}
                >
                  {i18n.t("feed:taskCard.levelCaption")}
                </span>
                <span style={{ fontFamily: IMPACT, fontSize: size.levelSize, lineHeight: 0.82, transform: "rotate(-1.5deg)" }}>
                  {task.level_required}
                </span>
              </div>

              <CensorRule style={{ flex: 1, minWidth: 0, marginBottom: "var(--space-sm)" }} />

              {/* The faction modifier — hidden at ×1.00, so invisible under
                  era_1's neutralized modifiers and automatic the day one moves
                  (ADR-0055). The design set it in PAPER on the hot pink (3.10:1);
                  it takes the near-black ink instead. */}
              {showMultiplier && (
                <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-xs)" }}>
                  <span
                    style={{
                      fontFamily: BLACK,
                      fontSize: "var(--text-md)",
                      color: "var(--faction-snide-note-cta-ink)",
                      background: "var(--faction-snide-pink)",
                      padding: "var(--space-xs) var(--space-sm)",
                      letterSpacing: "0.04em",
                      transform: "rotate(-2deg)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {i18n.t("feed:taskCard.multiplier", { value: multiplier.toFixed(2) })}
                  </span>
                  <span
                    style={{
                      fontFamily: TYPE,
                      fontSize: "var(--text-md)",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: MUTED,
                    }}
                  >
                    {i18n.t("feed:taskCard.modifierCaption")}
                  </span>
                </div>
              )}

              <PenCircle size={size.stamp} points={basePoints} />
            </div>

            {/* The headline, cut from four sources word by word.
                IT MUST STAY ONE READABLE STRING. The design lays the cuts out as
                a wrapping FLEX row and spaces them with `gap`, which is a purely
                visual space: a flex container discards whitespace-only children,
                so the heading's text content came out as
                "Namethethingeveryone…" with nothing between the words. Ordinary
                inline flow instead — the cuts are `inline-block`, separated by
                REAL space characters, and they still wrap, still sit on a shared
                baseline and still carry their own grounds. */}
            <h2
              style={{
                fontSize: size.titleSize,
                fontWeight: 400,
                lineHeight: 1.35,
                margin: "0 0 var(--space-md)",
              }}
            >
              {task.title.split(/\s+/).map((word, index) => (
                <span key={`${index}-${word}`}>
                  {index > 0 ? " " : ""}
                  <span
                    style={{
                      display: "inline-block",
                      maxWidth: "100%",
                      overflowWrap: "anywhere",
                      ...CUTS[(index + task.id) % CUTS.length],
                    }}
                  >
                    {word}
                  </span>
                </span>
              ))}
            </h2>

            {task.description && (
              <p
                className="card-description"
                style={{ fontFamily: TYPE, lineHeight: 1.55, color: MUTED, margin: "0 0 var(--space-md)" }}
              >
                {task.description}
              </p>
            )}

            <CensorRule style={{ margin: "0 0 var(--space-md)" }} />

            {inProgressCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                <svg
                  width={17}
                  height={17}
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  style={{ display: "block", flex: "0 0 auto", transform: "rotate(-6deg)" }}
                >
                  <g fill="none" stroke="var(--faction-snide-pink)" strokeWidth="2.6" strokeLinecap="round">
                    <path d="M3.5 3 C8 7.5 12 12 16.5 17.5" />
                    <path d="M16.5 3.5 C12.5 7 8 12 3 16.5" />
                  </g>
                </svg>
                <span style={{ fontFamily: TYPE, fontSize: "var(--text-xl)", letterSpacing: "0.06em", color: MUTED }}>
                  {i18n.t("feed:taskCard.inProgress", { count: inProgressCount })}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* The acid bar was full-bleed — the clipping's bottom edge. #2030
            shrinks it to a pasted-on block with clearance under it; no rule
            above, because the censor strip already rules the section off.

            SPRAYED, NOT PRINTED (#2035). v2 inked near-black type onto an acid
            ground; the stencil is the flip — the letters are the paint, glowing
            off a black that is the masthead's own band token, so the clipping's
            two blacks bracket the card. Contrast goes UP, not down: acid on
            `-note-bar` is 15.6:1 by day and higher by night, against 15.55:1
            for the pairing it replaces. Nothing lands ON the label; a speckle
            layer over a control is ornament eating a control.

            THE RING IS LOAD-BEARING, not decoration. `--faction-snide-note-*`
            FLIPS, so at night the stock is #14110b and this ground is #080706:
            without an OPAQUE edge the button would be a black rectangle on a
            black card. `-acid-deep` is theme-invariant and reads on both — a
            translucent acid would composite to almost nothing over the dark.
            The ring is a `box-shadow` rather than a `border` so it cannot
            change the box the 44px floor was solved against. */}
        {cta && (
          <div style={{ ...CARD_CTA_ROW, position: "relative", zIndex: 2 }}>
            <button
              type="button"
              onClick={cta.onPress}
              aria-disabled={cta.denied || undefined}
              style={{
                ...CARD_CTA,
                cursor: cta.denied ? "not-allowed" : "pointer",
                background: "var(--faction-snide-note-bar)",
                color: "var(--faction-snide-acid)",
                fontFamily: MARKER,
                fontSize: "var(--text-content)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "var(--space-sm) var(--space-2xl)",
                border: "none",
                // The halo: one tight pass in the acid itself, two soft ones in
                // the faction's 16% tint, which is the same pigment already
                // declared as a wash. The design's own ramp of five bespoke
                // alphas is three tokenless colours; this is the shape of it.
                textShadow:
                  "0 0 1px var(--faction-snide-acid), 0 0 10px var(--faction-snide-light), 0 0 22px var(--faction-snide-light)",
                boxShadow:
                  "0 0 0 2px var(--faction-snide-acid-deep), inset 0 0 18px var(--faction-snide-light)",
                transform: "rotate(-1.6deg)",
              }}
            >
              {cta.label}
            </button>
          </div>
        )}
      </article>
    </div>
  );
}
