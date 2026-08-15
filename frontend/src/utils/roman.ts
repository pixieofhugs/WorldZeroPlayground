/**
 * Roman numerals — levels, vote tiers, entry numbers.
 *
 * Two factions set a level as a numeral: the Ephemerists print it plain (it was
 * their *grade* until #1702 retired the word) and UA calls it an *anno*. This
 * lived in `components/cards/ephemeristsAtoms.tsx`
 * until #1208 deleted that module, which had UA importing a formatter out of
 * another faction's ornament kit; a numeral is neither faction's dress.
 */
const ROMAN: ReadonlyArray<readonly [string, number]> = [
  ["M", 1000], ["CM", 900], ["D", 500], ["CD", 400], ["C", 100], ["XC", 90],
  ["L", 50], ["XL", 40], ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1],
];

/** `0` for anything at or below zero — callers that want an em-dash test first. */
export function toRoman(value: number): string {
  let remaining = Math.max(0, Math.floor(value));
  let out = "";
  for (const [glyph, amount] of ROMAN) {
    while (remaining >= amount) {
      out += glyph;
      remaining -= amount;
    }
  }
  return out || "0";
}
