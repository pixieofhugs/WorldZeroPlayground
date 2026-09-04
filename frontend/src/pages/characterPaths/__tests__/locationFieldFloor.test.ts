/**
 * No character archetype pins its Location field under the shared floor (#2990).
 *
 * ## The seam, and why it is a source scan
 *
 * This file asks one question of TEXT: does any archetype hand-write a
 * `maxWidth` on the Location input that is smaller than
 * {@link LOCATION_FIELD_MIN_WIDTH}? That is a property of the source, and the
 * source is the only place a vitest run can look — the defect #2990 was filed
 * on is a RENDERED text width against a RENDERED field width, and the unit
 * harness runs in node with no layout engine. Per the 2026-08-31 ruling on
 * #2864, geometry has one home and it is the rendered sweep; the fit assertion
 * lives in `e2e/contrast.spec.ts` and is nightly, not per-PR. Writing a
 * "measurement" here instead would be a vacuous green.
 *
 * So the split is: the sweep measures whether the words fit, this asserts that
 * the number the sites read is the shared one. The cause of #2990 was a literal
 * — `maxWidth: 280`, hand-copied to five archetypes, wrong on two of them and
 * one face change away from wrong on the other three — and a copy of a literal
 * is exactly what a source scan catches and a render test does not.
 *
 * ## The roster is derived, never typed
 *
 * `surfaceMap('editCharacter')` and `surfaceMap('createCharacter')`, unwrapped
 * through `resolvedArchetype` and mapped to their own file by component name.
 * A tenth faction, or a tenth kit on an existing faction, is scanned the day it
 * registers with nothing to append here — which is the whole point, since the
 * next archetype to copy the literal is the one nobody has written yet. An
 * archetype whose default export is not a named function, or whose file is not
 * `archetypes/<name>.tsx`, fails loudly rather than being skipped.
 *
 * ## What is deliberately not asserted
 *
 * Not that a Location field HAS a `maxWidth` — three edit kits give it the full
 * column and are correct to (#2990 AC 3: this is a floor, not a
 * regularisation). Not that the cap equals the floor: an archetype may choose
 * wider. Only that nothing goes under.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

import { surfaceMap } from '../../../factions'
import { resolvedArchetype } from '../../../factions/lazyArchetype'
import { LOCATION_FIELD_MIN_WIDTH } from '../characterFields'

/** The two character surfaces that can carry a Location field. */
const SURFACES = ['editCharacter', 'createCharacter'] as const

/** Every registered character archetype, as `slug · surface` → source text. */
function archetypeSources(): Array<{ label: string; file: string; source: string }> {
  return SURFACES.flatMap((surface) =>
    Object.entries(surfaceMap(surface)).map(([slug, variant]) => {
      const component = resolvedArchetype(variant as never)
      const name = component?.name
      expect(
        name,
        `${slug} · ${surface} resolved to an anonymous component — this scan finds an ` +
          "archetype's file by its default export's name, so give it a named function.",
      ).toBeTruthy()
      const file = `archetypes/${name}.tsx`
      return {
        label: `${slug} · ${surface}`,
        file,
        source: readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), 'utf8'),
      }
    }),
  )
}

/**
 * The Location input's own JSX, if the archetype draws one.
 *
 * Sliced from the `character.locationPlaceholder` call to the end of that
 * element, so a `maxWidth` on some OTHER field on the same page is not read as
 * this one's. The placeholder key is the only unambiguous marker of the field:
 * every kit reaches it through `namedField`, which is what
 * `editCharacterDispatch.test.tsx` already holds them to.
 */
function locationFieldJsx(source: string): string | null {
  const start = source.indexOf("character.locationPlaceholder")
  if (start === -1) return null
  const end = source.indexOf('/>', start)
  return source.slice(start, end === -1 ? source.length : end)
}

/* The roster is built INSIDE the tests, not at collection: archetypes resolve
   in the `beforeAll` that `src/test/preloadArchetypes.ts` installs, so at
   collection time every manifest entry is still the deferred wrapper. */
describe('the Location field floor', () => {
  it('covers every registered character archetype', () => {
    // 9 factions × 2 surfaces. A guard whose roster silently emptied would pass
    // the row below, so the roster itself is the first assertion.
    expect(archetypeSources().length).toBeGreaterThanOrEqual(18)
  })

  it('pins no Location maxWidth under the floor', () => {
    const violations = archetypeSources().flatMap(({ label, file, source }) => {
      const jsx = locationFieldJsx(source)
      if (jsx === null) return [] // No Location field on this surface.

      return [...jsx.matchAll(/maxWidth:\s*(\d+)/g)]
        .map((match) => Number(match[1]))
        .filter((width) => width < LOCATION_FIELD_MIN_WIDTH)
        .map((width) => `${label} — ${file} caps the Location field at ${width}px`)
    })

    expect(
      violations,
      `The frozen placeholder "Location (SFO, PDX, YYZ)" needs ${LOCATION_FIELD_MIN_WIDTH}px of ` +
        'field to render in full, closing parenthesis included. Read ' +
        'LOCATION_FIELD_MIN_WIDTH from characterFields.ts rather than writing a number at the ' +
        `call site — that literal is the whole of #2990:\n  ${violations.join('\n  ')}`,
    ).toEqual([])
  })
})
