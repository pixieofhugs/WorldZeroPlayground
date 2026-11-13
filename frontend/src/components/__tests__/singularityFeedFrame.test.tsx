/**
 * Singularity feed chassis (#1202). Singularity-specific decisions only; the
 * shared chrome slots are `factionFeedFrame.test.tsx`'s.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../i18n'
import { factionName } from '../../utils/factions'
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
    // #1243 §10: one aria-hidden strip could not hold the dismiss control.
    const html = frame()
    // The title is `factionName()`; CSS uppercases it (#1910).
    expect(html).toMatch(
      new RegExp(`<span aria-hidden="true"[^>]*>${factionName('singularity')}<`),
    )
    expect(html).toMatch(/<span aria-hidden="true"[^>]*>0x[0-9A-F]{4}</)
  })

  it('places the archive node outside every aria-hidden subtree', () => {
    // The ✕ is the only keyboard/screen-reader archive route.
    const html = frame()
    const before = html.slice(0, html.indexOf('archive-node'))
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
    // Shared copy (epic #1192): the costume may not alter a translator's word.
    const html = frame({ tag: 'Still waiting' })
    expect(html).toContain('Still waiting')
    expect(html).toContain('text-transform:lowercase')
  })
})

describe('SingularityFeedFrame — the process handle identifies a KIND, not an item', () => {
  it('is stable while the relative time ticks over', () => {
    // Derived from the kicker alone.
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
    // Always near-black, so the global light-theme inks would land at ~1:1.
    const html = frame()
    expect(html).toContain('--color-text-primary:var(--faction-singularity-term-bright)')
    expect(html).toContain('--color-danger:var(--faction-singularity-card-notice)')
  })

  it('carries no hardcoded colour and no theme ternary', () => {
    const html = frame()
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
