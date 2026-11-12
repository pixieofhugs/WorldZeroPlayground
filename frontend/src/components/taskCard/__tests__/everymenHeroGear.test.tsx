/**
 * The Everymen hero cog sits on the card's centreline (#1965), shared with the
 * masthead cogs and the rays' convergence. Structural fix: LEVEL and the seal
 * live in two equal (`flex:1 1 0`) halves with the cog between them.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'

vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))

import EverymenTaskCard from '../EverymenTaskCard'
import { aTask } from '../../../test/fixtures'
import { readIndexCss } from '../../../test/indexCss'

const POINTS = 137

const markup = renderToStaticMarkup(
  <MemoryRouter>
    <EverymenTaskCard
      task={aTask({ description: 'Fix the lamp on the corner nobody owns.' })}
      basePoints={POINTS}
      multiplier={1}
      inProgressCount={0}
    />
  </MemoryRouter>,
)

/** The masthead pair is `currentColor`, so this matches only the rule's cog. */
const COG = 'fill="var(--everymen-red)"'

describe('Everymen task card — the hero cog', () => {
  it('sits between two equal halves, so its centre is the card centre', () => {
    const halves = [...markup.matchAll(/flex:1 1 0/g)].map((m) => m.index)
    expect(halves).toHaveLength(2)

    const level = markup.indexOf(i18n.t('feed:taskCard.levelCaption'))
    const cog = markup.indexOf(COG)
    const points = markup.indexOf(`>${POINTS}<`)

    // half ─ LEVEL … cog … half ─ POINTS
    expect(halves[0]).toBeLessThan(level)
    expect(level).toBeLessThan(cog)
    expect(cog).toBeLessThan(halves[1]!)
    expect(halves[1]!).toBeLessThan(points)
  })

  it('agrees with the centreline the poster rays already fan from', () => {
    // #1965 pins the HORIZONTAL `50%`; rays live in `.em-burst` (#2393).
    expect(markup, 'the card still mounts the burst').toContain('class="em-burst"')
    const css = readIndexCss()
    expect(css).toContain('repeating-conic-gradient(from 0deg at 50% 50%')
  })
})
