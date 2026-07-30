/**
 * #1273 — the drop-to-accept modal escapes the feed card.
 *
 * THE BUG. `FeedCardCollabInvite` and `FeedCardDuelChallenge` each rendered a
 * `position: fixed; inset: 0` overlay as their own child. That is written to
 * cover the viewport and it never did: the feed chassis is `.sidebar-card`,
 * which sets `backdrop-filter`, and a `backdrop-filter` other than `none`
 * establishes a containing block for `position: fixed` descendants exactly as
 * `transform` does. So `inset: 0` resolved to the ~120px card. Seven of the
 * nine faction frames additionally clip their ornament with `overflow: hidden`,
 * which turned "mispositioned" into "unusable".
 *
 * THE SEAM UNDER TEST. The overlay is no longer part of either card's own
 * markup — it is one component, `FeedBankFullModal`, mounted through
 * `createPortal(…, document.body)`, which escapes both the containing block and
 * every ancestor's `overflow`.
 *
 * WHAT THIS HARNESS CAN AND CANNOT PROVE. `renderToStaticMarkup` in the `node`
 * environment has no DOM, no layout and no effects. So:
 *   - it CANNOT prove the overlay now covers the viewport, that it is unclipped
 *     on the seven bespoke frames, or that Escape / focus-on-open work. Those
 *     are visual and behavioural and are hand-verified;
 *   - it CAN prove the structural facts the fix consists of, and those are what
 *     is asserted here: neither card file still owns a `position: "fixed"`
 *     block, both route through the shared modal, and that modal reaches
 *     `document.body`;
 *   - it CAN prove the dialog contract that the move to `document.body` makes
 *     load-bearing. Appended at the end of `body`, an unlabelled div is a blob
 *     with no name and no role, so the accessible name/description wiring is
 *     asserted statically the way `ConfirmDialog`'s is.
 */
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import FeedBankFullModal from '../FeedBankFullModal'

const source = (file: string) =>
  readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

describe('the drop-to-accept overlay is not part of the card', () => {
  // The two victims, and the exact string that was the bug.
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
    // The accessible name must point at a heading that actually renders.
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
