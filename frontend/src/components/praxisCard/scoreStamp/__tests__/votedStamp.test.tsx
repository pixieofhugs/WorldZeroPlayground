/**
 * The score stamp's votes row and total track the viewer's own just-cast vote
 * (#912).
 *
 * `useVotedPraxis` merges a vote override into BOTH the total (`score`) and the
 * votes row (`points_from_votes`) before a card picks its faction skin, so the
 * stamp's breakdown moves with the footer instead of lagging until the next
 * fetch. Before #912 only `score` was merged, so the stamp rendered last-fetch
 * server truth for its votes row while everything beside it showed the override.
 *
 * Harness note: the hook reads the override through `useSyncExternalStore`,
 * whose server snapshot is `null` under `renderToStaticMarkup` (nobody votes
 * mid-SSR), so rendering the hook directly can never observe an override in this
 * DOM-less harness. These cases pin the same seam the hook composes instead:
 * take the store's delta (the shared `deltaFrom` the hook's `useVoteOverride`
 * also runs), merge it exactly as `useVotedPraxis` does, and assert the stamp.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import '../../../../i18n'
import type { PraxisCardOut } from '../../../../api/praxis'
import { recordVote, tallyDelta, __resetVoteOverrides } from '../../../vote/voteOverrides'
import DefaultScoreStamp from '../DefaultScoreStamp'

const PRAXIS_ID = 7

function praxis(overrides: Record<string, unknown> = {}): PraxisCardOut {
  return {
    id: PRAXIS_ID,
    task_point_value: 12,
    display_multiplier: 1,
    metatask_points: 0,
    points_from_votes: 4,
    score: 16,
    voter_count: 3,
    ...overrides,
  } as PraxisCardOut
}

/** The merge `useVotedPraxis` performs — kept byte-for-byte alongside it. */
function votedPraxis(base: PraxisCardOut): PraxisCardOut {
  const delta = tallyDelta(base.id)
  if (!delta) return base
  return {
    ...base,
    score: base.score + delta.score,
    points_from_votes: base.points_from_votes + delta.score,
    voter_count: base.voter_count + delta.voters,
  }
}

const text = (html: string) => html.replace(/<[^>]*>/g, '')
const render = (p: PraxisCardOut) =>
  text(renderToStaticMarkup(<DefaultScoreStamp praxis={p} />))

afterEach(() => __resetVoteOverrides())

describe('score stamp reflects the viewer’s own vote (#912)', () => {
  it('moves the votes row AND the total when an override is active', () => {
    // Server truth: 4 vote-points, total 16. The viewer re-votes 2 -> 5 (+3).
    recordVote(PRAXIS_ID, 5, 2)
    const html = render(votedPraxis(praxis()))

    // Both the votes row and the total advance by the same +3 the footer shows.
    expect(html).toContain('+ 7 from votes')
    expect(html).toContain('19.0')
    // Base is untouched — a vote cannot move it — and the stale numbers are gone.
    expect(html).toContain('12')
    expect(html).not.toContain('+ 4 from votes')
    expect(html).not.toContain('16.0')
  })

  it('adds one delta, not two — the same raw star-sum lands on each field', () => {
    // First vote (no prior): +5 to the votes row and +5 to the total, nothing more.
    recordVote(PRAXIS_ID, 5, null)
    const voted = votedPraxis(praxis())
    const delta = tallyDelta(PRAXIS_ID)!
    expect(delta.score).toBe(5)
    expect(voted.points_from_votes).toBe(9)
    expect(voted.score).toBe(21)
  })

  it('returns to server truth with no double-count once the override clears', () => {
    recordVote(PRAXIS_ID, 5, 2)
    __resetVoteOverrides()
    // The next fetch has already folded the vote into server truth; the merge
    // must be a no-op now, not stack another +3 on top.
    const html = render(votedPraxis(praxis()))
    expect(html).toContain('+ 4 from votes')
    expect(html).toContain('16.0')
    expect(html).not.toContain('+ 7 from votes')
    expect(html).not.toContain('19.0')
  })
})
