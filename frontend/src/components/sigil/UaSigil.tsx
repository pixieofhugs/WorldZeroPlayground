// BY PATH, NOT THROUGH THE BARREL (#2779). `Sidebar` imports `FactionSigil`
// eagerly on every page and it adapts this component, so this line is the ONE
// import of `components/factionMarks` on the blocking path. Through the barrel
// it also pulled `Lotus` and `PointsRoundel` — 2.0 KB gzipped that only lazy UA
// and Everymen archetypes ever draw. The barrel is right for those seven
// consumers and stays; the eager one takes the path.
import Enso from "../factionMarks/Enso";

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
 * vendored ensō — 284 hand-drawn strokes and a turbulence filter — at
 * every size, from the 13px inline mark to the 420px backdrop.
 *
 * Delivery is {@link Enso}'s: a static asset under `public/` painted through a
 * CSS mask, so the file supplies only the alpha and the ink comes from a token.
 * The asset stays out of the JS bundle, is cached after first paint, and is
 * non-blocking — the page renders whether or not the mask has arrived. Colour
 * is unchanged from the arcs: `--faction-ua-glow`, which carries both themes,
 * so the mark follows the `[data-theme="dark"]` cascade with no ternary. The
 * praxis handoff overrides it with `--faction-ua-card-enso` — that surface runs
 * the warm `--faction-ua-card-*` block on purpose (see `UaScoreStamp`) — which
 * is a TOKEN swap, not a theme branch, so the cascade rule still holds.
 *
 * The ensō is reserved for the SCORE and the FACTION MARK. It is never a
 * container border — a card outlined in an ensō is the mark spent as decoration.
 *
 * The drawing is square. Callers that pass a non-square width/height get the
 * circle centred and letterboxed by `mask-size: contain` + `mask-position:
 * center`, which is the correct read and matches what the old
 * `preserveAspectRatio` did. (The example that used to stand here was the
 * mobile praxis card's 16x19 slot; ADR-0067 folded that surface into the one
 * responsive card, so no caller is non-square today.)
 */
export function UaSigil({
  width,
  height,
  color = "var(--faction-ua-glow)",
}: {
  width: number;
  height: number;
  /** The ring's ink. A token, always — the default carries both themes. */
  color?: string;
}) {
  return <Enso size={width} height={height} color={color} style={{ flexShrink: 0 }} />;
}
