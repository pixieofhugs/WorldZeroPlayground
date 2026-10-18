/**
 * S.N.I.D.E.'s MEMBER SEAL — a spiked ring: ten acid spikes round an acid ring
 * with a pink core, drawn in the band for a member and for nobody else
 * (#3130, #3143, #3146). The band hides it from assistive tech; no copy.
 *
 * Acid and pink both hold on the near-black bar in either theme.
 */
const ACID = "var(--faction-snide-acid)";

export default function SnideSelectSeal({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="8.2" fill="none" stroke={ACID} strokeWidth="2.4" />
      <path fill={ACID} d="M17.9 6.8L16 1L14.1 6.8ZM22.94 9.67L24.82 3.86L19.87 7.44ZM25.34 14.96L30.27 11.36L24.16 11.35ZM24.16 20.65L30.27 20.64L25.34 17.04ZM19.87 24.56L24.82 28.14L22.94 22.33ZM14.1 25.2L16 31L17.9 25.2ZM9.06 22.33L7.18 28.14L12.13 24.56ZM6.66 17.04L1.73 20.64L7.84 20.65ZM7.84 11.35L1.73 11.36L6.66 14.96ZM12.13 7.44L7.18 3.86L9.06 9.67Z" />
      <circle cx="16" cy="16" r="2.4" fill="var(--faction-snide-pink)" />
    </svg>
  );
}
