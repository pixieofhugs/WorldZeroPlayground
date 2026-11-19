/**
 * Faction marks stay tokenised (ADR-0049): a mark vendored with the design's
 * hexes can't follow dark mode. Both inline SVG and masked asset are checked.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Lotus, Enso } from '..'

describe('faction marks', () => {
  it('Lotus paints from the colour it is given', () => {
    const html = renderToStaticMarkup(<Lotus color="var(--faction-ua-card-accent)" />)
    expect(html).toContain('var(--faction-ua-card-accent)')
  })

  it('Lotus defaults to currentColor so it inherits the surrounding ink', () => {
    expect(renderToStaticMarkup(<Lotus />)).toContain('currentColor')
  })

  it('Enso masks the static asset and takes its colour from the token', () => {
    const html = renderToStaticMarkup(<Enso color="var(--faction-ua-card-accent)" size={138} />)
    expect(html).toContain('/factionMarks/enso.webp')
    expect(html).toContain('background-color:var(--faction-ua-card-accent)')
  })
})
