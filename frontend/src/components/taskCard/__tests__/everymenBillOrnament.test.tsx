/**
 * The Everymen bill's v3 ornament (#2034, epic #2027).
 *
 * THE SEAM IS THE CARD'S RENDERED OUTPUT — this repo has no jsdom, so nothing
 * here can measure a box. What it can pin is the shape the design asks for and
 * the two things a later edit is most likely to undo by accident:
 *
 * 1. The points seal is the SHARED {@link PointsRoundel}, not a second circle
 *    drawn in the card. Everymen was the one faction where the shared total mark
 *    existed and only one of its two surfaces used it (#2042's survey).
 * 2. The fists-and-lightning flank the CTA and NOTHING ELSE — they are
 *    `aria-hidden`, they carry no hit box, and they live inside the `cta &&`
 *    block, so a card with no sign-up on offer draws no sparks either.
 *
 * The 44px tap floor and the "no two hit boxes overlap" rule are asserted in
 * `taskCardsV3.test.tsx`; what is provable HERE is that the ornament adds no
 * second interactive thing to the row, which is the way this card could break
 * that rule.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'

vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))

import EverymenTaskCard from '../EverymenTaskCard'
import { aTask } from '../../../test/fixtures'

const POINTS = 137
const TASK = aTask({ description: 'Fix the lamp on the corner nobody owns.' })

function render(withSignup = true): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <EverymenTaskCard
        task={TASK}
        basePoints={POINTS}
        multiplier={1}
        inProgressCount={0}
        onSignup={withSignup ? () => {} : undefined}
      />
    </MemoryRouter>,
  )
}

describe('Everymen task card — the stamped points seal (#2034)', () => {
  it('mounts the shared roundel rather than drawing its own circle', () => {
    const html = render()
    // The roundel's own geometry: the double ring on a 0..100 viewBox. A card
    // that went back to a bordered <span> loses this and goes red.
    expect(html).toContain('<svg viewBox="0 0 100 100"')
    expect(html).toContain('r="46"')
    expect(html).toContain('r="40"')
  })

  it('announces the figure and the shared unit word as one mark', () => {
    const html = render()
    const unit = i18n.t('feed:taskCard.pointsUnit')
    expect(html).toContain(`aria-label="${POINTS} ${unit}"`)
    // #1911 restored the unit word on the struck seal; the stamp uppercases it,
    // so the catalog's "Points" still strikes as POINTS. Do not undo it.
    expect(html.replace(/<[^>]*>/g, '')).toContain(unit)
  })

  it('carries no praxis legend — a task is not yet on the record', () => {
    // `PointsRoundel`'s arc reads "★ VERIFIED ★ ON THE RECORD", which is a claim
    // only a scored praxis can make. The task card omits it, which is why
    // `arcLabel` is optional.
    expect(render()).not.toContain('textPath')
  })
})

describe('Everymen task card — fists-and-lightning at the CTA (#2034)', () => {
  it('flanks the sign-up with a mirrored pair', () => {
    const html = render()
    const marks = [...html.matchAll(/data-evm-bolt/g)]
    expect(marks).toHaveLength(2)
    // One drawing, struck twice: the leading mark is the mirror.
    expect(html).toContain('scaleX(-1)')
  })

  it('adds no second control to the CTA row', () => {
    const html = render()
    // The row's only hit box is the button. The marks are decorative spans with
    // pointer events off, so no 44px box can overlap another at any card width.
    expect(html.match(/<button/g) ?? []).toHaveLength(1)
    const row = html.slice(html.lastIndexOf('data-evm-bolt'))
    expect(row).not.toContain('<a ')
    expect(html.match(/pointer-events:none/g) ?? []).not.toHaveLength(0)
  })

  it('leaves with the CTA when sign-up is not on offer', () => {
    const html = render(false)
    expect(html).not.toContain('<button')
    expect(html).not.toContain('data-evm-bolt')
  })
})

describe('Everymen task card — the poster rays (#2034)', () => {
  it('converges the burst on the sheet centre, not its upper third', () => {
    // The design's one portable line in the Everymen flourish block. Only the
    // conic gradient moves; the two corner glows and the mask keep their own
    // anchors, so the copy stays legible under the rays.
    const html = render()
    expect(html).toContain('repeating-conic-gradient(from 0deg at 50% 50%')
    expect(html).toContain('radial-gradient(130% 100% at 50% 16%, #000 40%, transparent 96%)')
  })
})
