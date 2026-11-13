/**
 * The ensō score mark (#1147). No layout here, so non-overlap is visual QA;
 * this pins the structural causes: one implementation (the stamp once had a
 * copy), and a numeral that isn't line-box-cropped and fits the ring.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import '../../../i18n'
import { UaEnsoScore } from '../uaAtoms'
import UaScoreStamp from '../../praxisCard/scoreStamp/UaScoreStamp'
import type { PraxisCardOut } from '../../../api/praxis'

const STAMP_RING = 138

/** The numeral's fitted px ceiling from its `min()`. */
function fittedPx(markup: string): number {
  const match = /font-size:min\([^,]+,\s*([\d.]+)px\)/.exec(markup)
  if (!match) throw new Error(`no fitted numeral in: ${markup}`)
  return Number(match[1])
}

function praxis(score: number): PraxisCardOut {
  return {
    task_point_value: score,
    display_multiplier: 1,
    metatask_points: 0,
    points_from_votes: 0,
    score,
  } as PraxisCardOut
}

describe('the ensō numeral and its caption', () => {
  it('gives the numeral its whole line box and a scale gap under it', () => {
    const html = renderToStaticMarkup(
      <UaEnsoScore size={STAMP_RING} value="15.0" unit="points" />,
    )
    expect(html).not.toMatch(/line-height:0?\.\d/)
    expect(html).toContain('gap:var(--space-xs)')
    expect(html).toContain('points')
  })

  it('shrinks the numeral only once it would leave the ring', () => {
    const short = renderToStaticMarkup(<UaEnsoScore size={STAMP_RING} value="7" unit="points" />)
    const today = renderToStaticMarkup(<UaEnsoScore size={STAMP_RING} value="15.0" unit="points" />)
    const wide = renderToStaticMarkup(<UaEnsoScore size={STAMP_RING} value="1500.0" unit="points" />)

    expect(fittedPx(short)).toBeGreaterThan(100)
    // Owner: today's four-glyph total keeps the design's 38px.
    expect(fittedPx(today)).toBeGreaterThan(36)
    expect(fittedPx(wide)).toBeLessThan(fittedPx(today))
    expect(fittedPx(wide)).toBeGreaterThan(20)
    expect(wide).toContain('points')
  })

  it('keeps the caption on one line however wide the numeral gets', () => {
    const html = renderToStaticMarkup(
      <UaEnsoScore size={84} value="1500.0" unit="points" />,
    )
    expect(html).toContain('white-space:nowrap')
  })
})

describe('the praxis stamp draws the same ring as every other UA surface', () => {
  it('renders its total through UaEnsoScore rather than a second copy', () => {
    const stamp = renderToStaticMarkup(<UaScoreStamp praxis={praxis(15)} />)
    const atom = renderToStaticMarkup(
      <UaEnsoScore
        size={STAMP_RING}
        // A whole score prints whole (#1866).
        value="15"
        unit="points"
        ringColor="var(--faction-ua-card-enso)"
        valueColor="var(--faction-ua-card-total)"
        unitColor="var(--faction-ua-card-points)"
        valueSize="var(--text-display)"
      />,
    )
    expect(stamp).toContain(atom)
  })

  it('fits a four-digit total inside the ring it is struck in', () => {
    const wide = renderToStaticMarkup(<UaScoreStamp praxis={praxis(1500)} />)
    const narrow = renderToStaticMarkup(<UaScoreStamp praxis={praxis(15)} />)
    expect(fittedPx(wide)).toBeLessThan(36)
    expect(fittedPx(wide)).toBeLessThan(fittedPx(narrow))
    expect(wide.replace(/<[^>]*>/g, '')).toContain('points')
  })
})
