/** The Location field never pins a max-width under the shared floor (#2990); fit itself is e2e. */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import i18n from '../../../i18n'
import { surfaceMap } from '../../../factions'
import { resolveVariant } from '../../../utils/factionDispatch'
import { aCharacter, anEditCharacterState } from '../../../test/fixtures'
import { LOCATION_FIELD_MIN_WIDTH } from '../characterFields'

const SLUGS = [...Object.keys(surfaceMap('editCharacter')), '']
const PLACEHOLDER = i18n.getFixedT(null, 'forms')('character.locationPlaceholder')

function locationMaxWidth(slug: string): number | null {
  const Archetype = resolveVariant(surfaceMap('editCharacter'), slug)
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <Archetype state={anEditCharacterState({ character: aCharacter({ faction_slug: slug }) })} />
    </MemoryRouter>,
  )
  const tag = [...html.matchAll(/<input\b[^>]*>/g)].find(([t]) => t.includes(`placeholder="${PLACEHOLDER}"`))
  expect(tag, `${slug || 'na'} draws no Location input`).toBeDefined()
  const width = /max-width:\s*(\d+)px/.exec(tag![0])
  return width ? Number(width[1]) : null
}

describe('the Location field floor', () => {
  it('covers every registered character archetype', () => {
    expect(SLUGS.length).toBeGreaterThanOrEqual(9)
  })

  it.each(SLUGS)('%s pins no Location max-width under the floor', (slug) => {
    const width = locationMaxWidth(slug)
    if (width !== null) expect(width).toBeGreaterThanOrEqual(LOCATION_FIELD_MIN_WIDTH)
  })
})
