/**
 * The Ephemerists' mark — the watching wanderer: an eye on an orbital ring.
 *
 * Moved here from the deleted `ephemeristsAtoms.tsx` (#1208), which puts it
 * where every sibling already lives — one dedicated file per faction sigil
 * (`UaSigil`, `SnideSigil`, `WowSigil`, `EverymenSigil`, `SingularitySigil`,
 * `AlbescentSigil`). It is the component `factions/ephemerists.ts` registers as
 * the `sigil` archetype.
 *
 * It survived the codex sweep unchanged and painted, because it never carried
 * codex colour: it is stroke-only geometry on the same 24-unit square the Valley
 * plate's whole glyph library is drawn on, and its ink arrives as a prop. Read
 * beside `GLYPHS.planet` (Saturn's ring) and `GLYPHS.openEye`, it is the plate's
 * own two signs fused, so it needs no re-cutting to sit on papyrus.
 */
export function EphemeristsSigil({
  size = 22,
  color = "currentColor",
  stroke = 1.4,
}: {
  size?: number;
  color?: string;
  stroke?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <ellipse cx="12" cy="12" rx="11" ry="4.4" transform="rotate(-24 12 12)" />
      <path d="M4 12 C7.5 8.2 16.5 8.2 20 12 C16.5 15.8 7.5 15.8 4 12 Z" />
      <circle cx="12" cy="12" r="2.7" />
      <circle cx="12" cy="12" r="0.6" fill={color} stroke="none" />
    </svg>
  );
}

export default EphemeristsSigil;
