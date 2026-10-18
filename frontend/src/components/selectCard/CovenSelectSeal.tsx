import { DEEP } from "../factionMarks/covenSlip";

/**
 * The Coven tile's MEMBER SEAL — a four-point star in a ring, drawn in the band
 * for a member and for nobody else (#3130, #3142).
 *
 * Kept as drawn (owner ruling on #3146, 2026-10-17). One file so a swap touches
 * nothing else. The ink is the slip's `DEEP`, the
 * ornament ink every other mark on this tile already wears. No copy: the band
 * hides the whole seal from assistive tech.
 *
 * `size` is the tile's: the band reserves the seal's slot at the same figure.
 */
export default function CovenSelectSeal({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" stroke={DEEP} strokeWidth="1.5" />
      <path d="M12 5c.4 4.2 2.8 6.6 7 7-4.2.4-6.6 2.8-7 7-.4-4.2-2.8-6.6-7-7 4.2-.4 6.6-2.8 7-7Z" fill={DEEP} />
    </svg>
  );
}
