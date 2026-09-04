/**
 * One string, two attributes — the placeholder-only character forms' accessible
 * name (#2793).
 *
 * WHY THIS EXISTS AT ALL. The owner ruling on #2793 deletes every visible label
 * from Create Character and Edit Character: both forms become placeholder-only,
 * and the words that used to sit above a field now sit inside it. That is a
 * straight accessibility regression unless each input carries an `aria-label`,
 * because on these two pages the visible `<label>` WAS the accessible name —
 * the material difference from #2772, where the name already existed on the
 * input and only the visible label was missing.
 *
 * So the requirement is not "add an aria-label", it is "add an aria-label that
 * says what the placeholder says". Two attributes fed by one call cannot drift
 * into two vocabularies, which is the whole defect #2793 was filed about. There
 * are three fields on each of the eight create archetypes and seven on the na
 * edit kit's two branches, with #2537's seven-faction edit fan-out still to
 * land — a helper is a smaller surface for that fan-out to copy than a pair of
 * hand-written attributes.
 *
 * IT TAKES THE RESOLVED STRING, NOT A KEY. Every caller already holds a `t`
 * bound to its own namespace list, and threading `TFunction`'s generics through
 * here would buy nothing the call site does not already have.
 *
 *   <input {...namedField(t('character.namePlaceholder'))} … />
 *
 * `createCharacterFields.test.tsx` and `editCharacterDispatch.test.tsx` sweep
 * both registries at both widths for exactly this pairing, so a field that
 * skips the helper and writes one attribute goes red.
 */

/** The placeholder a player reads, and the name a screen reader announces. */
export function namedField(text: string): { placeholder: string; 'aria-label': string } {
  return { placeholder: text, 'aria-label': text }
}

/**
 * The narrowest the Location field may be capped to, in px (#2990).
 *
 * WHY A CONSTANT AND NOT FIVE LITERALS. `maxWidth: 280` was hand-copied to five
 * edit archetypes. Two of them clipped the placeholder's closing parenthesis —
 * na by 5px, Everymen by 7px — and the three that cleared it did so only
 * because their faces set narrow at that size, so any of them was one face
 * change away from the same defect. One number the sites read is the fix; five
 * numbers is the bug. It is a FLOOR, not a regularisation (#2990 AC 3): an
 * archetype that wants a wider Location field still says so at its own call
 * site, it just may not go under this.
 *
 * THE ARITHMETIC. `character.locationPlaceholder` is frozen copy — an owner
 * ruling (#2793), with #2798 owning the airport-code format question — so the
 * field is sized to the words rather than the words to the field. #2990
 * measured the string at **259px** in the widest-setting faces on this surface
 * (Courier Prime on Everymen, Special Elite on S.N.I.D.E.) at `--text-content`.
 * The field's own chrome eats the rest:
 *
 *     259  placeholder, widest measured face
 *   +  24  horizontal padding — `var(--space-md)` (12px) each side
 *   +   4  border — the widest is Everymen's 2px frame, each side
 *   = 287  the true minimum
 *
 * 300 is that minimum rounded up: ~13px of cushion for subpixel rounding and
 * for the fallback face that paints before a webfont swaps in. The measurement
 * that actually decides this is rendered, not computed — the guard for it is
 * the nightly sweep (`e2e/contrast.spec.ts`), per the #2864 ruling that
 * geometry has one home and vitest is not it. What a PR-time test CAN see is
 * that no archetype hard-codes a Location `maxWidth` under this floor, and
 * `locationFieldFloor.test.ts` is that scan.
 */
export const LOCATION_FIELD_MIN_WIDTH = 300
