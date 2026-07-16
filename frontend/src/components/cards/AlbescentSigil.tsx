import type { CSSProperties } from "react";

/**
 * AlbescentSigil — the surveyor's cross-hair, the Albescent faction's only mark.
 * Outer ring (18% opacity) · inner ring (55%) · four cardinal tick marks · a
 * filled centre dot. It asks only: where are you, exactly?
 *
 * The single canonical Albescent emblem, reused across every surface that carries
 * the mark (avatar, task/praxis cards, edit-praxis, task-detail, faction hero,
 * the faction-select tile, invitation). Draws in the faction's near-black ink
 * token by default — no hue, always-light, never hardcode hex.
 */
export default function AlbescentSigil({
  size = 20,
  color = "var(--faction-albescent-card-text)",
  opacity = 1,
  style,
}: {
  size?: number;
  color?: string;
  opacity?: number;
  style?: CSSProperties;
}) {
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
      <circle cx={c} cy={c} r={rO} stroke={color} strokeWidth={size * 0.022} opacity={0.18} />
      <circle cx={c} cy={c} r={rI} stroke={color} strokeWidth={size * 0.05} opacity={0.55} />
      {[0, 90, 180, 270].map((deg) => {
        const { x1, y1, x2, y2 } = tick(deg);
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={size * 0.05} />;
      })}
      <circle cx={c} cy={c} r={rD} fill={color} />
    </svg>
  );
}
