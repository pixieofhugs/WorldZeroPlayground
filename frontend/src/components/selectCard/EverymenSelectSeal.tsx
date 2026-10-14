/**
 * The Everymen's MEMBER SEAL — a star in the mast, drawn for a member and for
 * nobody else (#3130, #3106).
 *
 * PROVISIONAL (owner ruling on #3130, 2026-10-12). This is the reference
 * mock-up's first sketch, built now so no tile ships with an empty slot, and it
 * is due a design pass. That is why it is a file of its own: the replacement
 * swaps this one component and touches nothing else. The band hides it from
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
