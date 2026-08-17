/**
 * SnideSigil — THE A, BRUSHED AND BROKEN OUT. S.N.I.D.E.'s only mark
 * (Sigil Studies v2).
 *
 * It replaces the tidy circled-A that had been the mark since #659 — a stroked
 * circle with a stroked A inside it, drawn on a 48-unit square, every line the
 * same 3.5 units wide. That is a pictogram of anarchy rather than the act: it
 * was drawn WITH a compass, and it stayed politely inside its own ring.
 *
 * This one is painted. Four filled shapes, not four strokes: an annulus whose
 * band varies in width the way a loaded brush does, two legs that taper from a
 * heavy start to a dry finish, and a crossbar that thins across the middle. The
 * legs run from y 1.5 to y 93 in a 100-unit drawing and the whole figure is
 * cantered at -22°, so the A BREAKS OUT of the circle at four points — which is
 * why the viewBox is `-8 -8 116 116` and not `0 0 100 100`. That bleed is the
 * drawing, not slack: normalising the box would crop the legs at exactly the
 * places the mark is making its point. `overflow: visible` is set for the same
 * reason.
 *
 * WHY IT HOLDS AT 15px. Every part is a FILL. The old mark's 3.5-unit strokes
 * on a 48-unit box rendered at 1.09 device pixels at 15px and antialiased into
 * a grey ring with a smudge in it; a filled wedge has no minimum and just gets
 * smaller. The annulus is the silhouette that carries recognition, and the
 * cant is what still tells the two marks apart when the legs go sub-pixel.
 *
 * ONE INK, WHOLESALE. All four shapes take the same `color`, defaulting to
 * `--faction-snide-acid` — the token the design's own cell names, and the mark's
 * ink since #659. Never a hex.
 */

/** Ported verbatim from `.design-sync/sigils/Sigil-Studies-v2.dc.html`, the
 *  S.N.I.D.E. "New" band: the annulus, the left leg, the right leg, the
 *  crossbar. Each is `fill-rule: evenodd` — load-bearing on the first, which is
 *  an outer and an inner contour and fills solid without it. */
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
      {/* The design's cant. It is on a <g> rather than baked into the path data
          because the four shapes are drawn upright and turned together — pulling
          the rotation out would mean re-deriving 130 points and losing the
          ability to say this is the design's geometry unmodified. */}
      <g transform="rotate(-22 50 50)">
        {STROKES.map((d) => (
          <path key={d.slice(0, 12)} fillRule="evenodd" d={d} />
        ))}
      </g>
    </svg>
  );
}
