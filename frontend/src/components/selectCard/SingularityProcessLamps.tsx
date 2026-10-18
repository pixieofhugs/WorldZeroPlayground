/**
 * Singularity's two select-tile drawings (#3145, #3146), built on the faction's
 * own tokens (the `-led-*` trio stays in `factionMarks/SingularityLamps.tsx`; a
 * test pins it there). Each is one small component so a swap touches this file
 * and not the tile. Decorative: the slots that mount them are `aria-hidden`.
 */
const LIT = "var(--faction-singularity-term-bright)";
const OFF = "var(--faction-singularity-term-hair)";

/** The ornament: a row of process lamps, three lit. */
export function ProcessLamps() {
  const fills = [LIT, LIT, LIT, OFF, OFF];
  return (
    <svg width={72} height={8} viewBox="0 0 72 8" aria-hidden="true" style={{ display: "block" }}>
      {fills.map((fill, i) => (
        <circle key={i} cx={4 + i * 16} cy={4} r={4} fill={fill} />
      ))}
    </svg>
  );
}

/** The member seal: a Game of Life glider, five lit cells in a 3x3 grid. */
const GLIDER = new Set(["1,0", "2,1", "0,2", "1,2", "2,2"]);
const AT = [2, 8.2, 14.4];

export function Glider() {
  return (
    <svg width={22} height={22} viewBox="0 0 22 22" aria-hidden="true" style={{ display: "block" }}>
      {AT.flatMap((y, row) => AT.map((x, col) => (
        <rect key={`${col},${row}`} x={x} y={y} width={5.4} height={5.4} rx={0.6} fill={GLIDER.has(`${col},${row}`) ? LIT : OFF} />
      )))}
    </svg>
  );
}
