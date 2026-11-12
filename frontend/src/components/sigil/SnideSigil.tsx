/**
 * SnideSigil — the A, brushed and broken out (Sigil Studies v2). Four fills
 * (holds at 15px; strokes smudged), cantered -22° so the A breaks out of the
 * ring: the `-8 -8 116 116` viewBox and `overflow: visible` are the drawing,
 * not slack — normalising would crop the legs. One ink, `--faction-snide-acid`.
 */

/** Verbatim from `.design-sync/sigils/Sigil-Studies-v2.dc.html`: annulus, legs,
 *  crossbar. `evenodd` is load-bearing on the annulus. */
const RING =
  "M66 25L69.5 27L72.5 30L75 33L77.5 36.5L79.5 40L81 44L81.5 48L82 52.5L81.5 56.5L80 61L78.5 65L76 68.5L73 71.5L69.5 74.5L66 76.5L62 78L58 79L54 79.5L49.5 79.5L45.5 79L41.5 78L38 77L34 75L31 73L28 70L25.5 67L23.5 63.5L22 59.5L21 55.5L21 51.5L21.5 47.5L22.5 44L24 40.5L25.5 37L28 34L30.5 31L33 28.5L36 26.5L39.5 24.5L43 23L46.5 22L50.5 21.5L54.5 21.5L58.5 22L62.5 23ZM66 13.5L61 12L55.5 11L50 11L45 11.5L40 13L35 14.5L30.5 17L26 20L22 23.5L19 27.5L16 32L14 36.5L13 42L12.5 47L12.5 52L13.5 57L15.5 62L17.5 66.5L20 70.5L23.5 74.5L27 78L31 80.5L35 83L40 85L44.5 86L49.5 86.5L54.5 86.5L59.5 85.5L64 84L68.5 82L73 79L77 76L80.5 72.5L83.5 68L86.5 63.5L88.5 58.5L90 53.5L90.5 48L90 42L89 36.5L87 31.5L84 26.5L80 22L76 18.5L71 15.5Z";
const LEG_LEFT =
  "M21.5 93L24.5 88L27 82.5L29.5 77L31.5 71.5L33.5 66L36 60.5L38 55L40 49.5L42 44L44 38.5L46 33L48 27.5L50 22L52.5 16.5L54.5 11L56.5 5.5L44.5 1.5L43 7L41.5 13L39.5 18.5L38 24L36.5 30L35 35.5L33 41L31.5 47L30 52.5L28.5 58L27 64L25 69.5L24 75.5L22.5 81L21 87L20.5 93Z";
const LEG_RIGHT =
  "M43.5 5.5L45.5 11L48 16.5L50 22L52 27.5L54 33L56 38.5L58 44L60 49.5L62 55L64.5 60.5L66.5 66L68.5 71.5L71 77L73 82.5L75.5 88L78.5 93L79.5 93L79 87L77.5 81L76 75.5L74.5 69.5L73 64L71.5 58.5L70 52.5L68.5 47L67 41L65 35.5L63.5 30L62 24L60.5 18.5L58.5 13L57 7L55.5 1.5Z";
const CROSSBAR =
  "M8.5 67.5L11.5 68L15 68L18 68L21.5 67.5L24.5 67.5L27.5 67.5L31 67.5L34 67L37.5 67L40.5 67L43.5 67L47 67L50 67L53 67L56.5 67L59.5 67L62.5 67L66 67L69 67.5L72.5 67.5L75.5 67.5L78.5 67.5L82 68L85 68L88.5 68L91.5 67.5L92.5 63.5L89 62.5L86 61.5L82.5 61L79.5 60.5L76 60L73 59.5L69.5 59L66.5 58.5L63 58L60 58L56.5 58L53.5 57.5L50 57.5L46.5 57.5L43.5 58L40 58L37 58L33.5 58.5L30.5 59L27 59.5L24 60L20.5 60.5L17.5 61L14 61.5L11 62.5L7.5 63.5Z";

const STROKES = [RING, LEG_LEFT, LEG_RIGHT, CROSSBAR];

export function SnideSigil({
  size = 22,
  color = "var(--faction-snide-acid)",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-8 -8 116 116"
      fill={color}
      aria-hidden="true"
      style={{ display: "block", overflow: "visible", flexShrink: 0 }}
    >
      {/* The cant stays on a <g> so the path data is the design's, unmodified. */}
      <g transform="rotate(-22 50 50)">
        {STROKES.map((d) => (
          <path key={d.slice(0, 12)} fillRule="evenodd" d={d} />
        ))}
      </g>
    </svg>
  );
}
