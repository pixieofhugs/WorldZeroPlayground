/**
 * The Cozy Coven score stamp: the arched Points plate over the cauldron (#2019).
 *
 * The risk is the subtotal: the habit bonus is flat and outside the multiplier,
 * and a UA character's praxis on a Coven task renders this skin with a live
 * habit row (stamps dispatch on the TASK's faction). A subtotal that swallowed
 * it would print arithmetic that never reaches the total, on a card that renders
 * perfectly; the design has no habit term to warn about it.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import '../../../../i18n'
import type { PraxisCardOut } from '../../../../api/praxis'
import CovenScoreStamp from '../CovenScoreStamp'
import CovenCauldron from '../../../factionMarks/CovenCauldron'

/** No hex may reach a stamp's markup — every colour is a token (ADR-0049). */
const HEX = /#[0-9a-fA-F]{3,8}\b/

/** Strip tags so an attribute value cannot satisfy a figure assertion. */
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

/** #2634: the subtotal is `base × mult`, gated on the multiplier alone (#2633). */
describe('the Coven subtotal is base × mult, on the multiplier alone (#2634)', () => {
  it('draws no subtotal on a metatask praxis with no multiplier', () => {
    const html = text(renderToStaticMarkup(<CovenScoreStamp praxis={praxis({ metatask_points: 5, score: 17 })} />))
    expect(html, 'the metatask row itself still prints').toContain('meta')
    expect(html).not.toContain('subtotal')
    // 17 is the cauldron's total and nothing else on the plate.
    expect(html.split('17')).toHaveLength(2)
  })

  it('draws one on a duel side with no metatask at all', () => {
    const html = text(
      renderToStaticMarkup(<CovenScoreStamp praxis={praxis({ display_multiplier: 1.5, score: 18 })} />),
    )
    expect(html, 'the ratio rides the base line as a chip now').toContain('×1.50')
    expect(html).toContain('subtotal')
    // Once as subtotal, once as total.
    expect(html.split('18')).toHaveLength(3)
  })

  /** `12 × 1.5 = 18`, then `+ 5 + 7 = 30`; folding either in gives 25.5 or 28.5. */
  it('holds the subtotal at base × mult while meta and habit sit beside it', () => {
    const html = text(
      renderToStaticMarkup(
        <CovenScoreStamp
          praxis={praxis({
            metatask_points: 5,
            display_multiplier: 1.5,
            habit_bonus_points: 7,
            score: 30,
          })}
        />,
      ),
    )
    expect(html).toContain('habit')
    expect(html).toContain('+7')
    expect(html, 'base × mult').toContain('18')
    expect(html, 'never (base + meta) × mult').not.toContain('25.5')
    expect(html, 'and never the bonus folded in').not.toContain('28.5')
    expect(html).toContain('30')
  })
})

describe('the states the design does not draw', () => {
  it('renders nothing at all when the praxis has no score', () => {
    expect(renderToStaticMarkup(<CovenScoreStamp praxis={praxis({ score: null })} />)).toBe('')
  })

  /** ADR-0076, #1131: no working, so the cauldron stands alone. */
  it('drops the whole plate when the base row would only restate the total', () => {
    const html = text(renderToStaticMarkup(<CovenScoreStamp praxis={praxis({})} />))
    expect(html).not.toContain('base')
    expect(html).not.toContain('subtotal')
    expect(html.split('12')).toHaveLength(2)
  })

  /** `0` is a total, not an absence. */
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
    expect(markup).toContain('92px 92px 20px 20px / 108px 108px 20px 20px')
    expect(markup).toContain('cvn-cauldron')
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

  /** Inline animation would bypass the reduced-motion gate; these are classes. */
  it('never writes an inline animation', () => {
    const markup = renderToStaticMarkup(<CovenScoreStamp praxis={full} />)
    expect(markup).not.toMatch(/animation\s*:/)
    expect(markup).toContain('cvn-cauldron-bub')
    expect(markup).toContain('cvn-cauldron-sigil')
  })
})

/** Shared mark (#2033): figure and caption are props, all inside the viewBox. */
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
