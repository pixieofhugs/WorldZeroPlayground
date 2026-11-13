/**
 * CovenSigil — the witch hat, Cozy Coven's only identity mark (Sigil Studies v2,
 * #2726). Even-odd discs read as light through the hat, which carries it to
 * 15px. The old sparkle is now the ornament `Spark` in `covenSlip.tsx`.
 */

/** Verbatim from `.design-sync/sigils/Sigil-Studies-v2.dc.html`. `evenodd` is
 *  load-bearing: without it the discs merge into a blob over the brim. */
const HAT =
  "M4 78C14 66 32 62 50 62C68 62 86 66 96 78C86 88 68 92 50 92C32 92 14 88 4 78ZM34 68C36 42 48 22 74 4C68 24 64 46 63 68ZM48.5 50.5L48 53L47 55L45.5 56.5L43.5 57.5L41 58L38.5 57.5L36.5 56.5L35 55L34 53L33.5 50.5L34 48L35 46L36.5 44.5L38.5 43.5L41 43L43.5 43.5L45.5 44.5L47 46L48 48L48.5 50.5ZM57.5 57L57 59.5L56 61.5L54.5 63L52.5 64L50 64.5L47.5 64L45.5 63L44 61.5L43 59.5L42.5 57L43 54.5L44 52.5L45.5 51L47.5 50L50 49.5L52.5 50L54.5 51L56 52.5L57 54.5L57.5 57ZM54 67.5L53.5 70L52.5 72L51 74L49 75L46.5 75L44.5 75L42 74L40.5 72L39.5 70L39 67.5L39.5 65.5L40.5 63.5L42 61.5L44.5 60.5L46.5 60L49 60.5L51 61.5L52.5 63.5L53.5 65.5L54 67.5ZM43 67.5L42.5 70L41.5 72L40 74L37.5 75L35.5 75L33 75L31 74L29.5 72L28.5 70L28 67.5L28.5 65.5L29.5 63.5L31 61.5L33 60.5L35.5 60L37.5 60.5L40 61.5L41.5 63.5L42.5 65.5L43 67.5ZM39.5 57L39 59.5L38 61.5L36.5 63L34.5 64L32 64.5L29.5 64L27.5 63L26 61.5L25 59.5L24.5 57L25 54.5L26 52.5L27.5 51L29.5 50L32 49.5L34.5 50L36.5 51L38 52.5L39 54.5L39.5 57ZM45.5 60L45.5 61.5L44.5 62.5L43.5 63.5L42.5 64.5L41 64.5L39.5 64.5L38.5 63.5L37.5 62.5L36.5 61.5L36.5 60L36.5 58.5L37.5 57.5L38.5 56.5L39.5 55.5L41 55.5L42.5 55.5L43.5 56.5L44.5 57.5L45.5 58.5L45.5 60Z";

export function CovenSigil({
  size = 22,
  color = "var(--faction-coven)",
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
      <path fillRule="evenodd" d={HAT} />
    </svg>
  );
}
