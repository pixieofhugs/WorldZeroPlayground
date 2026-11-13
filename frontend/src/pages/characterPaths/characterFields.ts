/**
 * Accessible names for the placeholder-only character forms (#2793). The visible
 * label was the accessible name, so each field needs an `aria-label` that says
 * what its placeholder says; one call feeds both so they cannot drift. Takes the
 * resolved string, not a key:
 *
 *   <input {...namedField(t('character.namePlaceholder'))} … />
 *
 * Enforced by `createCharacterFields.test.tsx` and `editCharacterDispatch.test.tsx`.
 */

export function namedField(text: string): { placeholder: string; 'aria-label': string } {
  return { placeholder: text, 'aria-label': text }
}

/**
 * Floor for a Location field's `maxWidth`, in px (#2990); wider is fine.
 * The frozen placeholder measures 259px in the widest face (Courier Prime /
 * Special Elite) + 24 padding + 4 border = 287, rounded up for font-swap cushion.
 * Rendered check: `e2e/contrast.spec.ts`; source scan: `locationFieldFloor.test.ts`.
 */
export const LOCATION_FIELD_MIN_WIDTH = 300

/** Location is a three-letter airport-style code, or empty (#2798). */
export const LOCATION_CODE_LENGTH = 3
