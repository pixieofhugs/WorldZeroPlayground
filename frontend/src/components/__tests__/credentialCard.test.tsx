/**
 * CredentialCard skin contract (#271). One structure, color + font only:
 * a faction with card tokens skins via --faction-<slug>-card-*; everything else
 * (na, factionless) falls to the neutral field treatment with no faction pill.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import CredentialCard from '../CredentialCard'

describe('CredentialCard', () => {
  it('skins to the faction token set and shows the faction pill', () => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="Marlow Quill" handle="marlowquill" bio="x" factionSlug="coven" level={3} score={42} />,
    )
    expect(html).toContain('--faction-coven-card-bg')
    expect(html).toContain('Marlow Quill')
    expect(html).toContain('@marlowquill')
    expect(html).toContain('Warriors of Whimsy') // faction pill label
    expect(html).toContain('42')
  })

  it('renders the neutral UNAFFILIATED treatment for na (not aliased to ua)', () => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="Wren" handle="wren" factionSlug="na" level={1} score={0} />,
    )
    expect(html).toContain('--color-bg-surface-alt')
    expect(html).not.toContain('--faction-ua-card-bg')
    expect(html).toContain('unaffiliated')
    expect(html).toContain('faction to be chosen')
  })

  it('falls back to "Wanderer" when the name is blank', () => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="   " handle="wanderer" factionSlug={null} level={1} score={0} />,
    )
    expect(html).toContain('Wanderer')
  })
})
