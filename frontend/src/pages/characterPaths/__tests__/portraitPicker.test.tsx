/**
 * PortraitPicker (#1149). A native file input reports on `input.files`, which
 * `useAvatarPicker` clears on purpose, so it said "No file chosen" over a picked
 * portrait. Static markup per state only; the pick → crop transition is driven
 * by the state it produces.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
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
    // An inline global tier is unreachable by a faction frame; `--label-ink` is the seam.
    const { html } = render(<PortraitPicker onChange={() => {}} chosenFile={null} />)
    expect(html, 'the readout reads the seam').toContain('var(--label-ink)')
    expect(html, 'and states no global text tier of its own').not.toMatch(/--color-text-/)
  })

  it('lets a surface override that ink without the seam getting in the way', () => {
    // Faction archetypes pass their own ground-measured ink.
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
