/**
 * THE WARPED EPHEMERIS NET (#2144) — the Ephemerists' one ground.
 *
 * The page stopped being aged paper and became a chart. Owner ruling on the
 * epic (#2140): "A says this is aged paper, B says this is a chart — and a chart
 * is a thing an ephemerist MADE, where foxing is just something that happened to
 * the paper." So the seven-layer wash `.eph-backdrop` used to carry (a gold
 * corner bleed, two astrolabe rings, dot foxing, a straight 26px ruling and a
 * closing gradient) is gone, and this is what replaces all of it.
 *
 * Three families, all drawn about ONE pole off the right edge of the sheet:
 * meridians and parallels bent around it, and a fan of straight rays converging
 * on it. That is the whole drawing — the bend is what separates a chart from
 * graph paper, and the pole being off-canvas is what makes the sheet read as a
 * detail of something larger.
 *
 * ── DEVIATION (`docs/agents/design-fidelity.md` §"Vendor, build, delete") ──
 * The design bundle for #2140 is NOT vendored under `.design-sync/`, so the
 * geometry here is authored from #2144's prose description of `eph-backdrop.js`
 * (1000×600, `preserveAspectRatio="none"`, stroked at 0.7) rather than ported
 * from the source. Prose cannot carry geometry: the FAMILIES are the design's,
 * the pole's coordinates and the line counts are an interpretation and are the
 * first thing to correct against the bundle when it lands.
 *
 * ── WHY A COMPONENT AND NOT A `url()` IN THE TOKEN ──
 * `--faction-ephemerists-grid` publishes the STRAIGHT graticule and its ponytail
 * names "point this at a url() of a hosted SVG" as the upgrade path. Two things
 * make that the wrong shape for the net and they are both about the ink: an
 * externally-referenced SVG cannot read a CSS custom property, so its stroke
 * would be a baked hex — and this ruling's ink FLIPS (`-plate-brass-light` is
 * `#6f5620` on the vellum and `#e6c877` on the night plate), which is the whole
 * reason #2141 theme-scoped the token. A baked hex would either need two assets
 * of the same drawing or a mask, and drawn inline it needs neither: the stroke
 * is a `var()` and follows the stock. `docs/agents/load-time.md`'s cost note
 * applies and is paid the cheap way — this module is imported only from
 * archetypes the ephemerists manifest loads lazily, so it is in that faction's
 * chunk and not on anyone else's critical path, and the drawing is a LOOP rather
 * than a dumped path list.
 *
 * ── OPACITY IS NOT ONE NUMBER, AND IS NOT IN THE DRAWING ──
 * Same rule the grid token states: a wash baked into the image cannot be dialled
 * by its mount. The owner's three weights are 0.17 on the page ground, 0.10 on a
 * card or plate ground, and 0.17 on the task brief — so `opacity` is required,
 * not defaulted, and every mount has to say which surface it is.
 */
import { BRASS_LIGHT } from "./ephemeristsPlate";

/** The sheet, in the design's own units. Stretched to the host box, never fitted. */
const W = 1000;
const H = 600;

/**
 * The pole the chart is drawn about — off the right edge, and above centre.
 * Everything on this sheet bends toward it or points at it.
 */
const POLE_X = 1190;
const POLE_Y = 232;

/**
 * One graticule line as a quadratic whose control point is the segment's own
 * midpoint pulled `k` of the way toward the pole. `k = 0` is the straight
 * ruling this replaces; `k = 1` would collapse the line onto the pole. The bend
 * is the only thing separating a chart from graph paper, so it is the one
 * parameter, and it is per-line rather than global — a projection warps hardest
 * near its pole.
 */
function bent(x1: number, y1: number, x2: number, y2: number, k: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const cx = mx + (POLE_X - mx) * k;
  const cy = my + (POLE_Y - my) * k;
  return `M${x1} ${y1}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2} ${y2}`;
}

/**
 * Meridians — 15 near-vertical curves, bending harder the closer they run to the
 * pole. They start and end outside the sheet so no line terminates in view: a
 * chart is a detail of something larger, and a graticule that stops at the edge
 * reads as a border.
 */
const MERIDIANS = Array.from({ length: 15 }, (_, i) => {
  const x = -60 + i * 80;
  return bent(x, -40, x, H + 40, 0.05 + 0.16 * ((x + 60) / 1120));
});

/**
 * Parallels — 11 near-horizontal curves bowing toward the pole's latitude.
 * Deliberately fewer and further apart than the meridians: they are the family
 * the eye reads as "the sheet", and matching the pitch in both directions is
 * what would put graph paper back.
 */
const PARALLELS = Array.from({ length: 11 }, (_, j) => {
  const y = -80 + j * 80;
  return bent(-60, y, W + 60, y, 0.06 + 0.12 * (1 - Math.min(1, Math.abs(y - POLE_Y) / 520)));
});

/**
 * The fan — 15 straight rays converging on the pole from off the left edge.
 * Straight, where the graticule is bent, and that contrast is the point: these
 * are sightlines taken from the sheet, not lines of the projection.
 */
const RAYS = Array.from({ length: 15 }, (_, i) => ({ x: -80, y: -260 + i * 100 }));

/**
 * @param opacity how far back the net sits — see the header. There is no
 * default: the three weights are a ruling, and a mount that has not decided
 * which surface it is has not finished.
 */
export default function EphemerisNet({ opacity }: { opacity: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        // A GROUND, NOT A VEIL — the same contract `.eph-grid-ground` states in
        // index.css: between the host's own fill and everything printed on it,
        // and inert. The host must be a stacking context (`isolation: isolate`,
        // or any positioned element with a z-index) or this escapes below the
        // fill; that is the mechanism the design's `z-index: 1` lift replaces,
        // and the lift is wrong here because lifting static children needs
        // `position: relative` on them, which overrides the absolutely
        // positioned ornament the plate skins are full of.
        zIndex: -1,
        pointerEvents: "none",
        opacity,
      }}
    >
      <g stroke={BRASS_LIGHT} strokeWidth={0.7} fill="none">
        {[...MERIDIANS, ...PARALLELS].map((d) => (
          <path key={d} d={d} />
        ))}
        {RAYS.map((origin) => (
          <line key={origin.y} x1={origin.x} y1={origin.y} x2={POLE_X} y2={POLE_Y} />
        ))}
      </g>
    </svg>
  );
}
