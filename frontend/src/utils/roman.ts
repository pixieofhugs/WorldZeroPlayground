/** Roman numerals for levels, vote tiers, entry numbers; shared, no faction's dress (#1208). */
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
