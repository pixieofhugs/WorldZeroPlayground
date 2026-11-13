import type { SigilVariantProps } from "./FactionSigil";

/**
 * WowSigil — the googly crown, in plum (Sigil Studies v2). One `evenodd` path:
 * the eyes are cut from the ground, so they read at 15px.
 *
 * `--faction-wow-plum-surface`, NOT `--faction-wow`: same value in light since
 * #2068, but the spine lifts in dark while a struck mark must stay invariant.
 * Decorative; the mounting surface names the faction.
 */

/** Verbatim from `.design-sync/sigils/Sigil-Studies-v2.dc.html`: crown, then each
 *  eye white and pupil. Without `evenodd` it's a plum blob. */
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
