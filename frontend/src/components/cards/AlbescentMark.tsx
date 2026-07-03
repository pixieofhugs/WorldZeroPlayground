import type { CSSProperties } from "react";

/**
 * The Albescent Mark — the surveyor's cross-hair sigil, the faction's only
 * emblem. Outer ring (18% opacity) · inner ring (50%) · 4 cardinal tick marks ·
 * a filled centre dot. It asks only: where are you, exactly?
 *
 * Shared across every Albescent surface (task card, praxis card, edit-praxis,
 * task-detail, read page). Ported from docs/design/albescent-kit
 * (albescent-cards.jsx `AlbescentMark`). Draws in the faction's near-black ink
 * token by default — no hue, always-light.
 */
export default function AlbescentMark({
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
  const rOuter = size * 0.43;
  const rInner = size * 0.235;
  const rDot = size * 0.044;
  const tickStart = rInner + size * 0.025;
  const tickEnd = tickStart + size * 0.13;

  const tick = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return {
      x1: c + tickStart * Math.cos(a),
      y1: c + tickStart * Math.sin(a),
      x2: c + tickEnd * Math.cos(a),
      y2: c + tickEnd * Math.sin(a),
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
      <circle cx={c} cy={c} r={rOuter} stroke={color} strokeWidth={size * 0.022} opacity={0.18} />
      <circle cx={c} cy={c} r={rInner} stroke={color} strokeWidth={size * 0.038} opacity={0.5} />
      {[0, 90, 180, 270].map((deg) => {
        const { x1, y1, x2, y2 } = tick(deg);
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={size * 0.038} />;
      })}
      <circle cx={c} cy={c} r={rDot} fill={color} />
    </svg>
  );
}
