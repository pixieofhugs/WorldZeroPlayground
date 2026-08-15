/**
 * S.N.I.D.E. feed CHASSIS — the intercepted slip (#1198, epic #1192).
 *
 * The shared dispatch guard (`components/__tests__/factionFeedFrame.test.tsx`)
 * already loops every frame and asserts the four chrome slots survive. It is
 * shared by eight parallel dress issues, so nothing SNIDE-specific is added
 * there — a row in a shared registry asserted from eight branches is how `main`
 * has gone red in this repo before. This file holds what is only this skin's.
 *
 * Rendered to static markup (no DOM, per the frontend harness): `useFormFactor`
 * falls to its `getServerSnapshot`, i.e. the desktop reading.
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
    // `awaiting_submission` arrives with `archive === null`: it is state, not an
    // event, and the backend refuses to archive it. A frame must never draw a
    // disabled stand-in — assert the WORD is absent, not merely the node.
    const html = frame({ archive: null })
    expect(html).not.toContain('archive-node')
    expect(html).not.toContain('disabled')
    // The rest of the chrome is unaffected.
    expect(html).toContain('Duel challenge')
    expect(html).toContain('2h ago')
  })
})

describe('SnideFeedFrame — the stock flips, and acid stays a drawn thing', () => {
  it('paints the FLIPPING slip stock, never the theme-invariant press paper', () => {
    // The body is faction-blind payload painted in the app's global inks, which
    // flip; §3 (#1118) therefore requires a stock that flips with them. The
    // invariant `--faction-snide-paper` put #f0e6d0 copy on #f4f1e8 at 1.10:1.
    const html = frame()
    expect(html).toContain('--faction-snide-slip-paper')
    expect(html).toContain('--faction-snide-slip-ink')
    expect(html).not.toContain('background:var(--faction-snide-paper)')
  })

  it('tints the archive node by setting a colour on the bar it sits in', () => {
    // FeedArchiveButton paints in `currentColor`, so the bar's `color` is the
    // whole of how the ✕ reads paper-white on the over-inked band.
    expect(frame()).toContain('--faction-snide-slip-bar')
    expect(frame()).toContain('color:var(--faction-snide-paper)')
  })

  it('reads acid only where it is DRAWN, never as the kicker ink (#1224)', () => {
    // Bright acid measures 1.35:1 as type on the light stock. It appears here as
    // the sprocket stripe, the bar's foot rule and the tag chip's edge — all
    // drawn — and the kicker is type on the near-black bar instead.
    const html = frame({ tag: 'Still waiting' })
    expect(html).toContain('--faction-snide-acid')
    expect(html).not.toContain('--faction-snide-slip-acid-ink')
  })

  it('prints no faction name (epic decision 5 — the skin is the identification)', () => {
    // TEXT nodes only: token names carry the slug by necessity, and a token name
    // is not copy. What must not appear is a visible label.
    const text = frame({ tag: 'Still waiting' })
      .replace(/<[^>]*>/g, ' ')
      .toLowerCase()
    expect(text).not.toContain('snide')
    expect(text).not.toContain('s.n.i.d.e')
    // …and the neutral chrome the catalog authored is all that is left.
    expect(text).toContain('duel challenge')
    expect(text).toContain('still waiting')
  })
})
