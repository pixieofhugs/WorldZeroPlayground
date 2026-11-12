/**
 * The warped ephemeris net (#2144) — the Ephemerists' one ground: a chart,
 * not aged paper (owner ruling, #2140).
 *
 * Meridians, parallels and a ray fan, all about one pole off the right edge.
 *
 * DEVIATION (`docs/agents/design-fidelity.md`): the #2140 bundle isn't
 * vendored, so geometry comes from #2144's prose. Pole coordinates and line
 * counts are interpretation; correct them against the bundle when it lands.
 *
 * Inline rather than a `url()` in the token: an external SVG can't read a CSS
 * var, and the brass ink flips per theme (#2141).
 *
 * `opacity` is required: 0.17 on the page ground and task brief, 0.10 on a
 * card or plate ground (owner ruling).
 */
import { BRASS_LIGHT } from "./ephemeristsPlate";

/** Design units; stretched to the host box. */
const W = 1000;
const H = 600;

/** Off the right edge, above centre. */
const POLE_X = 1190;
const POLE_Y = 232;

/**
 * A quadratic whose control point is the midpoint pulled `k` toward the pole
 * (0 = straight, 1 = collapsed onto the pole).
 */
function bent(x1: number, y1: number, x2: number, y2: number, k: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const cx = mx + (POLE_X - mx) * k;
  const cy = my + (POLE_Y - my) * k;
  return `M${x1} ${y1}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2} ${y2}`;
}

/** Bend harder near the pole; overrun the sheet so no line ends in view. */
const MERIDIANS = Array.from({ length: 15 }, (_, i) => {
  const x = -60 + i * 80;
  return bent(x, -40, x, H + 40, 0.05 + 0.16 * ((x + 60) / 1120));
});

/** Fewer than meridians on purpose: equal pitch would read as graph paper. */
const PARALLELS = Array.from({ length: 11 }, (_, j) => {
  const y = -80 + j * 80;
  return bent(-60, y, W + 60, y, 0.06 + 0.12 * (1 - Math.min(1, Math.abs(y - POLE_Y) / 520)));
});

/** Straight sightlines to the pole, contrasting the bent graticule. */
const RAYS = Array.from({ length: 15 }, (_, i) => ({ x: -80, y: -260 + i * 100 }));

/** @param opacity no default; see the header for the per-surface weights. */
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
        // A ground, not a veil (see `.eph-grid-ground`). The host must be a
        // stacking context or this escapes below its fill. Lifting children
        // instead would need `position: relative`, breaking absolute ornament.
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
