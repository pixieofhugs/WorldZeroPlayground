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
