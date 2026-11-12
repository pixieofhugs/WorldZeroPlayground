/**
 * No character archetype pins its Location field under the shared floor (#2990).
 *
 * A source scan: the fit itself is rendered geometry, which lives in
 * `e2e/contrast.spec.ts` (#2864); this catches a hand-copied `maxWidth` literal.
 * Roster derived from both surface maps, files found by component name. A field
 * with no `maxWidth` or a wider one is fine: this is a floor (#2990 AC 3).
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

/** The Location input's JSX: from its placeholder key to the element's end. */
function locationFieldJsx(source: string): string | null {
  const start = source.indexOf("character.locationPlaceholder")
  if (start === -1) return null
  const end = source.indexOf('/>', start)
  return source.slice(start, end === -1 ? source.length : end)
}

/* Built inside the tests: archetypes resolve in `preloadArchetypes.ts`'s beforeAll. */
describe('the Location field floor', () => {
  it('covers every registered character archetype', () => {
    // 9 factions × 2 surfaces; an empty roster would pass the row below.
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
