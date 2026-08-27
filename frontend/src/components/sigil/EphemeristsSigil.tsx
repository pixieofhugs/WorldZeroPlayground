/**
 * EphemeristsSigil — THE KITE, BRUSHED AND GILT. The Ephemerists' only mark
 * (Sigil Studies v2).
 *
 * The kite survives; the instrument does not. #1635's mark was a plumb-bob
 * drawn with a ruler — a stroked diamond, two crossed axes, five discs pinned
 * at its vertices, all on the design's 486x560 frame. This one is the same idea
 * held in a hand: six brushed FILLS on a square 100-unit box — a swept sail, a
 * horizon that thickens through the middle, a spar, a crossbar, a crescent, and
 * the point struck above them all.
 *
 * TWO THINGS THE OLD MARK OWNED AND THIS ONE DOES NOT.
 *
 * The 486:560 RATIO is gone. The old component took `size` as a HEIGHT and
 * handed back the design's non-square frame, which is what made the masthead's
 * 54x62 and 38x44 mounts one prop apart (#1634). Sigil Studies v2 draws the
 * mark square at all three of its sizes, so `size` is now both dimensions and
 * every mount gets a box about 15% wider than before. That is a layout change
 * at six mounts and it is the design's, not a simplification.
 *
 * The REDUCED CUT is gone with it. #1635 drew a different, sparser mark below
 * 20px because a 26-unit stroke on a 560-unit frame rendered at 0.6 device
 * pixels there. Nothing here is stroked — every part is a fill, and a fill has
 * no minimum width to fall under — so there is one drawing at every size, which
 * is what the design shows at 84, 34 and 15. The thinnest features (the
 * crossbar and the crescent, about 6 units) land near 0.9px at 15, which the
 * design accepted when it drew that cell.
 *
 * ONE INK, WHOLESALE, and the default is still `currentColor`. That is the
 * design's own `<svg fill="currentColor">`; the gold in the study is set by the
 * CELL around it, the way each of this mark's mounts sets its own
 * (`--faction-ephemerists-metal-gold` on the masthead and avatar, a brass on
 * the field desk, the band ink on the feed frame).
 *
 * THE DEFAULT IS A FALLBACK, NOT A CHOICE ANY MOUNT SHOULD MAKE (#2723). This
 * note used to argue the opposite — that inheriting the page's ink was what
 * held the mounts passing nothing off a theme-invariant gold — and it was
 * wrong in a way worth recording, because the next reader will be tempted to
 * restore it. `currentColor` on the NEUTRAL chrome is the page's own text
 * colour, so on the players race lanes, the roster's faction column and both of
 * the sidebar's sigil rows this kite drew in body ink: near-black in light,
 * WHITE in dark. It was the only one of the nine marks that did, which is why
 * the bug was reported against Ephemerists and nobody else; the other eight
 * default to an ink of their own.
 *
 * All four of those mounts pass `factionCssVar('ephemerists')` now — the spine
 * hue, #c9a24b light / #e6c877 dark, the same token the race lane's own bar
 * reads. NOT `--faction-ephemerists-metal-gold`: that measurement stands and is
 * still the reason no neutral surface may reach for it. It is theme-invariant
 * #dcbb5e and measures 1.69:1 on the page in light. A mount that wants gold
 * wants a cell that supplies its own ground first.
 */

const SAIL =
  "M19.1 30.8L19.6 29.7L20.2 28.7L20.8 27.8L21.4 27L22.1 26.2L22.8 25.4L23.5 24.8L24.2 24.1L25 23.6L25.8 23L26.6 22.6L27.4 22.2L28.2 21.8L29.1 21.5L29.9 21.2L30.8 21L31.6 20.8L32.5 20.7L33.4 20.7L34.2 20.7L35.1 20.7L35.9 20.8L36.8 21L37.6 21.2L38.4 21.4L39.3 21.7L40.1 22.1L40.9 22.6L41.7 23.1L42.4 23.6L43 24.1L43.6 24.6L44.1 25.2L44.6 25.8L45 26.4L45.3 27L45.6 27.7L45.9 28.3L46.1 29L46.3 29.8L46.4 30.5L46.4 31.4L46.5 32.2L46.4 33.1L46.3 34L46.2 34.9L46 35.9L45.7 36.9L45.3 38L44.9 39L44.4 40.1L43.9 41.2L43.2 42.4L42.5 43.6L41.8 44.7L41 45.9L40.2 47.1L39.3 48.2L38.4 49.3L37.5 50.5L36.5 51.6L35.5 52.7L34.5 53.8L33.4 54.9L32.3 56L31.2 57.1L30 58.2L28.9 59.2L27.7 60.3L26.5 61.3L25.2 62.3L24 63.4L22.8 64.4L21.5 65.4L20.2 66.3L18.9 67.3L17.6 68.3L16.4 69.2L15.1 70.2L13.8 71.1L16.2 75.5L17.7 74.8L19.3 74.1L20.8 73.4L22.3 72.6L23.8 71.9L25.3 71L26.7 70.2L28.2 69.3L29.6 68.4L31.1 67.4L32.5 66.5L33.9 65.5L35.3 64.5L36.6 63.4L38 62.3L39.3 61.3L40.6 60.1L41.8 59L43 57.8L44.2 56.6L45.4 55.4L46.5 54.1L47.6 52.9L48.6 51.6L49.6 50.3L50.6 48.9L51.5 47.5L52.4 46.1L53.3 44.6L54 43.1L54.7 41.6L55.2 40L55.7 38.5L56.1 37L56.4 35.4L56.5 33.9L56.6 32.4L56.6 30.9L56.5 29.4L56.3 27.9L55.9 26.4L55.5 25L54.9 23.6L54.3 22.3L53.5 21L52.7 19.7L51.7 18.6L50.6 17.5L49.5 16.5L48.3 15.5L47 14.7L45.6 13.9L44.1 13.2L42.6 12.7L41.2 12.2L39.7 11.9L38.2 11.6L36.8 11.5L35.3 11.5L33.9 11.5L32.4 11.7L31 12L29.6 12.3L28.3 12.7L27 13.2L25.7 13.8L24.5 14.5L23.3 15.3L22.1 16.1L21.1 17L20.1 18L19.1 19L18.2 20.1L17.4 21.3L16.7 22.5L16 23.7L15.4 25.1L15 26.4L14.6 27.8L14.3 29.2Z";
const HORIZON =
  "M9 75.5L11.1 75.8L13.1 76.1L15.2 76.3L17.2 76.5L19.3 76.7L21.3 76.8L23.4 76.9L25.4 77.1L27.5 77.2L29.5 77.3L31.6 77.4L33.6 77.4L35.7 77.5L37.7 77.5L39.8 77.6L41.8 77.6L43.9 77.7L45.9 77.7L47.9 77.7L50 77.7L52.1 77.7L54.1 77.7L56.2 77.7L58.2 77.6L60.3 77.6L62.3 77.5L64.4 77.5L66.4 77.4L68.4 77.4L70.5 77.3L72.6 77.2L74.6 77.1L76.6 76.9L78.7 76.8L80.8 76.7L82.8 76.5L84.9 76.3L86.9 76.1L89 75.8L91 75.5L91 71.1L89 70.8L86.9 70.5L84.9 70.3L82.8 70.1L80.8 69.9L78.7 69.8L76.6 69.7L74.6 69.5L72.6 69.4L70.5 69.3L68.4 69.2L66.4 69.2L64.4 69.1L62.3 69.1L60.3 69L58.2 69L56.2 68.9L54.1 68.9L52.1 68.9L50 68.9L47.9 68.9L45.9 68.9L43.9 68.9L41.8 69L39.8 69L37.7 69.1L35.7 69.1L33.6 69.2L31.6 69.2L29.5 69.3L27.5 69.4L25.4 69.5L23.4 69.7L21.3 69.8L19.3 69.9L17.2 70.1L15.2 70.3L13.1 70.5L11.1 70.8L9 71.1Z";
const SPAR =
  "M68 35L67.8 36.5L67.6 38L67.4 39.4L67.3 40.9L67.1 42.4L67 43.9L66.9 45.3L66.8 46.8L66.7 48.3L66.6 49.8L66.6 51.2L66.5 52.7L66.5 54.2L66.4 55.7L66.4 57.1L66.3 58.6L66.3 60.1L66.3 61.6L66.3 63L66.3 64.5L66.3 66L66.3 67.5L66.3 68.9L66.4 70.4L66.4 71.9L66.5 73.4L66.5 74.8L66.6 76.3L66.6 77.8L66.7 79.3L66.8 80.7L66.9 82.2L67 83.7L67.1 85.2L67.3 86.6L67.4 88.1L67.6 89.6L67.8 91.1L68 92.5L68.3 94L73.3 94L73.6 92.5L73.8 91.1L74 89.6L74.2 88.1L74.3 86.6L74.5 85.2L74.6 83.7L74.7 82.2L74.8 80.7L74.9 79.3L75 77.8L75 76.3L75.1 74.8L75.1 73.4L75.2 71.9L75.2 70.4L75.3 68.9L75.3 67.5L75.3 66L75.3 64.5L75.3 63L75.3 61.6L75.3 60.1L75.3 58.6L75.2 57.1L75.2 55.7L75.1 54.2L75.1 52.7L75 51.2L75 49.8L74.9 48.3L74.8 46.8L74.7 45.3L74.6 43.9L74.5 42.4L74.3 40.9L74.2 39.4L74 38L73.8 36.5L73.6 35Z";
const CROSSBAR =
  "M55 45.4L55.9 45.7L56.8 45.9L57.6 46.1L58.5 46.3L59.4 46.5L60.3 46.6L61.2 46.7L62.1 46.9L62.9 46.9L63.8 47L64.7 47.1L65.6 47.2L66.5 47.2L67.4 47.3L68.2 47.3L69.1 47.3L70 47.3L70.9 47.3L71.8 47.3L72.6 47.3L73.5 47.2L74.4 47.2L75.3 47.1L76.2 47L77.1 46.9L77.9 46.9L78.8 46.7L79.7 46.6L80.6 46.5L81.5 46.3L82.4 46.1L83.2 45.9L84.1 45.7L85 45.4L85 41.2L84.1 40.9L83.2 40.7L82.4 40.5L81.5 40.3L80.6 40.1L79.7 40L78.8 39.9L77.9 39.7L77.1 39.7L76.2 39.6L75.3 39.5L74.4 39.4L73.5 39.4L72.6 39.3L71.8 39.3L70.9 39.3L70 39.3L69.1 39.3L68.2 39.3L67.4 39.3L66.5 39.4L65.6 39.4L64.7 39.5L63.8 39.6L62.9 39.7L62.1 39.7L61.2 39.9L60.3 40L59.4 40.1L58.5 40.3L57.6 40.5L56.8 40.7L55.9 40.9L55 41.2Z";
const CRESCENT =
  "M56.5 18.9L56.6 19.7L56.8 20.5L57.1 21.4L57.5 22.2L57.9 22.9L58.4 23.6L59 24.3L59.7 24.9L60.3 25.4L61.1 25.9L61.8 26.4L62.6 26.8L63.4 27.2L64.3 27.5L65.1 27.7L66 27.9L66.9 28.1L67.8 28.2L68.7 28.3L69.6 28.3L70.4 28.3L71.3 28.2L72.2 28.1L73.1 27.9L74 27.7L74.8 27.5L75.7 27.2L76.5 26.8L77.3 26.4L78 25.9L78.8 25.4L79.4 24.9L80.1 24.3L80.7 23.6L81.2 22.9L81.6 22.2L82 21.4L82.3 20.5L82.5 19.7L82.6 18.9L79 17.7L78.6 18.2L78.3 18.6L78 18.9L77.6 19.2L77.2 19.5L76.9 19.7L76.5 19.9L76 20.2L75.6 20.4L75.1 20.6L74.6 20.7L74.1 20.9L73.6 21L73.1 21.1L72.5 21.3L71.9 21.3L71.3 21.4L70.7 21.5L70.1 21.5L69.5 21.5L69 21.5L68.4 21.5L67.8 21.4L67.2 21.3L66.6 21.3L66 21.1L65.5 21L65 20.9L64.5 20.7L64 20.6L63.5 20.4L63.1 20.2L62.6 19.9L62.2 19.7L61.9 19.5L61.5 19.2L61.1 18.9L60.8 18.6L60.5 18.2L60.1 17.7Z";
const POINT =
  "M73.9 6.8L73.7 8.2L73 9.5L72 10.6L70.6 11.3L69.1 11.7L67.5 11.7L66 11.3L64.6 10.6L63.6 9.5L62.9 8.2L62.7 6.8L62.9 5.4L63.6 4.1L64.6 3L66 2.3L67.5 1.9L69.1 1.9L70.6 2.3L72 3L73 4.1L73.7 5.4L73.9 6.8Z";

/** The six brushed shapes, in the design's own paint order: the swept sail, the
 *  horizon, the spar, the crossbar, the crescent, the point. Ported verbatim
 *  from `.design-sync/sigils/Sigil-Studies-v2.dc.html`, the Ephemerists "New"
 *  band — all six, because a five-shape port renders a plausible mark and is
 *  invisible to every check we run. */
const STROKES = [SAIL, HORIZON, SPAR, CROSSBAR, CRESCENT, POINT];

export function EphemeristsSigil({
  size = 22,
  color = "currentColor",
}: {
  /** Rendered box, in px. The mark is square (see the ratio note above). */
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill={color}
      style={{ display: "block", flexShrink: 0 }}
      aria-hidden="true"
    >
      {STROKES.map((d) => (
        <path key={d.slice(0, 12)} fillRule="evenodd" d={d} />
      ))}
    </svg>
  );
}

export default EphemeristsSigil;
