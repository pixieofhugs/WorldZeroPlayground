/**
 * The Everymen's MEMBER SEAL — a star in the mast, drawn for a member and for
 * nobody else (#3130, #3106).
 *
 * Kept as drawn (owner ruling on #3146, 2026-10-17). One file so a swap touches
 * nothing else. The band hides it from
 * assistive tech, and a seal carries no copy.
 *
 * It takes the mast's lettering ink from the band (`currentColor`), so it names
 * no token of its own. `size` is the tile's: the band reserves the seal's slot
 * at the same figure.
 */
export default function EverymenSelectSeal({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7.3L12 17.8 5.7 21.5l1.7-7.3L2 9.5l7.1-.6z" />
    </svg>
  );
}
