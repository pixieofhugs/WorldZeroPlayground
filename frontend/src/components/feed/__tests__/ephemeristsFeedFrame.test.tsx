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

  it('reuses the plate ornament rather than drawing new marks', () => {
    const html = frame()
    // The winged disc's medallion (a `plate-disc` fill) and the incised register
    // (`epg-glyph`, whose breathe cycle + reduced-motion gate live in index.css).
    expect(html).toContain('--faction-ephemerists-plate-disc')
    expect(html).toContain('epg-glyph')
  })

  it('keeps its ornament stacking inside the card', () => {
    // A positioned ornament at a z-index above 0 orders against the nearest
    // stacking context; without `isolation` that is whatever the feed column
    // established, which is how an ornament lands over unrelated copy (§5).
    expect(frame()).toContain('isolation:isolate')
  })
})
