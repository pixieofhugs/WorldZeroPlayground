import { useId, type CSSProperties } from "react";

/** --faction-default-rainbow's own cut, as [stop index, offset %] pairs. */
const SPECTRUM_CUT: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [2, 17],
  [3, 33],
  [4, 50],
  [5, 67],
  [6, 83],
  [7, 100],
];

/**
 * AlbescentSigil — the surveyor's cross-hair, the Albescent faction's only mark.
 * Outer ring (18% opacity) · inner ring (55%) · four cardinal tick marks · a
 * filled centre dot. It asks only: where are you, exactly?
 *
 * The single canonical Albescent emblem, reused across every surface that carries
 * the mark (avatar, task/praxis cards, edit-praxis, task-detail, faction hero,
 * the faction-select tile, invitation). Draws in the faction's near-black ink
 * token by default — no hue, always-light, never hardcode hex.
 *
 * `spectrum` paints the same drawing in the unaffiliated ramp instead (#1658,
 * the design's credential treatment). It is a prop and not the default because
 * the register a mount belongs to is the CALLER's question: the invitation
 * letter and the faction-select tile are reveal surfaces and stay in ink, while
 * `FactionSigil` turns it on for any dispatched mount with no colour of its own.
 */
export default function AlbescentSigil({
  size = 20,
  color = "var(--albescent-reveal-text)",
  spectrum = false,
  opacity = 1,
  style,
}: {
  size?: number;
  color?: string;
  spectrum?: boolean;
  opacity?: number;
  style?: CSSProperties;
}) {
  /* HOW THE CSS RAMP CROSSES INTO SVG. `stroke` takes a paint server or a
     colour and nothing else, so --faction-default-rainbow — a `linear-gradient()`
     VALUE — cannot be handed to it, and no `<linearGradient>` can read one
     either. What both sides DO share is the seven stops the token composes
     from: `stop-color="var(--faction-default-stop-3)"` resolves through the
     ordinary cascade, so rebuilding the ramp here from the same tokens at the
     same cut is the bridge, and the mark flips with [data-theme="dark"] for
     free. This is the shape index.css already prescribes for a surface that
     needs its own cut — "a surface that wants wedges composes them" — rather
     than an eighth rainbow token nothing else would read.

     The offsets are --faction-default-rainbow's own (17/33/50/67/83): the bar
     ramp, because this is a straight sweep. The conic cut is for round
     GEOMETRY, and SVG 1.1 has no conic gradient to point at anyway. */
  const uid = `wz-spectrum-${useId().replace(/:/g, "")}`;
  const ink = spectrum ? `url(#${uid})` : color;
  const c = size / 2;
  const rO = size * 0.43;
  const rI = size * 0.235;
  const rD = size * 0.05;
  const tS = rI + size * 0.025;
  const tE = tS + size * 0.13;
  const tick = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return {
      x1: c + tS * Math.cos(a),
      y1: c + tS * Math.sin(a),
      x2: c + tE * Math.cos(a),
      y2: c + tE * Math.sin(a),
    };
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      style={{ display: "block", flexShrink: 0, opacity, ...style }}
      aria-hidden
    >
      {spectrum ? (
        <defs>
          {/* userSpaceOnUse, not the objectBoundingBox default: two of the four
              ticks are horizontal lines, whose bounding box has zero height —
              and an element with a degenerate gradient box is not rendered at
              all. It is also the only way the seven stops read as ONE sweep
              across the mark rather than seven private ramps. Corner to corner
              so the four ticks land on four different hues. */}
          <linearGradient id={uid} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={size} y2={size}>
            {SPECTRUM_CUT.map(([index, offset]) => (
              <stop key={index} offset={`${offset}%`} stopColor={`var(--faction-default-stop-${index})`} />
            ))}
          </linearGradient>
        </defs>
      ) : null}
      <circle cx={c} cy={c} r={rO} stroke={ink} strokeWidth={size * 0.022} opacity={0.18} />
      <circle cx={c} cy={c} r={rI} stroke={ink} strokeWidth={size * 0.05} opacity={0.55} />
      {[0, 90, 180, 270].map((deg) => {
        const { x1, y1, x2, y2 } = tick(deg);
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={ink} strokeWidth={size * 0.05} />;
      })}
      <circle cx={c} cy={c} r={rD} fill={ink} />
    </svg>
  );
}
