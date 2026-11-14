/**
 * Ephemerists feed chassis (#1199). Guards only what this skin can get wrong:
 * the plate ground, never the retired codex `--eph-*` one (ADR-0055); the
 * archive slot placed, with no stand-in for `null`; no raw hex.
 * `useFormFactor` answers its SSR default, `desktop`.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import EphemeristsFeedFrame from '../EphemeristsFeedFrame'
import FeedArchiveButton from '../FeedArchiveButton'
import '../../../i18n'

function frame({
  tag = null,
  archive = <button type="button">archive-node</button>,
}: {
  tag?: string | null
  archive?: React.ReactNode
} = {}): string {
  return renderToStaticMarkup(
    <EphemeristsFeedFrame
      kicker="Task completed"
      time="2h ago"
      tag={tag}
      archive={archive}
    >
      <span>card-body</span>
    </EphemeristsFeedFrame>,
  )
}

describe('EphemeristsFeedFrame — the four chrome slots', () => {
  it('draws kicker, tag, time and the archive node, and keeps the payload', () => {
    const html = frame({ tag: 'Still waiting' })
    expect(html).toContain('Task completed')
    expect(html).toContain('Still waiting')
    expect(html).toContain('2h ago')
    expect(html).toContain('archive-node')
    expect(html).toContain('<span>card-body</span>')
  })

  it('draws NO stand-in when the card offers no archive control', () => {
    // `awaiting_submission`: the slot arrives `null`.
    const html = frame({ archive: null })
    expect(html).not.toContain('disabled')
    expect(html).not.toContain('✕')
    expect(html).toContain('Task completed')
    expect(html).toContain('2h ago')
  })

  it('omits the tag entirely when there is none', () => {
    expect(frame({ tag: null })).not.toContain('Still waiting')
  })
})

describe('EphemeristsFeedFrame — the Valley plate ground', () => {
  it('paints on the plate tokens: papyrus, night band, brass, ochre', () => {
    const html = frame()
    for (const token of [
      '--faction-ephemerists-plate-bg',
      '--faction-ephemerists-plate-band)',
      '--faction-ephemerists-plate-band-ink',
      '--faction-ephemerists-plate-band-quiet',
      '--faction-ephemerists-plate-brass',
      '--faction-ephemerists-plate-ochre',
    ]) {
      expect(html, `carries ${token}`).toContain(token)
    }
  })

  it('carries no illuminated-codex atom — the two grounds never mix (ADR-0055)', () => {
    expect(frame()).not.toContain('--eph-')
  })

  it('names no colour in hex', () => {
    expect(frame()).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('reuses the kit ornament rather than drawing new marks', () => {
    const html = frame()
    // The kite sigil (#1635, redrawn by Sigil Studies v2); the retired sun
    // disc's `plate-disc` fill must not survive.
    expect(html).toContain('M19.1 30.8')
    expect(html).not.toContain('--faction-ephemerists-plate-disc')
  })

  it('carries no glyph register — this band has no masthead to hang one on', () => {
    // The incised register retired in #2210; this frame doesn't mount
    // `EphemeristsMasthead`, so no notation band replaces it.
    const html = frame()
    expect(html, 'the retired incised register').not.toContain('epg-glyph')
    expect(html, 'a band mounted where there is no lockup').not.toContain('3px double')
    expect(html).toContain('stroke-width="0.6"')
  })

  it('takes the sigil at the REDUCED cut, since the MARK is 10-14px tall', () => {
    // Both heights are under #1635's 20px threshold: the reduced cut.
    expect(frame()).not.toContain('M100 272 L392 272')
  })

  it('keeps its ornament stacking inside the card', () => {
    // Without `isolation` a positioned ornament orders against the feed column (§5).
    expect(frame()).toContain('isolation:isolate')
  })
})

/**
 * #2100: the band's fixed height under `overflow: hidden` clipped the shared
 * ✕ to a 24px target (§6 requires 44). The fix is structural — no height, size
 * to content — so the ABSENCE of a height is asserted, not a number.
 */
function styleOf(html: string, pattern: RegExp): string {
  const match = new RegExp(`style="([^"]*${pattern.source}[^"]*)"`).exec(html)
  if (!match) throw new Error(`no element whose style matches ${pattern}`)
  return match[1]
}

const BAND = /background:var\(--faction-ephemerists-plate-band\)/

describe('EphemeristsFeedFrame — the masthead sizes to its contents (#2100)', () => {
  it('declares NO height on the band, so nothing placed in it can be clipped', () => {
    expect(styleOf(frame(), BAND)).not.toMatch(/(^|;)height:/)
  })

  it('pins no height on the chrome row inside it either', () => {
    // A `height: 100%` here is where the ceiling would come back.
    const row = styleOf(frame(), /padding:var\(--feed-bar-pad\)/)
    expect(row).not.toMatch(/(^|;)height:/)
  })

  it('holds the REAL 44px control, with no number left that could refuse it', () => {
    const html = frame({ archive: <FeedArchiveButton onAct={() => {}} /> })
    expect(html).toContain('min-width:44px')
    expect(html).toContain('min-height:44px')
    expect(styleOf(html, BAND)).not.toMatch(/(^|;)height:/)
  })

  it("keeps the head hairline on the ornament's OWN box, not on the band's", () => {
    // `slice` crops silently, so viewBox height must equal element height
    // (#2100) or the hairline scales and loses its inset.
    const html = frame()
    expect(html).toContain('height="30"')
    expect(html).toContain('viewBox="0 0 452 30"')
    expect(html).toContain('stroke-width="0.6"')
  })
})
