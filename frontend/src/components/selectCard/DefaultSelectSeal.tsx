import DefaultSigil from "../sigil/DefaultSigil";

/**
 * Default member seal (#3130, kept as drawn #3146): the na sigil's own ring at
 * seal size; Albescent wears it too. The band hides it from AT. `size` is the
 * tile's, which reserves the slot at the same figure.
 */
export default function DefaultSelectSeal({ size }: { size: number }) {
  return <DefaultSigil size={size} />;
}
