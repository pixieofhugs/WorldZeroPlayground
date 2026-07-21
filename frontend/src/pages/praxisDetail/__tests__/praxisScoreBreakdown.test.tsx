/**
 * Unit coverage for the single earned-points breakdown (#641, ADR-0053).
 *
 * `praxisBreakdownParts` delegates to the shared `scoreBreakdown()` selector and
 * derives NOTHING by subtraction; `PraxisScoreBreakdown` renders the
 * `{base} + {votes}` idiom, switching to `{base} × {mult} + {votes}` when the
 * multiplier ≠ 1.0. That second form was unreachable before ADR-0053: against
 * Merit the multiplier always computed to 1.0. Rendered to static markup (no
 * DOM); i18n is initialised so the copy keys resolve to English text.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import { PraxisScoreBreakdown, praxisBreakdownParts } from '../shared'
import type { PraxisOut } from '../../../api/praxis'
import type { PraxisDetailState } from '../usePraxisDetail'

/** The breakdown reads only the payload's own score terms (ADR-0053). */
function makePraxis(
  base: number,
  multiplier: number,
  votePoints: number,
  metatask = 0,
): PraxisOut {
  return {
    task_point_value: base,
    display_multiplier: multiplier,
    points_from_votes: votePoints,
    metatask_points: metatask,
    score: (base + metatask) * multiplier + votePoints,
  } as PraxisOut
}

function stateOf(praxis: PraxisOut): PraxisDetailState {
  return { praxis } as unknown as PraxisDetailState
}

function text(element: ReactElement): string {
  return renderToStaticMarkup(element).replace(/<[^>]*>/g, '')
}

describe('praxisBreakdownParts', () => {
  it('is plain at ×1.0 (base + votes)', () => {
    const parts = praxisBreakdownParts(makePraxis(30, 1.0, 16))
    expect(parts.isPlain).toBe(true)
    expect(parts.base).toBe(30)
    expect(parts.votePoints).toBe(16)
  })

  it('reports a non-1.0 multiplier and formats it', () => {
    const parts = praxisBreakdownParts(makePraxis(10, 1.1, 14))
    expect(parts.isPlain).toBe(false)
    expect(parts.multiplierLabel).toBe('1.1')
  })

  it('trims a trailing zero (×1.10 → "1.1")', () => {
    expect(praxisBreakdownParts(makePraxis(10, 1.1, 0)).multiplierLabel).toBe('1.1')
  })

  it('keeps a two-decimal multiplier ("1.25")', () => {
    expect(praxisBreakdownParts(makePraxis(8, 1.25, 0)).multiplierLabel).toBe('1.25')
  })

  it('surfaces a duel loss multiplier instead of flattening it to 1.0', () => {
    // A Snide side currently behind: ×0.0, live and provisional (ADR-0052).
    // The old subtraction rendered this as ×1.0 — the bug #881 was filed on.
    const parts = praxisBreakdownParts(makePraxis(10, 0, 2))
    expect(parts.isPlain).toBe(false)
    expect(parts.multiplierLabel).toBe('0')
    expect(parts.votePoints).toBe(2)
  })

  it('reads vote points from the payload, never from score − base', () => {
    // score is deliberately inconsistent with the terms; the terms win.
    const parts = praxisBreakdownParts({
      task_point_value: 30,
      display_multiplier: 1.0,
      points_from_votes: 16,
      metatask_points: 0,
      score: 999,
    } as PraxisOut)
    expect(parts.votePoints).toBe(16)
    expect(parts.base).toBe(30)
  })

  it('stays plain when the base is 0', () => {
    expect(praxisBreakdownParts(makePraxis(0, 1.0, 5)).isPlain).toBe(true)
  })
})

describe('PraxisScoreBreakdown', () => {
  it('renders the plain "pts + votes" form and both numbers', () => {
    const rendered = text(<PraxisScoreBreakdown state={stateOf(makePraxis(30, 1.0, 16))} />)
    expect(rendered).toContain('30')
    expect(rendered).toContain('16')
    expect(rendered).toContain('pts + votes')
    expect(rendered).not.toContain('×')
  })

  it('renders the "× mult" form and label when the multiplier ≠ 1.0', () => {
    const rendered = text(<PraxisScoreBreakdown state={stateOf(makePraxis(10, 1.1, 14))} />)
    expect(rendered).toContain('10')
    expect(rendered).toContain('1.1')
    expect(rendered).toContain('×')
    expect(rendered).toContain('14')
    expect(rendered).toContain('pts × bonus + votes')
  })
})
