/**
 * Singularity's two select-tile drawings (#3145), PROVISIONAL: first sketches
 * from the #3130 reference, built on the faction's lamp mark
 * (`factionMarks/SingularityLamps.tsx`: round lamps; the `-led-*` trio stays
 * in that kit, a test pins it there) and its
 * own tokens, to be replaced by the design-pass child. Each is one small
 * component so a swap touches this file and not the tile. Decorative: the slots
 * that mount them are `aria-hidden`.
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

/** The member seal: one lit lamp, with a soft halo. */
export function LitLamp() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true" style={{ display: "block" }}>
      <circle cx={7} cy={7} r={7} fill={LIT} fillOpacity={0.3} />
      <circle cx={7} cy={7} r={4} fill={LIT} />
    </svg>
  );
}
