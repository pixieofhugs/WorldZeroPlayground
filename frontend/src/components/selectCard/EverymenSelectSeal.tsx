/**
 * Everymen member seal: a star in the mast, members only (#3106; kept as drawn,
 * #3146). `currentColor` takes the mast's lettering ink; hidden from AT.
 */
export default function EverymenSelectSeal({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7.3L12 17.8 5.7 21.5l1.7-7.3L2 9.5l7.1-.6z" />
    </svg>
  );
}
