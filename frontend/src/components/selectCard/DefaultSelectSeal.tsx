import DefaultSigil from "../sigil/DefaultSigil";

/**
 * The default tile's MEMBER SEAL — a small spectrum ring, drawn in the band for
 * a member and for nobody else (#3130). Unaffiliated wears it, and so does
 * Albescent, which wraps the default tile.
 *
 * PROVISIONAL (owner ruling on #3130, 2026-10-12). The ring is the reference
 * mock-up's first sketch, built now so that no tile ships with an empty slot,
 * and it is due a design pass. That is why it is a file of its own: the
 * replacement swaps this one component and touches nothing else.
 *
 * It is the na sigil's own ring at seal size rather than a second drawing of
 * it, so the ramp, the dark half and the cut-out are `DefaultSigil`'s. The
 * band hides the whole seal from assistive tech, the sigil's label included.
 *
 * `size` is the tile's: the band reserves the seal's slot at the same figure,
 * so the tile states it once and hands it to both.
 */
export default function DefaultSelectSeal({ size }: { size: number }) {
  return <DefaultSigil size={size} />;
}
