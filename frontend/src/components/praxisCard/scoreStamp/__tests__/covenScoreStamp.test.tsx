/**
 * The Cozy Coven score stamp — the arched Points plate over the cauldron (#2019).
 *
 * THE SEAM UNDER TEST is the join between the shared resolver and this one skin:
 * `scoreBreakdown()` returns the rows, and Coven adds ONE derived figure of its
 * own — `Group`, the `(base + meta)` subtotal the design prints under a dashed
 * rule so `×1.50` is visibly applied to `17` and not to `12`.
 *
 * That derivation is the whole risk, and it is invisible to a green build. The
 * habit bonus is FLAT and sits outside the multiplier (`scoreBreakdown.ts`), and
 * the stamp dispatches on the TASK's faction (`ScoreStamp.tsx`) — so a UA
 * character's praxis on a Coven task renders this skin with a live habit row.
 * A `Group` that swallowed it would print arithmetic that never reaches the
 * printed total, on a card that renders perfectly. The design cannot warn about
 * this: its own vendored `breakdown()` predates #1617 and has no habit term at
 * all. Hence `groupIgnoresHabit` below, with three figures chosen so the wrong
 * sum (`24`) cannot be confused with the right one (`17`).
 *
 * The rest pins what #2019 replaced: the tilt, the ✨ and the gold chip are gone,
 * the cauldron is the total mark, and every colour still resolves through a
 * token so the stamp keeps responding to dark mode.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import '../../../../i18n'
import type { PraxisCardOut } from '../../../../api/praxis'
import CovenScoreStamp from '../CovenScoreStamp'
import CovenCauldron from '../../../factionMarks/CovenCauldron'

/** No hex may reach a stamp's markup — every colour is a token (ADR-0049). */
const HEX = /#[0-9a-fA-F]{3,8}\b/

/** Strip tags so a figure assertion cannot be satisfied by an attribute value. */
const text = (html: string) => html.replace(/<[^>]*>/g, '')

function praxis(overrides: Record<string, unknown>): PraxisCardOut {
  return {
    task_point_value: 12,
    display_multiplier: 1,
    metatask_points: 0,
    points_from_votes: 0,
    habit_bonus_points: 0,
    is_top_for_task: false,
    score: 12,
    ...overrides,
  } as PraxisCardOut
}

describe('the Coven Group row is (base + meta) and nothing else (#2019)', () => {
  it('prints the subtotal under the meta row when a metatask is live', () => {
    const html = text(renderToStaticMarkup(<CovenScoreStamp praxis={praxis({ metatask_points: 5, score: 17 })} />))
    expect(html).toContain('group')
    // 12 + 5. Stated once as a row, and once more as the cauldron's total.
    expect(html.split('17')).toHaveLength(3)
  })

  it('leaves the Group row out when there is no metatask', () => {
    const html = text(
      renderToStaticMarkup(<CovenScoreStamp praxis={praxis({ display_multiplier: 1.5, score: 18 })} />),
    )
    expect(html).toContain('mult')
    expect(html).not.toContain('group')
  })

  /**
   * The trap. `12 + 5 = 17`, and the habit bonus of 7 is added AFTER the
   * multiplier — so the total is `17 × 1.5 + 7 = 32.5` and the subtotal is 17.
   * A `Group` that folded the bonus in would print 24, which multiplies out to
   * 36 and reaches no figure on the card.
   */
  it('holds the subtotal at base + meta while a habit row is live beside it', () => {
    const html = text(
      renderToStaticMarkup(
        <CovenScoreStamp
          praxis={praxis({
            metatask_points: 5,
            display_multiplier: 1.5,
            habit_bonus_points: 7,
            score: 32.5,
          })}
        />,
      ),
    )
    // The habit row is rendered even though the design never draws one.
    expect(html).toContain('habit')
    expect(html).toContain('+7')
    expect(html).toContain('17')
    expect(html).not.toContain('24')
    expect(html).toContain('32.5')
  })
})

describe('the states the design does not draw', () => {
  it('renders nothing at all when the praxis has no score', () => {
    expect(renderToStaticMarkup(<CovenScoreStamp praxis={praxis({ score: null })} />)).toBe('')
  })

  /**
   * ADR-0076: with no working, the plate would be an arch drawn over an empty
   * block. The design's own spec sheet is inconsistent here — it draws this
   * state twice, once plateless and once with a "no working shown" plate — and
   * the repo already ruled it, so the cauldron stands alone and the figure is
   * stated exactly once (#1131).
   */
  it('drops the whole plate when the base row would only restate the total', () => {
    const html = text(renderToStaticMarkup(<CovenScoreStamp praxis={praxis({})} />))
    expect(html).not.toContain('base')
    expect(html).not.toContain('group')
    expect(html.split('12')).toHaveLength(2)
  })

  /** A scored praxis worth nothing still stamps — `0` is a total, not an absence. */
  it('still hangs the cauldron on a zero score', () => {
    const html = text(
      renderToStaticMarkup(<CovenScoreStamp praxis={praxis({ task_point_value: 0, score: 0 })} />),
    )
    expect(html).toBe('0points')
  })
})

describe('what #2019 replaced', () => {
  const full = praxis({
    metatask_points: 5,
    display_multiplier: 1.5,
    points_from_votes: 4,
    score: 29.5,
  })

  it('stands the stamp upright and retires the ✨ and the gold chip', () => {
    const markup = renderToStaticMarkup(<CovenScoreStamp praxis={full} />)
    expect(markup).not.toContain('rotate(-3deg)')
    expect(markup).not.toContain('rotate(3deg)')
    expect(markup).not.toContain('✨')
    // The braid ruled the old slip; the plate's own dashed rule replaces it.
    expect(markup).not.toContain('cvn-braid')
  })

  it('draws the arched plate over the cauldron, and keeps the crown mount', () => {
    const markup = renderToStaticMarkup(
      <CovenScoreStamp praxis={{ ...full, is_top_for_task: true } as PraxisCardOut} />,
    )
    // The arch: an elliptical radius on the plate's head, square at its foot.
    expect(markup).toContain('92px 92px 20px 20px / 108px 108px 20px 20px')
    expect(markup).toContain('cvn-cauldron')
    // TaskCrown stays the shared component, at the size and tilt it already had.
    expect(markup).toContain('rotate(8deg)')
  })

  it('resolves every colour through a token, so dark mode still flows', () => {
    const markup = renderToStaticMarkup(<CovenScoreStamp praxis={full} />)
    expect(markup).not.toMatch(HEX)
    expect(markup).toContain('--faction-coven-slip-row-base')
    expect(markup).toContain('--faction-coven-slip-row-mult')
    expect(markup).toContain('--faction-coven-slip-row-votes')
    expect(markup).toContain('--faction-coven-slip-plate-foot')
  })

  /**
   * The design writes `animation: sigilGlow …` and `animation: bub …` inline,
   * which bypasses the reduced-motion gate every other motion in this app is
   * held behind. Both are classes in `index.css` now.
   */
  it('never writes an inline animation', () => {
    const markup = renderToStaticMarkup(<CovenScoreStamp praxis={full} />)
    expect(markup).not.toMatch(/animation\s*:/)
    expect(markup).toContain('cvn-cauldron-bub')
    expect(markup).toContain('cvn-cauldron-sigil')
  })
})

/**
 * The vessel is a shared mark, not an inline drawing: the owner ruled this
 * cauldron canonical and #2033 mounts it on the Coven task card at a smaller
 * size. So the figure and its caption are props, and the whole drawing — text
 * included — lives in the viewBox, which is what makes one `size` hold every
 * proportion at once.
 */
describe('CovenCauldron is reusable at any size (#2033 mounts it)', () => {
  it('scales the box while the drawing keeps its viewBox', () => {
    const big = renderToStaticMarkup(<CovenCauldron total="29.5" caption="points" />)
    const small = renderToStaticMarkup(<CovenCauldron total="12" caption="pts" size={96} />)
    expect(big).toContain('width="158"')
    expect(small).toContain('width="96"')
    for (const markup of [big, small]) expect(markup).toContain('viewBox="0 0 132 132"')
    expect(text(small)).toContain('12')
    expect(text(small)).toContain('pts')
    expect(small).not.toMatch(HEX)
  })

  it('names the figure for a screen reader rather than leaving it decorative', () => {
    const markup = renderToStaticMarkup(<CovenCauldron total="29.5" caption="points" />)
    expect(markup).toContain('aria-label="29.5 points"')
  })
})
