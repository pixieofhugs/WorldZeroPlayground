/**
 * S.N.I.D.E. feed chassis (#1198): only this skin's checks; the shared
 * `factionFeedFrame.test.tsx` covers the four slots for all frames.
 * `useFormFactor` reads desktop under static markup.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import SnideFeedFrame from '../SnideFeedFrame'

function frame({
  tag = null,
  archive = <button type="button">archive-node</button>,
}: {
  tag?: string | null
  archive?: React.ReactNode
} = {}): string {
  return renderToStaticMarkup(
    <SnideFeedFrame kicker="Duel challenge" time="2h ago" tag={tag} archive={archive}>
      <span>card-body</span>
    </SnideFeedFrame>,
  )
}

describe('SnideFeedFrame — the four chrome slots', () => {
  it('draws kicker, time, tag and the archive node, and keeps the body intact', () => {
    const html = frame({ tag: 'Still waiting' })
    expect(html).toContain('Duel challenge')
    expect(html).toContain('2h ago')
    expect(html).toContain('Still waiting')
    expect(html).toContain('archive-node')
    expect(html).toContain('<span>card-body</span>')
  })

  it('drops the tag chip when the tag is null, and nothing else', () => {
    const html = frame()
    expect(html).toContain('Duel challenge')
    expect(html).toContain('2h ago')
    expect(html).toContain('archive-node')
  })

  it('renders no archive affordance at all when the item offers none', () => {
    // `awaiting_submission`: no stand-in, so the WORD is absent too.
    const html = frame({ archive: null })
    expect(html).not.toContain('archive-node')
    expect(html).not.toContain('disabled')
    expect(html).toContain('Duel challenge')
    expect(html).toContain('2h ago')
  })
})

describe('SnideFeedFrame — the stock flips, and acid stays a drawn thing', () => {
  it('paints the FLIPPING slip stock, never the theme-invariant press paper', () => {
    // §3 (#1118): the body's global inks flip, so the stock must.
    const html = frame()
    expect(html).toContain('--faction-snide-slip-paper')
    expect(html).toContain('--faction-snide-slip-ink')
    expect(html).not.toContain('background:var(--faction-snide-paper)')
  })

  it('tints the archive node by setting a colour on the bar it sits in', () => {
    // `currentColor` ✕: the bar's colour is how it reads paper-white.
    expect(frame()).toContain('--faction-snide-slip-bar')
    expect(frame()).toContain('color:var(--faction-snide-paper)')
  })

  it('reads acid only where it is DRAWN, never as the kicker ink (#1224)', () => {
    // Bright acid is 1.35:1 as type on light; drawn only.
    const html = frame({ tag: 'Still waiting' })
    expect(html).toContain('--faction-snide-acid')
    expect(html).not.toContain('--faction-snide-slip-acid-ink')
  })

  it('prints no faction name (epic decision 5 — the skin is the identification)', () => {
    // Text nodes only: token names carry the slug by necessity.
    const text = frame({ tag: 'Still waiting' })
      .replace(/<[^>]*>/g, ' ')
      .toLowerCase()
    expect(text).not.toContain('snide')
    expect(text).not.toContain('s.n.i.d.e')
    expect(text).toContain('duel challenge')
    expect(text).toContain('still waiting')
  })
})
