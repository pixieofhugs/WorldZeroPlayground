/**
 * CovenSigil — the Warriors of Whimsy four-point sparkle, the faction's only mark.
 *
 * The single canonical COVEN emblem, drawn once and reused everywhere the sparkle
 * appears (faction-select tile, the wow.exe title bar, mobile praxis card).
 * Colors come from the --faction-wow token by default — never hardcode hex.
 */
export function CovenSigil({
  size = 22,
  color = "var(--faction-wow)",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      <path d="M12 0c.9 7 4.1 10.2 11 11-6.9.8-10.1 4-11 11-.9-7-4.1-10.2-11-11C7.9 10.2 11.1 7 12 0Z" fill={color} />
    </svg>
  );
}
