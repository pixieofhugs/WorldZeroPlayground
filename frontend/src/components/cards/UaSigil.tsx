import i18n from "../../i18n";
import { Enso } from "../factionMarks";

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
 * Assembled once here and dropped into every UA surface that carries the mark
 * (faction hero, task card, avatar badge, edit-praxis masthead) rather than
 * re-drawn per file. All colours via tokens (never hardcode hex — CLAUDE.md),
 * and every token below has both themes, so the mark follows the
 * `[data-theme="dark"]` cascade with no ternary.
 */

/**
 * Ensō — UA's sigil (#849, brief §4; consolidated by #908).
 *
 * ONE ENSŌ. This used to draw its own two-arc approximation — a heavy sweep
 * plus a light return, rotated -7° — as a stand-in that avoided shipping the
 * kit's 705 KB brush study site-wide. That left UA with two different circles,
 * the good one on a single surface. Owner ruling 2026-07-21: "No two ensō's on
 * purpose." The approximation is deleted; every UA surface now renders the
 * vendored `enso.svg` — 284 hand-drawn strokes and a turbulence filter — at
 * every size, from the 13px inline mark to the 420px backdrop.
 *
 * Delivery is {@link Enso}'s: a static asset under `public/` painted through a
 * CSS mask, so the file supplies only the alpha and the ink comes from a token.
 * The asset stays out of the JS bundle, is cached after first paint, and is
 * non-blocking — the page renders whether or not the mask has arrived. Colour
 * is unchanged from the arcs: `--faction-ua-glow`, which carries both themes,
 * so the mark follows the `[data-theme="dark"]` cascade with no ternary.
 *
 * The ensō is reserved for the SCORE and the FACTION MARK. It is never a
 * container border — a card outlined in an ensō is the mark spent as decoration.
 *
 * The drawing is square. Callers that pass a non-square width/height (e.g. the
 * mobile praxis card's 16x19) get the circle centred and letterboxed by
 * `mask-size: contain` + `mask-position: center`, which is the correct read and
 * matches what the old `preserveAspectRatio` did.
 */
export function UaSigil({ width, height }: { width: number; height: number }) {
  return (
    <Enso
      size={width}
      height={height}
      color="var(--faction-ua-glow)"
      style={{ flexShrink: 0 }}
    />
  );
}

/**
 * The motto cartouche — a solid sienna ribbon with notched ends.
 *
 * Kept as-is structurally; only repointed off the legacy gilt-salon family onto
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
