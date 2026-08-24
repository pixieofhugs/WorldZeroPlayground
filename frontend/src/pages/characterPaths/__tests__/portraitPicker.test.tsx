/**
 * PortraitPicker — the character screens' photo control (#1149).
 *
 * The bug was a naked `<input type="file">`: its browser chrome reports on
 * `input.files`, which `useAvatarPicker.handleAvatarChange` clears on purpose, so
 * it said "No file chosen" over a portrait that was already picked — and told a
 * screen reader the same thing.
 *
 * WHAT THESE TESTS COVER: the rendered markup for each state — which is exactly
 * the surface that was wrong. The visible readout, the button's label, the
 * `aria-describedby` → status wiring, and the fact that the native input is
 * hidden (out of the page and out of the accessibility tree, taking its stale
 * label with it).
 *
 * WHAT THEY CANNOT COVER: the act of choosing. There is no jsdom in this repo
 * (renderToStaticMarkup only) and no way to dispatch a file-selection event or
 * run the crop modal, so the transition itself — pick → crop → confirm → readout
 * updates — is only verified by driving the component with the state that
 * transition produces. The `role="status"` announcement likewise needs a real AT
 * to observe.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so the copy keys resolve to English text.
import '../../../i18n'
import PortraitPicker from '../PortraitPicker'

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(element)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

const chosen = new File(['x'], 'blossom-in-the-rain.jpg', { type: 'image/jpeg' })

describe('PortraitPicker — the readout agrees with the state, not with input.files', () => {
  it('names the chosen file once a crop is confirmed', () => {
    const { text } = render(<PortraitPicker onChange={() => {}} chosenFile={chosen} />)
    expect(text, 'the filename is on screen').toContain('blossom-in-the-rain.jpg')
    // The whole point of the issue: nothing anywhere claims no file was chosen.
    expect(text.toLowerCase(), 'no stale "no file chosen"').not.toContain('no photo chosen')
    expect(text, 'the action reads as a replacement now').toContain('Change photo')
  })

  it('says so plainly when nothing has been chosen', () => {
    const { text } = render(<PortraitPicker onChange={() => {}} chosenFile={null} />)
    expect(text).toContain('No photo chosen yet')
    expect(text).toContain('Choose a photo')
  })

  it('reads a saved portrait as kept, not as missing (the edit screen)', () => {
    const { text } = render(
      <PortraitPicker onChange={() => {}} chosenFile={null} hasCurrentPortrait />,
    )
    expect(text, 'not "none chosen" — there IS one').toContain('Keeping your current photo')
    expect(text).not.toContain('No photo chosen yet')
    expect(text).toContain('Change photo')
  })

  it('hides the native input, so its stale label cannot render', () => {
    const { html } = render(<PortraitPicker onChange={() => {}} chosenFile={chosen} />)
    expect(html, 'there is still a real file input to drive').toContain('type="file"')
    expect(html, 'but it is display:none — no browser chrome, no a11y node').toMatch(
      /type="file"[^>]*style="display:none"|style="display:none"[^>]*type="file"/,
    )
  })

  it('wires the button to the status line, so the accessible description carries the state', () => {
    const { html } = render(<PortraitPicker onChange={() => {}} chosenFile={chosen} />)
    const described = /aria-describedby="([^"]+)"/.exec(html)?.[1]
    const statusId = /id="([^"]+)"[^>]*role="status"/.exec(html)?.[1]
    expect(described, 'the button points at a description').toBeTruthy()
    expect(statusId, 'the status line has an id to point at').toBeTruthy()
    expect(described).toBe(statusId)
  })

  it('inks the status line through the label seam, so a faction frame can reach it (#2489)', () => {
    // The default used to be `--color-text-secondary` stated inline, which is a
    // real token at the wrong TIER on the eight faction plates this control is
    // mounted on, and — being inline — the one thing a frame cannot reach past.
    // `--label-ink` is the seam the house already has: unset to the neutral
    // tier, repointed by any root that dresses it. Nothing is minted.
    const { html } = render(<PortraitPicker onChange={() => {}} chosenFile={null} />)
    expect(html, 'the readout reads the seam').toContain('var(--label-ink)')
    expect(html, 'and states no global text tier of its own').not.toMatch(/--color-text-/)
  })

  it('lets a surface override that ink without the seam getting in the way', () => {
    // The other half: the seven faction archetypes each pass their own FACE and
    // their own ground-measured ink, which is not the same decision as the
    // default and is not removable. A caller that passes one still wins.
    const { html } = render(
      <PortraitPicker
        onChange={() => {}}
        chosenFile={null}
        statusStyle={{ color: 'var(--faction-ua-card-body)' }}
      />,
    )
    expect(html).toContain('var(--faction-ua-card-body)')
  })

  it('carries an avatar-scoped error under the row', () => {
    const { text } = render(
      <PortraitPicker onChange={() => {}} chosenFile={null} error="Portrait must be under 10 MB." />,
    )
    expect(text).toContain('Portrait must be under 10 MB.')
  })
})
