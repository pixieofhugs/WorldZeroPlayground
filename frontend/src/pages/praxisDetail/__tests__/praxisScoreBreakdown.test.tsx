/**
 * Unit coverage for the single earned-points breakdown (#641).
 *
 * `praxisBreakdownParts` derives base / vote-points / fixed-at-award multiplier
 * from the detail response (no backend change); `PraxisScoreBreakdown` renders
 * the `{base} + {votes}` idiom, switching to `{base} × {mult} + {votes}` when the
 * multiplier ≠ 1.0. Rendered to static markup (no DOM); i18n is initialised so
 * the copy keys resolve to English text.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import { PraxisScoreBreakdown, praxisBreakdownParts } from '../shared'
import type { PraxisOut } from '../../../api/praxis'
import type { VoteSummary } from '../../../api/votes'
import type { PraxisDetailState } from '../usePraxisDetail'

/** Only `task_point_value` + `score` matter to the breakdown math. */
function makePraxis(base: number, score: number): PraxisOut {
  return { task_point_value: base, score } as PraxisOut
}

function votesOf(totalScore: number): VoteSummary {
  return { praxis_id: 1, total_votes: 3, total_score: totalScore }
}

function stateOf(praxis: PraxisOut, votes: VoteSummary | null): PraxisDetailState {
  return { praxis, votes } as unknown as PraxisDetailState
}

function text(element: ReactElement): string {
  return renderToStaticMarkup(element).replace(/<[^>]*>/g, '')
}

describe('praxisBreakdownParts', () => {
  it('is plain at ×1.0 (base + votes)', () => {
    const parts = praxisBreakdownParts(makePraxis(30, 46), votesOf(16))
    expect(parts.isPlain).toBe(true)
    expect(parts.base).toBe(30)
    expect(parts.votePoints).toBe(16)
  })

  it('detects a non-1.0 multiplier and formats it', () => {
    const parts = praxisBreakdownParts(makePraxis(10, 25), votesOf(14))
    expect(parts.isPlain).toBe(false)
    expect(parts.multiplierLabel).toBe('1.1')
  })

  it('trims a trailing zero (×1.10 → "1.1")', () => {
    // 10 × 1.1 + 0 = 11
    expect(praxisBreakdownParts(makePraxis(10, 11), votesOf(0)).multiplierLabel).toBe('1.1')
  })

  it('keeps a two-decimal multiplier ("1.25")', () => {
    // 8 × 1.25 + 0 = 10
    expect(praxisBreakdownParts(makePraxis(8, 10), votesOf(0)).multiplierLabel).toBe('1.25')
  })

  it('falls back to ×1.0 when the base is 0', () => {
    expect(praxisBreakdownParts(makePraxis(0, 5), votesOf(5)).isPlain).toBe(true)
  })

  it('treats a missing votes object as 0 vote points', () => {
    const parts = praxisBreakdownParts(makePraxis(30, 30), null)
    expect(parts.votePoints).toBe(0)
    expect(parts.isPlain).toBe(true)
  })
})

describe('PraxisScoreBreakdown', () => {
  it('renders the plain "pts + votes" form and both numbers', () => {
    const rendered = text(<PraxisScoreBreakdown state={stateOf(makePraxis(30, 46), votesOf(16))} />)
    expect(rendered).toContain('30')
    expect(rendered).toContain('16')
    expect(rendered).toContain('pts + votes')
    expect(rendered).not.toContain('×')
  })

  it('renders the "× mult" form and label when the multiplier ≠ 1.0', () => {
    const rendered = text(<PraxisScoreBreakdown state={stateOf(makePraxis(10, 25), votesOf(14))} />)
    expect(rendered).toContain('10')
    expect(rendered).toContain('1.1')
    expect(rendered).toContain('×')
    expect(rendered).toContain('14')
    expect(rendered).toContain('pts × bonus + votes')
  })
})
