/**
 * The Everymen bill's hero cog sits on the card's centreline (#1965).
 *
 * The bill has three things that claim the same vertical axis: the pair of cogs
 * on the masthead, the point the poster rays fan out from, and the small cog
 * struck on the dashed rule between LEVEL and the points seal. The first two are
 * anchored to the card — the masthead centres its cogs in a symmetrically padded
 * band, and the rays converge at `50%` of the sheet. The third was anchored to
 * the RULE, which starts after the LEVEL block and stops before the seal, so its
 * midpoint sat `(levelWidth − sealWidth) / 2` ≈ 20px LEFT of the other two.
 *
 * The fix is structural, not a nudge: LEVEL and the seal live in two equal
 * (`flex:1 1 0`) halves with the cog between them, so the cog IS the row's
 * midpoint and the row is the body's full width. This repo has no jsdom, so
 * nothing here can measure a box; what it pins is that shape — two equal halves
 * with LEVEL inside the first, the points figure inside the second, and the cog
 * between them. Put the cog back inside a single stretched middle block and the
 * halves disappear and this goes red.
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

/** The red cog on the rule. The masthead pair is `currentColor`, so this is it. */
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
    // What #1965 pinned is the HORIZONTAL axis — `50%` of the sheet. #2034 moved
    // the burst's vertical convergence from the upper third to the centre, which
    // leaves that axis exactly where it was; this asserts the `50%` that matters
    // rather than the pair, so the two changes cannot be confused for each other.
    //
    // The rays moved to `.em-burst` in index.css in #2393 (one drawing per
    // faction), so the axis is read from the stylesheet — the card's job here
    // is only to mount it.
    expect(markup, 'the card still mounts the burst').toContain('class="em-burst"')
    const css = readIndexCss()
    expect(css).toContain('repeating-conic-gradient(from 0deg at 50% 50%')
  })
})
