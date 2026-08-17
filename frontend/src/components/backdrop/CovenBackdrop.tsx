/**
 * Cozy Coven full-page backdrop (#1209) — the candlelight wash, drifting behind
 * a Coven player's profile AND behind the Coven faction page (#2039: both of
 * `useFactionBackdrop`'s callers reach it, and both stack `<TaskCard>` on it, so
 * this is a ground a card sits on). Fixed at z-index 0; `.coven-backdrop` in index.css
 * owns the ground, the four blooms and the light/dark flip, and shares all of it
 * with `.coven-candle-backdrop` (the detail pages' column wash).
 *
 * It was a lo-fi pastel "desktop" — dotted grid, corner glow, vignette — until
 * the `coven.exe` sweep. The markup is unchanged: the metaphor lived entirely in
 * the stylesheet, which is the point of keeping it there.
 */
export default function CovenBackdrop() {
  return <div className="coven-backdrop" aria-hidden="true" />
}
