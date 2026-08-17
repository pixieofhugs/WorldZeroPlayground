import type { SigilVariantProps } from "./FactionSigil";

/**
 * WowSigil — THE GOOGLY CROWN, in plum. Warriors of Whimsy's only mark
 * (Sigil Studies v2).
 *
 * It replaces the gilt crest — a beaded rope ring, a Pig-Latin motto band on a
 * circular textPath, and a unicorn with a noodle sword on a cream field. That
 * drawing was magnificent at 132px and unreadable below about 40: its own
 * `MOTTO_FLOOR_PX = 56` was already an admission that a third of the mark had
 * to be dropped before the badge sizes, and at the 15px cell the design calls
 * "the size that decides it" the whole coin antialiased into a gold smudge.
 *
 * The redraw keeps the faction's conceit and spends it on silhouette instead of
 * detail: a three-peaked crown with two googly eyes rolling in it. Nothing is
 * stroked, nothing is layered, nothing is lettered — one path, `fill-rule:
 * evenodd`, four subpaths. The crown fills; each eye's white subtracts a hole;
 * each pupil adds itself back inside that hole. So the eyes are cut from the
 * GROUND the crown sits on, which is why they still read as eyes at 15px where
 * a painted-on white disc would have needed a second ink and lost to
 * antialiasing.
 *
 * PLUM, NOT GOLD, and it is the design's word. `--faction-wow-plum-surface` is
 * the token that word already names in this repo — declared once in `:root` and
 * theme-INVARIANT, which is right for a struck mark: the crest was invariant for
 * the same reason and the chrome that FRAMES the mark is what carries the
 * cascade. When this was written WOW's spine hue `--faction-wow` was a gold
 * (`#e0a800`) and #1932 had measured what happens when that gold is asked to be
 * a figure rather than a fill — 1.96:1 on the page — so the design choosing plum
 * here was the same arithmetic arriving from the drawing side.
 *
 * SINCE #2068 THE SPINE IS THE SAME PLUM, AND THIS STILL IS NOT `--faction-wow`.
 * The hue is `#7a4a9e` in light — byte-identical to `-plum-surface` — and
 * `#a875c9` in dark, because a spine hue lifts for the dark page. A struck mark
 * does not: the invariant token is the whole reason the crown reads the same on
 * every one of its eight mounts, light or dark. Two tokens, one value in one
 * theme, and the one that moves is not this one.
 *
 * The mark is drawn ONCE here and reused by every WOW surface that carries it
 * (masthead, avatar, decree task card, faction hero, backdrop watermark, mobile
 * header, duel seal) — there is no image pipeline in this repo, so the mark is
 * inline SVG.
 *
 * A11Y. Decorative, like every other faction sigil in the repo: the surface that
 * mounts the mark is what names the faction.
 */

/** Ported verbatim from `.design-sync/sigils/Sigil-Studies-v2.dc.html`, the WOW
 *  "New" band. Subpaths in order: crown, left eye white, left pupil, right eye
 *  white, right pupil. `fill-rule: evenodd` is load-bearing — without it the
 *  eyes fill solid and the mark is a plum blob. */
const CROWN =
  "M12 88L12 24L33 46L50 12L67 46L88 24L88 88ZM47 62L46.5 65L45.5 67.5L44 70L42 72L39.5 73L36.5 74L33.5 74L30.5 73L28 72L26 70L24.5 67.5L23.5 65L23 62L23.5 59L24.5 56.5L26 54L28 52L30.5 51L33.5 50L36.5 50L39.5 51L42 52L44 54L45.5 56.5L46.5 59L47 62ZM42.5 65L42.5 66L42 67.5L41 68.5L40.5 69L39.5 69.5L38 70L37 70L35.5 69.5L34.5 69L34 68.5L33 67.5L32.5 66L32.5 65L32.5 64L33 62.5L34 61.5L34.5 61L35.5 60.5L37 60L38 60L39.5 60.5L40.5 61L41 61.5L42 62.5L42.5 64L42.5 65ZM78 58L77.5 61.5L76.5 64.5L74.5 67.5L72 69.5L69 71L65.5 72L62.5 72L59 71L56 69.5L53.5 67.5L51.5 64.5L50.5 61.5L50 58L50.5 54.5L51.5 51.5L53.5 48.5L56 46.5L59 45L62.5 44L65.5 44L69 45L72 46.5L74.5 48.5L76.5 51.5L77.5 54.5L78 58ZM66 54L66 55.5L65.5 57L64.5 58L63.5 59L62 59.5L60.5 60L59.5 60L58 59.5L56.5 59L55.5 58L54.5 57L54 55.5L54 54L54 52.5L54.5 51L55.5 50L56.5 49L58 48.5L59.5 48L60.5 48L62 48.5L63.5 49L64.5 50L65.5 51L66 52.5L66 54Z";

export function WowSigil({
  size = 22,
  color = "var(--faction-wow-plum-surface)",
}: SigilVariantProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill={color}
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path fillRule="evenodd" d={CROWN} />
    </svg>
  );
}

export default WowSigil;
