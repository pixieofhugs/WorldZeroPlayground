/**
 * Faction marks stay tokenised (ADR-0049). The failure this guards against is
 * cheap to reintroduce and invisible in review: a mark vendored straight from
 * the design bundle carries the prototype's hexes, which dark mode then cannot
 * reach. Both mechanisms — inline SVG and the masked asset — must paint from the
 * colour they are handed.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Lotus, Enso } from '..'

const HEX = /#[0-9a-fA-F]{3,8}\b/

describe('faction marks', () => {
  it('Lotus paints from the colour it is given and ships no hex', () => {
    const html = renderToStaticMarkup(<Lotus color="var(--faction-ua-card-accent)" />)
    expect(html).toContain('var(--faction-ua-card-accent)')
    expect(html).not.toMatch(HEX)
  })

  it('Lotus defaults to currentColor so it inherits the surrounding ink', () => {
    expect(renderToStaticMarkup(<Lotus />)).toContain('currentColor')
  })

  it('Enso masks the static asset and takes its colour from the token', () => {
    const html = renderToStaticMarkup(<Enso color="var(--faction-ua-card-accent)" size={138} />)
    expect(html).toContain('/factionMarks/enso.webp')
    expect(html).toContain('background-color:var(--faction-ua-card-accent)')
    expect(html).not.toMatch(HEX)
  })
})
