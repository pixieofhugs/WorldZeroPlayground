/** #1824 — level nodes use chip geometry and the selected faction's accent. */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import FilterLevelNodes from '../FilterLevelNodes'

const noop = () => {}
const LEVELS = [0, 1, 2, 3]

const render = (value: number | '', factionSlug?: string) =>
  renderToStaticMarkup(
    <FilterLevelNodes levels={LEVELS} value={value} onChange={noop} factionSlug={factionSlug} />,
  )

describe('FilterLevelNodes', () => {
  it('is chip-sized: 40px nodes with a 2px border in every state', () => {
    const markup = render(2, 'ua')
    expect(markup).toContain('width:40px')
    expect(markup).toContain('height:40px')
    expect(markup.match(/border:2px solid/g)).toHaveLength(LEVELS.length)
  })

  it('carries no label of its own — the caller already names the field', () => {
    expect(render('', 'ua')).not.toContain('label-heading')
  })

  it('tints the selected node with the faction', () => {
    const markup = render(2, 'ua')
    expect(markup).toContain('border:2px solid var(--faction-ua)')
    expect(markup).toContain('color-mix(in srgb, var(--faction-ua) 18%, var(--color-bg-surface))')
  })

  it('gives an unaffiliated selection the spectrum, never a grey tint', () => {
    for (const markup of [render(2), render(2, 'na')]) {
      expect(markup).toContain('--faction-default-rainbow')
      expect(markup).not.toContain('var(--faction-default)')
    }
  })

  it('leaves an unselected row entirely neutral', () => {
    const markup = render('', 'ua')
    expect(markup).not.toContain('var(--faction-ua)')
    expect(markup).not.toContain('--faction-default-rainbow')
  })
})
