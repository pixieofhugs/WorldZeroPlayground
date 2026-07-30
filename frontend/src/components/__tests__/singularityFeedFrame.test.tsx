/**
 * Singularity feed chassis — the session window (#1202, epic #1192).
 *
 * Scoped to this ONE faction on purpose. `factionFeedFrame.test.tsx` already
 * loops every frame and asserts the four chrome slots survive; restating that
 * row here would be the pattern that has taken `main` red before — eight
 * parallel dress agents each rewriting one shared assertion. These are the
 * decisions specific to the Singularity sheet.
 *
 * Rendered to static markup (no DOM), per the frame-test convention.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so the masthead key resolves to English text.
import '../../i18n'
import SingularityFeedFrame from '../feed/SingularityFeedFrame'

function frame({
  kicker = 'Task completed',
  time = '2h ago',
  tag = null as string | null,
  archive = <button type="button">archive-node</button> as React.ReactNode,
} = {}): string {
  return renderToStaticMarkup(
    <SingularityFeedFrame kicker={kicker} time={time} tag={tag} archive={archive}>
      <span>card-body</span>
    </SingularityFeedFrame>,
  )
}

describe('SingularityFeedFrame — the window bar is ornament, the prompt line is not', () => {
  it('hides the masthead and the process handle from assistive tech individually', () => {
    // #1243 §10: the boot strip used to be `aria-hidden` in ONE piece, which
    // cannot hold the dismiss control. Each ornament carries the attribute now.
    const html = frame()
    expect(html).toMatch(/<span aria-hidden="true"[^>]*>DISPATCH/)
    expect(html).toMatch(/<span aria-hidden="true"[^>]*>0x[0-9A-F]{4}</)
  })

  it('places the archive node outside every aria-hidden subtree', () => {
    // The ✕ is the entire keyboard and screen-reader route to the archive
    // (swipe is touch-only), so an ornament must never contain it.
    const html = frame()
    const before = html.slice(0, html.indexOf('archive-node'))
    // Every aria-hidden element opened before the control is also closed before
    // it: the ornaments are all leaf spans on the bar above.
    const opened = (before.match(/aria-hidden="true"/g) ?? []).length
    const closed = (before.match(/<\/span>/g) ?? []).length
    expect(opened).toBeGreaterThan(0)
    expect(closed).toBeGreaterThanOrEqual(opened)
  })

  it('draws the kicker, the time and the archive on the same functional row', () => {
    const html = frame({ tag: 'Still waiting' })
    expect(html).toContain('Task completed')
    expect(html).toContain('2h ago')
    expect(html).toContain('Still waiting')
    expect(html).toContain('archive-node')
    expect(html).toContain('<span>card-body</span>')
  })

  it('prints the tag verbatim and lowercases it in CSS, never in the string', () => {
    // Copy is neutral and shared (epic #1192). The costume may not mutilate a
    // translator's word, so the transform is `text-transform`, not `.toLowerCase()`.
    const html = frame({ tag: 'Still waiting' })
    expect(html).toContain('Still waiting')
    expect(html).toContain('text-transform:lowercase')
  })
})

describe('SingularityFeedFrame — the process handle identifies a KIND, not an item', () => {
  it('is stable while the relative time ticks over', () => {
    // An identifier that mutates under the reader is a lie the sheet never told,
    // so the handle is derived from the kicker alone.
    const handle = (html: string) => /0x[0-9A-F]{4}/.exec(html)?.[0]
    expect(handle(frame({ time: '2h ago' }))).toBe(handle(frame({ time: '3h ago' })))
  })

  it('differs between two kinds of card', () => {
    const handle = (html: string) => /0x[0-9A-F]{4}/.exec(html)?.[0]
    expect(handle(frame({ kicker: 'Task completed' }))).not.toBe(
      handle(frame({ kicker: 'Duel challenge' })),
    )
  })
})

describe('SingularityFeedFrame — always dark, and the shared body repointed onto it', () => {
  it('repoints the global ink the shared body paints from', () => {
    // Singularity is near-black in BOTH themes while the global `--color-*` set
    // was measured on the app's near-white page, so the body's light-theme halves
    // land at roughly 1:1 here. Dropping this repoint makes the card unreadable
    // in light mode without failing anything else.
    const html = frame()
    expect(html).toContain('--color-text-primary:var(--faction-singularity-term-bright)')
    expect(html).toContain('--color-danger:var(--faction-singularity-card-notice)')
  })

  it('carries no hardcoded colour and no theme ternary', () => {
    // Every colour is a --faction-singularity-* token; the `[data-theme="dark"]`
    // cascade flips the phosphor underneath and the chassis never flips at all.
    const html = frame()
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
