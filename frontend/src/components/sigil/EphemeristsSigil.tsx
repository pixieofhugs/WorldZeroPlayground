/**
 * The Ephemerists' mark — the KITE: a plumb-bob quartered by its own axes,
 * struck under a single point (#1635).
 *
 * It replaces the watching wanderer, the eye-on-an-orbital-ring that had been
 * the faction's sigil since `ephemeristsAtoms.tsx` was deleted (#1208). That
 * mark was drawn on the same 24-unit square as the Valley plate's glyph library
 * and read as one more sign out of the register; this one is the faction's own
 * device, on the design's 486x560 frame, and it is deliberately NOT square.
 * Callers hand it one number and get the design's ratio back, which is what
 * makes the masthead's three mounts (54x62, 38x44, and the datum row's 12-14px)
 * one prop apart. It is not UA's lotus — that mark is untouched.
 *
 * ONE INK, WHOLESALE. Stroked geometry and filled discs take the same `color`,
 * defaulting to `currentColor`, so the mark recolours from whatever token the
 * mount sets. There is no light/dark pair: the whole
 * `--faction-ephemerists-plate-*` register is theme-invariant (#1627) and every
 * surface this sigil renders on is one of its night grounds, so a token that
 * flipped with the theme would move the mark off a ground that does not.
 *
 * THE REDUCED CUT. Below `REDUCED_BELOW_PX` the five discs and the crossed axes
 * stop being detail and become mud — at 13px the axes are 0.6 rendered pixels
 * and the four vertex discs sit inside the kite's own stroke. Small sizes
 * therefore draw a DIFFERENT mark rather than the same one scaled: the kite and
 * the apex point, with both the rule and the point floored at a device pixel.
 * The threshold is 20px because that is where the design's 26-unit stroke
 * crosses 1 rendered pixel (20 x 26 / 560 = 0.93px) — i.e. the mark is cut at
 * the size where its own line stops being drawable, not at a round number.
 */

/** The design's frame. The mark is 486 wide and 560 tall; `size` is the HEIGHT. */
const VIEW_W = 486;
const VIEW_H = 560;
/** The design's stroke, in user units. */
const DESIGN_STROKE = 26;
/** The design's point above the apex: r 26 centred at 243,22 — so its top edge
 *  sits 4 units ABOVE the frame and the point is struck flat by it. That crop is
 *  the design's, and `APEX_TOP` is what keeps it when the reduced cut grows the
 *  disc: the point is pinned by its top edge rather than its centre, so it opens
 *  downward instead of eating further into the frame. */
const DESIGN_APEX_R = 26;
const APEX_TOP = 22 - DESIGN_APEX_R;
/** See the reduced-cut note above — this is where a 26-unit stroke hits 1px. */
const REDUCED_BELOW_PX = 20;

const KITE = "M243 120 L55 272 L243 490 L425 272 Z";
const AXIS_V = "M243 120 L243 490";
const AXIS_H = "M100 272 L392 272";
/** The four kite vertices, in path order: apex, left, foot, right. */
const VERTEX_DISCS = [
  { cx: 243, cy: 120, r: 56 },
  { cx: 55, cy: 272, r: 56 },
  { cx: 243, cy: 490, r: 50 },
  { cx: 425, cy: 272, r: 54 },
];

export function EphemeristsSigil({
  size = 22,
  color = "currentColor",
}: {
  /** Rendered HEIGHT in px; the width follows the design's 486:560 ratio. */
  size?: number;
  color?: string;
}) {
  const reduced = size < REDUCED_BELOW_PX;
  // User units per rendered pixel — the conversion both floors are expressed in.
  const perPixel = VIEW_H / size;
  const strokeWidth = Math.max(DESIGN_STROKE, perPixel);
  const apexRadius = Math.max(DESIGN_APEX_R, perPixel * 0.8);

  return (
    <svg
      width={Math.round((size * VIEW_W) / VIEW_H)}
      height={size}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <path d={KITE} />
      {!reduced && (
        <>
          <path d={AXIS_V} />
          <path d={AXIS_H} />
          {VERTEX_DISCS.map((disc) => (
            <circle key={`${disc.cx}-${disc.cy}`} {...disc} fill={color} stroke="none" />
          ))}
        </>
      )}
      <circle cx="243" cy={APEX_TOP + apexRadius} r={apexRadius} fill={color} stroke="none" />
    </svg>
  );
}

export default EphemeristsSigil;
