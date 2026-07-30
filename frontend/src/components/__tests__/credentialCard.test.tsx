/**
 * CredentialCard skin contract (#271). One structure, color + font only:
 * a faction with card tokens skins via --faction-<slug>-card-*; everything else
 * (na, factionless) falls to the neutral field treatment with no faction pill.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so the copy keys resolve to English text.
import '../../i18n'
import CredentialCard from '../CredentialCard'

describe('CredentialCard', () => {
  it('skins to the faction token set and shows the faction pill', () => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="Marlow Quill" handle="marlowquill" bio="x" factionSlug="coven" level={3} score={42} />,
    )
    expect(html).toContain('--faction-coven-card-bg')
    expect(html).toContain('Marlow Quill')
    expect(html).toContain('@marlowquill')
    expect(html).toContain('Cozy Coven') // faction pill label
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

/**
 * #1263. The portrait ring is a plain `onClick` button — a second trigger for
 * PortraitPicker's hidden file input — and there is no `onDrop`/`onDragOver`
 * anywhere in the component. Its `title` was "Drag a photo here, or click to
 * upload", and a `title` with no other labelling IS the button's accessible
 * name, so a screen-reader user was handed an instruction the control cannot
 * accept. The ruling was to fix the copy, not to build the drop target.
 */
describe('CredentialCard portrait ring — the label names what the control does', () => {
  const ringOf = (html: string) => /<button[^>]*>/.exec(html)?.[0] ?? ''

  it('gives the upload ring an accessible name describing a click', () => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="Wren" handle="wren" factionSlug="na" level={1} score={0} onAvatarClick={() => {}} />,
    )
    const ring = ringOf(html)
    expect(ring, 'the ring is a real button when it uploads').toBeTruthy()
    expect(ring).toContain('aria-label="Click to upload a photo"')
    expect(ring, 'the tooltip says the same thing').toContain('title="Click to upload a photo"')
  })

  it('promises no drag-and-drop the component cannot honour', () => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="Wren" handle="wren" factionSlug="coven" level={1} score={0} onAvatarClick={() => {}} />,
    )
    expect(html.toLowerCase(), 'no false affordance in any label').not.toContain('drag')
  })

  it('renders no button — and no upload label — when the ring is not an affordance', () => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="Wren" handle="wren" factionSlug="coven" level={1} score={0} />,
    )
    expect(ringOf(html), 'a display-only ring is not a control').toBe('')
    expect(html).not.toContain('upload')
  })
})
