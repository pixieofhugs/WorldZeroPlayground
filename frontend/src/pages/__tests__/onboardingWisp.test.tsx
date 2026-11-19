import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'

import Wisp, { type WispHat } from '../onboarding/Wisp'
import FactionBuddy from '../onboarding/FactionBuddy'
import { FACTION_RAINBOW_ORDER } from '../../utils/factions'

describe('Wisp', () => {
  it('renders bare with the ink outline, drawn lids and no hat', () => {
    const m = renderToStaticMarkup(<Wisp confidence={0.3} />)
    expect(m).toContain('--conf:0.3')
    expect(m).toContain('class="lids"')
    expect(m).toContain('stroke-width="2.6"')
    expect(m).not.toContain('hatpop')
  })

  it.each<WispHat>(['crown', 'wizard', 'teacup'])('wears the %s on the round head', (hat) => {
    const m = renderToStaticMarkup(<Wisp hat={hat} />)
    expect(m).toContain('hatpop')
    expect(m).toContain(`data-hat="${hat}"`)
    expect(m).not.toContain('C 34 42') // the hair is tucked away
  })

  it('sleeps', () => {
    expect(renderToStaticMarkup(<Wisp sleeping />)).toContain('wsleep')
  })

  it('gives two wisps their own gradient ids', () => {
    const m = renderToStaticMarkup(
      <>
        <Wisp />
        <Wisp />
      </>,
    )
    const ids = [...m.matchAll(/<linearGradient id="(\w+)"/gi)].map((x) => x[1])
    expect(new Set(ids).size).toBe(2)
  })
})

describe('FactionBuddy', () => {
  it.each([...FACTION_RAINBOW_ORDER])('%s has its colour, its own blink and an accessory', (slug) => {
    const m = renderToStaticMarkup(<FactionBuddy slug={slug} blinkPeriod={5.1} blinkOffset={-1.3} />)
    expect(m).toContain(`--c:var(--faction-${slug})`)
    expect(m).toContain('--bk:5.1s')
    expect(m).toContain('--bd:-1.3s')
    expect(m).toMatch(/<svg class="fhat"[^>]*><(path|circle|rect)/)
  })
})
