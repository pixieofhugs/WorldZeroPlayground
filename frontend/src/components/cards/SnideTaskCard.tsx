import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { CardProps } from "../TaskCard";
import i18n from "../../i18n";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";

/**
 * S.N.I.D.E. — THE RANSOM CLIPPING (task card v2, #1023).
 *
 * A photocopied clipping pinned to the wall half a degree off true: a near-black
 * header bar carrying the wordmark and a broken acid rule, a headline cut from
 * four different faces word by word, two words of the brief struck out by the
 * censor, the points circled in pink pen, censor rules ruling off each section,
 * and a full-bleed acid CTA. Anton, Archivo Black and Special Elite all appear
 * in the headline — a ransom note mixes faces by definition, and here that is
 * literal rather than decorative.
 *
 * This replaces the "Ransom Dispatch" (ADR-0055 / ADR-0056). Same reference,
 * rebuilt on the shared v2 information structure: masthead → LEVEL + POINTS hero
 * → title → brief → in-progress → CTA. The per-CHARACTER cut-out title is gone;
 * cutting per WORD is what a real ransom note does, and it is what survives a
 * forty-character title.
 *
 * ONE RESPONSIVE COMPONENT (ADR-0056): `useFormFactor` picks the size set, not a
 * different card. The dormant `mobileArchetypes/cards/SnideMobileTaskCard` stays
 * in the tree for the revert.
 *
 * All colour via `--faction-snide-note-*`, which unlike the faction's older
 * ink-dark families FLIPS under `[data-theme="dark"]`: the clipping is a sheet
 * of paper, so it goes photocopier-black at night rather than staying dark. Two
 * light-half inks are walked down for AA — see index.css.
 *
 * The design's fourth face, Permanent Marker, is deliberately absent. It had one
 * job there — setting the in-progress COUNT apart from its words — and the
 * uniform "{n} in progress" label (#1020) is a single indivisible string, so
 * recovering the effect would mean regex-slicing a localized sentence.
 */

const IMPACT = "var(--faction-snide-font-impact)"; /* Anton */
const BLACK = "var(--faction-snide-font-black)"; /* Archivo Black */
const TYPE = "var(--faction-snide-font-type)"; /* Special Elite */

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

/** The points, circled in pink pen. */
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
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
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
        {i18n.t("feed:taskCard.snide.pointsUnit")}
      </span>
    </div>
  );
}

/**
 * The brief, with two consecutive words struck out by the censor.
 *
 * A REAL CONTENT DECISION, not decoration: this blacks out part of the author's
 * task description on an ordinary browse surface. It is here because the
 * redaction IS the ransom-note metaphor and the brief is line-clamped anyway,
 * but it is the one thing on this card worth an owner's veto.
 *
 * NOTHING IS REMOVED. The struck word stays a real text node inside the
 * paragraph — `color: transparent` over an ink block hides it from the eye and
 * from nothing else. Screen readers announce the full sentence, find-in-page
 * finds it, and selecting the paragraph copies it intact. The alternative
 * (`aria-hidden` on a decorative block plus the word re-exposed somewhere else)
 * would be strictly worse: two sources of truth for one sentence.
 *
 * Which pair goes is seeded off the task's id, so a task always redacts the same
 * words instead of flickering between renders.
 */
function RedactedBrief({ brief, seed, style }: { brief: string; seed: number; style?: CSSProperties }) {
  const words = brief.split(/\s+/);
  // Never strike inside the last four, so a clamped brief cannot end in a bar.
  const from = words.length > 6 ? seed % (words.length - 4) : -1;
  return (
    <p className="card-description" style={{ fontFamily: TYPE, lineHeight: 1.55, color: MUTED, ...style }}>
      {words.map((word, index) => {
        const key = `${index}-${word}`;
        const trailing = index < words.length - 1 ? " " : "";
        if (from >= 0 && index >= from && index < from + 2) {
          return (
            <span key={key}>
              <span style={{ background: INK, color: "transparent", boxShadow: `0 0 0 2px ${INK}` }}>
                {word}
              </span>
              {trailing}
            </span>
          );
        }
        return <span key={key}>{word + trailing}</span>;
      })}
    </p>
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
        {/* The header bar — wordmark, a broken acid rule, the ordinal. */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: "var(--space-md)",
            padding: "var(--space-sm) var(--space-lg)",
            background: "var(--faction-snide-note-bar)",
            color: "var(--faction-snide-note-bar-ink)",
          }}
        >
          {/* eslint-disable-next-line local/no-raw-style-values -- ornament: cut-out wordmark; Anton at a label-ramp size stops reading as a masthead. */}
          <span style={{ fontFamily: IMPACT, fontSize: 22, letterSpacing: "0.06em", lineHeight: 1, color: "var(--faction-snide-acid)" }}>
            {i18n.t("feed:identity.snide.wordmark")}
          </span>
          <span
            aria-hidden="true"
            style={{
              flex: 1,
              height: 3,
              background:
                "repeating-linear-gradient(90deg, var(--faction-snide-acid) 0 6px, transparent 6px 10px)",
            }}
          />
          <span style={{ fontFamily: TYPE, fontSize: "var(--text-base)", letterSpacing: "0.12em" }}>
            {i18n.t("feed:taskCard.ordinal", { id: task.id })}
          </span>
        </div>

        <div style={{ position: "relative", zIndex: 2, padding: size.bodyPad }}>
          {/* Everything but the CTA reads the full call — a card-sized target
              that stays valid HTML (no <button> nested in an <a>). */}
          <Link to={`/tasks/${task.id}`} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-md)", padding: "var(--space-lg) 0 var(--space-md)" }}>
              <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <span
                  style={{
                    fontFamily: TYPE,
                    fontSize: "var(--text-sm)",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: MUTED,
                  }}
                >
                  {i18n.t("feed:taskCard.snide.levelCaption")}
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
                      fontSize: "var(--text-xs)",
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

            {/* The headline, cut from four sources word by word. It stays ONE
                heading for assistive tech — the cuts are spans inside it, so the
                accessible name is the unbroken title. */}
            <h3
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "baseline",
                gap: "var(--space-xs) var(--space-sm)",
                fontSize: size.titleSize,
                fontWeight: 400,
                lineHeight: 1.12,
                margin: "0 0 var(--space-md)",
              }}
            >
              {task.title.split(/\s+/).map((word, index) => (
                <span
                  key={`${index}-${word}`}
                  style={{
                    display: "inline-block",
                    maxWidth: "100%",
                    overflowWrap: "anywhere",
                    ...CUTS[(index + task.id) % CUTS.length],
                  }}
                >
                  {word}
                </span>
              ))}
            </h3>

            {task.description && (
              <RedactedBrief brief={task.description} seed={task.id} style={{ margin: "0 0 var(--space-md)" }} />
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

        {onSignup && (
          <button
            onClick={() => onSignup(task.id)}
            style={{
              position: "relative",
              zIndex: 2,
              cursor: "pointer",
              width: "100%",
              background: "var(--faction-snide-note-cta-bg)",
              color: "var(--faction-snide-note-cta-ink)",
              fontFamily: IMPACT,
              fontSize: "var(--text-xl)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              textAlign: "center",
              padding: "var(--space-md) 0",
              border: "none",
            }}
          >
            {i18n.t("feed:taskCard.snide.signup")}
          </button>
        )}
      </article>
    </div>
  );
}
