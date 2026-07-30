/**
 * The ensō score mark (#1147) — one ring, one numeral, one caption.
 *
 * WHAT THIS HARNESS CAN AND CANNOT PROVE. There is no jsdom here and no layout
 * engine, so nothing below proves that two lines stopped overlapping — that is
 * visual QA. What it does pin is the two things that made the overlap possible
 * in the first place, both of which are structural and readable off the markup:
 *
 *   1. ONE IMPLEMENTATION. The ring was drawn twice — `UaEnsoScore` for the task
 *      card / task detail / composer, and a hand-rolled copy inside
 *      `UaScoreStamp`. Two copies is why a fix to one surface was never a fix.
 *   2. THE NUMERAL IS NOT CROPPED, AND IT FITS. The old stack cropped the
 *      numeral's line box (`line-height: .8`) and then parked the caption one
 *      pixel under it, so a figure's ink ran into the word. And the numeral was
 *      a fixed size in a fixed ring, so a four-digit total left the circle
 *      entirely. Both are visible in the emitted style.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import '../../../i18n'
import { UaEnsoScore } from '../uaAtoms'
import UaScoreStamp from '../../praxisCard/scoreStamp/UaScoreStamp'
import type { PraxisCardOut } from '../../../api/praxis'

/** The ring the praxis stamp draws. */
const STAMP_RING = 138

/** Pull the numeral's fitted ceiling, in px, out of its `min()`. */
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
    // The defect's mechanism: a cropped line box with the caption tucked into
    // the crop. Neither may come back.
    expect(html).not.toMatch(/line-height:0?\.\d/)
    expect(html).toContain('gap:var(--space-xs)')
    expect(html).toContain('points')
  })

  it('shrinks the numeral only once it would leave the ring', () => {
    const short = renderToStaticMarkup(<UaEnsoScore size={STAMP_RING} value="7" unit="points" />)
    const today = renderToStaticMarkup(<UaEnsoScore size={STAMP_RING} value="15.0" unit="points" />)
    const wide = renderToStaticMarkup(<UaEnsoScore size={STAMP_RING} value="1500.0" unit="points" />)

    // A one-glyph total is nowhere near the stroke, so the ceiling sits well
    // above the tier's own size and the token wins outright.
    expect(fittedPx(short)).toBeGreaterThan(100)
    // Today's four-glyph total keeps the drawn 38px the design struck. The
    // owner's ruling is that this figure does not shrink, and it does not.
    expect(fittedPx(today)).toBeGreaterThan(36)
    // A four-digit total is 57% wider in glyphs, so the ring takes over.
    expect(fittedPx(wide)).toBeLessThan(fittedPx(today))
    expect(fittedPx(wide)).toBeGreaterThan(20)
    // …and the word is still there, whole. Never dropped, never truncated.
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
        value="15.0"
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
    const stamp = renderToStaticMarkup(<UaScoreStamp praxis={praxis(1500)} />)
    expect(fittedPx(stamp)).toBeLessThan(30)
    expect(stamp.replace(/<[^>]*>/g, '')).toContain('points')
  })
})
