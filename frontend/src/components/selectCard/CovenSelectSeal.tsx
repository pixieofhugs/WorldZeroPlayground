import { DEEP } from "../factionMarks/covenSlip";

/**
 * Coven member seal: a four-point star in a ring, members only (#3142; kept as
 * drawn, #3146). Inked in the slip's `DEEP`; the band hides it from AT.
 * `size` is the tile's, which reserves the slot at the same figure.
 */
export default function CovenSelectSeal({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" stroke={DEEP} strokeWidth="1.5" />
      <path d="M12 5c.4 4.2 2.8 6.6 7 7-4.2.4-6.6 2.8-7 7-.4-4.2-2.8-6.6-7-7 4.2-.4 6.6-2.8 7-7Z" fill={DEEP} />
    </svg>
  );
}
