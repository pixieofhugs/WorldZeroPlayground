/**
 * #1273: the drop-to-accept modal escapes the feed card. The cards' own
 * `position: fixed` overlays resolved to the card because `.sidebar-card`'s
 * `backdrop-filter` makes a containing block (and frames clip with
 * `overflow: hidden`). Now one `FeedBankFullModal` portals to `document.body`.
 *
 * Static markup can't prove viewport coverage, Escape or focus (hand-verified);
 * it proves the structure and the dialog naming, which the portal makes
 * load-bearing.
 */
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import FeedBankFullModal from '../FeedBankFullModal'

const source = (file: string) =>
  readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

describe('the drop-to-accept overlay is not part of the card', () => {
  it.each(['FeedCardCollabInvite.tsx', 'FeedCardDuelChallenge.tsx'])(
    '%s renders no fixed overlay of its own',
    (file) => {
      const text = source(file)
      expect(text).not.toContain('position: "fixed"')
      expect(text).toContain('<FeedBankFullModal')
    },
  )

  it('the shared modal mounts on document.body', () => {
    const text = source('FeedBankFullModal.tsx')
    expect(text).toContain('createPortal')
    expect(text).toContain('document.body')
  })
})

describe('FeedBankFullModal dialog contract', () => {
  const markup = (overrides?: { error?: string }) =>
    renderToStaticMarkup(
      <FeedBankFullModal
        title="Task bank full"
        body="You have 20 in-progress tasks. Drop one to accept this collaboration:"
        cancelLabel="Cancel"
        options={[
          { id: 7, label: 'Drop: Sweep the stoop', onSelect: () => {} },
          { id: 9, label: 'Drop: Mend the fence', onSelect: () => {} },
        ]}
        busy={false}
        error={overrides?.error ?? ''}
        onDismiss={() => {}}
      />,
    )

  it('is a named modal dialog', () => {
    const html = markup()
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    const labelledBy = /aria-labelledby="([^"]+)"/.exec(html)?.[1]
    expect(labelledBy, 'the dialog names itself').toBeTruthy()
    expect(html).toContain(`id="${labelledBy}"`)
    expect(html).toContain('Task bank full')
  })

  it('offers one drop per in-progress praxis, plus a way out', () => {
    const html = markup()
    expect(html).toContain('Drop: Sweep the stoop')
    expect(html).toContain('Drop: Mend the fence')
    expect(html).toContain('Cancel')
  })

  it('surfaces a failed drop', () => {
    expect(markup({ error: 'Could not drop that task. Try again.' })).toContain(
      'Could not drop that task. Try again.',
    )
  })
})
