import DefaultSigil from "../sigil/DefaultSigil";

/**
 * The default tile's MEMBER SEAL — a small spectrum ring, drawn in the band for
 * a member and for nobody else (#3130). Unaffiliated wears it, and so does
 * Albescent, which wraps the default tile.
 *
 * Kept as drawn (owner ruling on #3146, 2026-10-17); the unaffiliated tile wears it too.
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
