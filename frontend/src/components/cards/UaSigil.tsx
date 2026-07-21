import i18n from "../../i18n";

/**
 * Shared UA (University of Asthmatics) identity atoms — the ensō sigil and the
 * motto ribbon.
 *
 * THE SALON IS DEAD (#788, #848). This file used to draw a gilt heraldic shield
 * with a rising sun and crossed brushes, in a palette that repeated itself in
 * dark mode on purpose. UA is now a quiet, sun-bleached practice with a real
 * dark mode, and its mark is the ensō — the hand-drawn circle, made in one
 * breath, left open.
 *
 * Drawn once here and dropped into every UA surface that carries the mark
 * (faction hero, task card, avatar badge, edit-praxis masthead) rather than
 * re-drawn per file. All colours via tokens (never hardcode hex — CLAUDE.md),
 * and every token below has both themes, so the mark follows the
 * `[data-theme="dark"]` cascade with no ternary.
 */

/**
 * Ensō — UA's sigil (#849, brief §4).
 *
 * Two arcs, not one path: a HEAVY sweep (stroke-width 22) that carries most of
 * the circle, then a LIGHT return (10, slightly transparent) that closes toward
 * the start and stops short. The gap sits at the lower left, ~7-8 o'clock, and
 * the whole figure is rotated -7° so it reads as a stroke of the hand rather
 * than as geometry. The taper is done with two stroke-widths instead of a
 * variable-width outline — the cheap approximation, and at sigil sizes
 * (16-150px) it is the one that survives.
 *
 * This is deliberately NOT the kit's `enso-detailed.svg`, which is 705 KB across
 * 284 hand-drawn paths. That asset does ship — as the praxis card's total mark,
 * where it is drawn at 118-138px and loaded as a masked file outside the JS
 * bundle (`components/factionMarks/Enso.tsx`, #839). Two ensōs on purpose:
 * different sizes, different consumers, different delivery. Do not consolidate.
 *
 * The ensō is reserved for the SCORE and the FACTION MARK. It is never a
 * container border — a card outlined in an ensō is the mark spent as decoration.
 *
 * The viewBox is square. Callers that pass a non-square width/height (a legacy
 * shield ratio, e.g. 72x86) get the circle centred and letterboxed by the
 * default `preserveAspectRatio`, which is the correct read.
 */
export function UaSigil({ width, height }: { width: number; height: number }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <g
        transform="rotate(-7 100 100)"
        stroke="var(--faction-ua-glow)"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M134 41.2 A68 68 0 1 1 66 158.8" strokeWidth="22" />
        <path d="M66 158.8 A68 68 0 0 1 66 41.2" strokeWidth="10" strokeOpacity="0.85" />
      </g>
    </svg>
  );
}

/**
 * The motto cartouche — a solid sienna ribbon with notched ends.
 *
 * Kept as-is structurally; only repointed off the legacy `--ua-*` family onto
 * the fill/on-fill pair, which carries both themes (4.59:1 light, 5.59:1 dark).
 * Whether the practice still wants a motto ribbon at all is an archetype
 * question and belongs to the surfaces that draw it, not to this file.
 */
export function MottoRibbon({
  fontSize = 11,
  padding = "5px 26px",
}: {
  fontSize?: number;
  padding?: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "fit-content",
        background: "var(--faction-ua)",
        color: "var(--faction-ua-on-fill)",
        fontFamily: 'var(--faction-ua-body-font)',
        fontSize,
        letterSpacing: "0.1em",
        padding,
        clipPath: "polygon(0 0,100% 0,96% 50%,100% 100%,0 100%,4% 50%)",
      }}
    >
      {i18n.t("feed:identity.ua.motto")}
    </div>
  );
}
