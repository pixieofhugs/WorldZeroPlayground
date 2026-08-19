/**
 * The Ephemerists' feed CHASSIS (#1199, epic #1192).
 *
 * The shared `factionFeedFrame` test already loops every faction and asserts the
 * four chrome slots survive dispatch; it is a SHARED registry and this file adds
 * nothing to it. What is guarded here is what only this skin can get wrong:
 *
 *  - the plate ground, not the retired illuminated-codex one (`--eph-*`), which
 *    `ephemeristsPlate` forbids mixing onto the same surface (ADR-0055);
 *  - the archive slot placed and never rebuilt — including the `null` case,
 *    where a disabled stand-in must not appear (`awaiting_submission`);
 *  - no raw hex, in a file whose whole job is colour.
 *
 * Static markup only (no DOM), the repo's frontend-test convention:
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
    // `awaiting_submission` is state, not an event: the backend refuses to
    // archive it, so the slot arrives `null` and a disabled control must not be
    // invented to fill the gap.
    const html = frame({ archive: null })
    expect(html).not.toContain('disabled')
    expect(html).not.toContain('✕')
    // The rest of the band is unaffected.
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
    // A dark-mode ternary cannot exist if there is no literal to switch between.
    expect(frame()).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('reuses the kit ornament rather than drawing new marks', () => {
    const html = frame()
    // The kite sigil (#1635). The band's mark was the winged sun disc until
    // #1634 retired it kit-wide; this row was its last caller anywhere, so the
    // disc's own `plate-disc` medallion fill must not survive here.
    // The kite's opening move. Redrawn brushed by Sigil Studies v2 — six fills
    // on a square 100-unit box, where #1635's was a stroked diamond on 486x560.
    expect(html).toContain('M19.1 30.8')
    expect(html).not.toContain('--faction-ephemerists-plate-disc')
  })

  it('carries no glyph register — this band has no masthead to hang one on', () => {
    // An incised register (`epg-glyph`) ran along the foot of the band until
    // #2210. It was the OLD vocabulary: #2143 gave the masthead the notation
    // band and left this one standing, so the faction wore two at once. The
    // register retires and NOTHING replaces it here — the notation band is the
    // masthead's last line, and this frame places its four chrome slots by
    // hand rather than mounting `EphemeristsMasthead`.
    const html = frame()
    expect(html, 'the retired incised register').not.toContain('epg-glyph')
    expect(html, 'a band mounted where there is no lockup').not.toContain('3px double')
    // What still rules the band's head is its own hairline.
    expect(html).toContain('stroke-width="0.6"')
  })

  it('takes the sigil at the REDUCED cut, since the band is 10-14px tall', () => {
    // Both band heights sit under #1635's 20px threshold, so the mark drops its
    // crossed axes and vertex discs rather than drawing them at half a pixel.
    expect(frame()).not.toContain('M100 272 L392 272')
  })

  it('keeps its ornament stacking inside the card', () => {
    // A positioned ornament at a z-index above 0 orders against the nearest
    // stacking context; without `isolation` that is whatever the feed column
    // established, which is how an ornament lands over unrelated copy (§5).
    expect(frame()).toContain('isolation:isolate')
  })
})

/**
 * SEAM: the masthead band's own inline style declaration, read back out of the
 * rendered markup.
 *
 * #2100. This band carried the ONE numeric masthead height across all nine feed
 * frames (30px desktop / 26px mobile) under `overflow: hidden`, so it clipped
 * anything taller than itself — visually AND for hit-testing, by any mechanism.
 * That held `FeedArchiveButton`, a control shared by all nine chassis, down to
 * a 24px target where §6 makes 44x44 non-negotiable.
 *
 * The fix is structural rather than a bigger number: the band declares no
 * height at all and sizes to its tallest child, which is how the other eight
 * frames get this right for free. So what is asserted is the ABSENCE of a
 * height on that box. A test pinned to `44px` would be the same magic number
 * in a second place, and would go green again the day a control needs 46.
 *
 * There is no DOM here (`renderToStaticMarkup`), so nothing can be MEASURED.
 * What is checkable is that the band declares no height and that the control it
 * holds declares a 44px minimum — together, the whole of the fix.
 */
function styleOf(html: string, pattern: RegExp): string {
  const match = new RegExp(`style="([^"]*${pattern.source}[^"]*)"`).exec(html)
  if (!match) throw new Error(`no element whose style matches ${pattern}`)
  return match[1]
}

/** The masthead: the box that paints the night ground. */
const BAND = /background:var\(--faction-ephemerists-plate-band\)/

describe('EphemeristsFeedFrame — the masthead sizes to its contents (#2100)', () => {
  it('declares NO height on the band, so nothing placed in it can be clipped', () => {
    // The defect, exactly: `height: 30` / `height: 26` on this box.
    expect(styleOf(frame(), BAND)).not.toMatch(/(^|;)height:/)
  })

  it('pins no height on the chrome row inside it either', () => {
    // The row carried `height: 100%` to fill the fixed band. Against an
    // intrinsic parent that is at best inert, and it is the second place the
    // ceiling would come back.
    const row = styleOf(frame(), /padding:var\(--space-xs\) var\(--space-md\)/)
    expect(row).not.toMatch(/(^|;)height:/)
  })

  it('holds the REAL 44px control, with no number left that could refuse it', () => {
    const html = frame({ archive: <FeedArchiveButton onAct={() => {}} /> })
    expect(html).toContain('min-width:44px')
    expect(html).toContain('min-height:44px')
    expect(styleOf(html, BAND)).not.toMatch(/(^|;)height:/)
  })

  it("keeps the head hairline on the ornament's OWN box, not on the band's", () => {
    // The SVG viewBox used to track the band's height. `slice` crops rather
    // than erroring, so a viewBox reading a height that no longer exists looks
    // like a design choice instead of a bug (#2100, consequence 4). The
    // ornament keeps its own constant, and the element height and the viewBox
    // height must stay equal or the hairline scales and loses its inset.
    const html = frame()
    expect(html).toContain('height="30"')
    expect(html).toContain('viewBox="0 0 452 30"')
    expect(html).toContain('stroke-width="0.6"')
  })
})
