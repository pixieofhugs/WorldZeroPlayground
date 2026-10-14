/**
 * S.N.I.D.E.'s MEMBER SEAL — a marker X, drawn in the band for a member and for
 * nobody else (#3130, #3143).
 *
 * PROVISIONAL (owner ruling on #3130, 2026-10-12). The X is the reference
 * mock-up's first sketch, built now so no tile ships with an empty slot, and it
 * is due a design pass. That is why it is a file of its own: the replacement
 * swaps this one component and touches nothing else.
 *
 * Two uneven strokes in the faction's hot pink, which holds on the near-black
 * bar in both themes. The band hides the whole seal from assistive tech.
 */
export default function SnideSelectSeal({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" stroke="var(--faction-snide-pink)" strokeWidth="4" strokeLinecap="round">
      <path d="M5 6 L25 24" />
      <path d="M24 5 L6 25" />
    </svg>
  );
}
