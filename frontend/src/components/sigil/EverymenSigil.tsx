/**
 * EverymenSigil — TWO COGS IN MESH, the faction's only mark (Sigil Studies v2).
 *
 * It replaces the single ten-tooth gear that had been the mark since #659. That
 * one was one wheel turning alone, which is the wrong sentence for a union: this
 * is two wheels of different sizes, teeth interlocked, neither of which turns
 * without the other. The big cog sits lower-left, the small one upper-right, and
 * the two hubs are punched THROUGH — `fill-rule: evenodd`, so the page shows
 * through the bores rather than a cream disc filling them. That is the design's
 * drawing and it is why the mark survives at 15px: a hole reads at any size, a
 * second colour inside an 11-unit circle does not.
 *
 * ONE INK, WHOLESALE. Everything is one `color`, defaulting to `--everymen-red`
 * — never a hex. The design paints `var(--everymen-red, var(--faction-everymen))`;
 * the fallback arm is an artifact of the design bundle's own kit copy (both
 * tokens exist here, and both hold the same value in each cascade), so the app
 * takes the primary name.
 *
 * The mark is drawn ONCE here and reused by every Everymen surface that carries
 * it (avatar badge, faction card, faction hero, task card, edit-praxis, the
 * field desk) — change it here and every surface follows.
 */

/** Ported verbatim from `.design-sync/sigils/Sigil-Studies-v2.dc.html`, the
 *  Everymen "New" band. One path, four subpaths: big cog, big bore, small cog,
 *  small bore — read by `fill-rule: evenodd`, which is what makes the bores
 *  holes. */
const COGS =
  "M57.5 59.5L56.5 62L55 65L53.5 67L59.5 75.5L59.5 75.5L57 78L54.5 80L52 82L45 74L42.5 75L39.5 75.5L36.5 76L33.5 86L33.5 86L30.5 85.5L27.5 85L24 84L26 73.5L23.5 72L21 70.5L19 68L9.5 72L9.5 72L8 69.5L6.5 66.5L5.5 63.5L14.5 58.5L14 55.5L14 52.5L14.5 49.5L5.5 44.5L5.5 44.5L6.5 41.5L8 38.5L9.5 36L19 40L21 37.5L23.5 36L26 34.5L24 24L24 24L27.5 23L30.5 22.5L33.5 22L36.5 32L39.5 32.5L42.5 33L45 34L52 26L52 26L54.5 28L57 30L59.5 32.5L53.5 41L55 43L56.5 46L57.5 48.5L67.5 49L67.5 49L68 52.5L68 55.5L67.5 59ZM46 54L45.5 51.5L45 49.5L43.5 47.5L41.5 46L39.5 44.5L37 44L35 44L32.5 44.5L30.5 46L28.5 47.5L27 49.5L26.5 51.5L26 54L26.5 56.5L27 58.5L28.5 60.5L30.5 62L32.5 63.5L35 64L37 64L39.5 63.5L41.5 62L43.5 60.5L45 58.5L45.5 56.5L46 54ZM83.5 48L82 50L80 52L77.5 53L78.5 61.5L78.5 61.5L76 62.5L73 63L70 63L68 55L65.5 54.5L63 53.5L60.5 52L54 57L54 57L52 55L50 53L48.5 50.5L54.5 44.5L53.5 42L53 39.5L53 37L45.5 33.5L45.5 33.5L46 31L47 28L48.5 25.5L56.5 28L58 26L60 24L62.5 23L61.5 14.5L61.5 14.5L64 13.5L67 13L70 13L72 21L74.5 21.5L77 22.5L79.5 24L86 19L86 19L88 21L90 23L91.5 25.5L85.5 31.5L86.5 34L87 36.5L87 39L94.5 42.5L94.5 42.5L94 45L93 48L91.5 50.5ZM78 38L78 36L77 34.5L76 32.5L74.5 31.5L73 30.5L71 30L69 30L67 30.5L65.5 31.5L64 32.5L63 34.5L62 36L62 38L62 40L63 41.5L64 43.5L65.5 44.5L67 45.5L69 46L71 46L73 45.5L74.5 44.5L76 43.5L77 41.5L78 40L78 38Z";

export function EverymenSigil({
  size = 58,
  color = "var(--everymen-red)",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill={color}
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path fillRule="evenodd" d={COGS} />
    </svg>
  );
}
