/**
 * EverymenSigil — the union cog: a ten-tooth gear ring around a cream hub, the
 * faction's only mark.
 *
 * The single canonical Everymen emblem, reused across every surface that carries
 * the mark (avatar badge, faction card, faction hero, task card, edit-praxis).
 * Colors come from --everymen-* tokens — never hardcode hex.
 */
export function EverymenSigil({
  size = 58,
  color = "var(--everymen-red)",
}: {
  size?: number;
  color?: string;
}) {
  const teeth = 10;
  const points: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const angle = (Math.PI / teeth) * i;
    const radius = i % 2 === 0 ? 50 : 40;
    points.push(`${50 + radius * Math.cos(angle)},${50 + radius * Math.sin(angle)}`);
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ display: "block" }}>
      <polygon points={points.join(" ")} fill={color} />
      <circle cx={50} cy={50} r={22} fill="var(--everymen-cream)" />
      <circle cx={50} cy={50} r={11} fill={color} />
    </svg>
  );
}
