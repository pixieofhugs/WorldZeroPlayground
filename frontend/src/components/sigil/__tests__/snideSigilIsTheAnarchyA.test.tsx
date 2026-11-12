/**
 * Each S.N.I.D.E. surface renders the Anarchy A (#2119), not the retired
 * circled-S from `snideAtoms`; tsc can't tell which mark a surface draws.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'

import '../../../i18n'
import { factionName } from '../../../utils/factions'
import SnideSelectCard from '../../selectCard/SnideSelectCard'
import SnideFactionHero from '../../factionHero/SnideFactionHero'

const render = (el: ReactElement) => renderToStaticMarkup(<MemoryRouter>{el}</MemoryRouter>)

/** The Anarchy A's own geometry: the bleeding viewBox and the design's cant. */
const ANARCHY_A = [/viewBox="-8 -8 116 116"/, /rotate\(-22 50 50\)/]

/** Pinned by its circle; a `0 0 48 48` viewBox alone is too common. */
const CIRCLED_S = /<circle cx="24" cy="24" r="19"/

/**
 * Measured, not taste: the A's rotated ink spans 0.844 of its box height vs the
 * circled-S's 0.854, so the sizes held. Retune both knowingly — drawn height is
 * 0.844x the number here.
 */
const SIZES = { selectCard: 40, hero: 54 } as const

describe('every S.N.I.D.E. surface wears the Anarchy A', () => {
  const MOUNTS: ReadonlyArray<[label: string, html: () => string, size: number]> = [
    [
      'faction-directory select card',
      () => render(<SnideSelectCard state="eligible" members={3} />),
      SIZES.selectCard,
    ],
    [
      'faction-page hero',
      () =>
        render(
          <SnideFactionHero slug="snide" name={factionName('snide')} members={214} tasks={9} praxes={1489} />,
        ),
      SIZES.hero,
    ],
  ]

  it.each(MOUNTS)('%s draws the A, not the retired circled-S', (_label, html) => {
    const markup = html()
    for (const mark of ANARCHY_A) {
      expect(markup, 'the surface draws the Anarchy A').toMatch(mark)
    }
    expect(markup, 'the retired circled-S is gone from this surface').not.toMatch(CIRCLED_S)
  })

  it.each(MOUNTS)('%s asks for its measured size', (_label, html, size) => {
    // The sigil's own <svg>, found by its bleeding viewBox.
    const markup = html()
    const box = markup.indexOf('viewBox="-8 -8 116 116"')
    const tag = markup.slice(markup.lastIndexOf('<svg', box), markup.indexOf('>', box) + 1)
    expect(tag, 'the mark is drawn square at its measured size').toContain(`width="${size}"`)
    expect(tag).toContain(`height="${size}"`)
  })
})
