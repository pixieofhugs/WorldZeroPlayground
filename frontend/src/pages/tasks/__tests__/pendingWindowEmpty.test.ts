/**
 * The seam: which empty state an empty TASK list picks (#1695).
 *
 * A proposal is admin-only for its first `pending_task_admin_review_hours`, so
 * the level-3 player whose unlock just opened the pending tab is the one most
 * likely to meet an empty list — and "No tasks match your filters" would tell
 * them their filter is broken when the rule is working.
 *
 * A pure function rather than a rendered component on purpose: the branch reads
 * `/game-config`, the harness runs no effects, so a hook-shaped version of this
 * decision could only ever be driven down its unknown-window leg.
 */
import { describe, it, expect } from 'vitest'
import { PENDING_WINDOW_EMPTY, selectTaskEmptyState } from '../useTasks'

const HOURS = 48

describe('selectTaskEmptyState — the pending window is its own empty state', () => {
  it('claims the window when the status tab is the ONLY filter', () => {
    expect(selectTaskEmptyState('pending', 1, false, HOURS)).toBe(PENDING_WINDOW_EMPTY)
  })

  it('defers to the filtered sentence once a second filter narrows the list', () => {
    // With a faction or a search also applied, "nothing has ripened yet" is a
    // claim this code cannot check — the same reason `selectEmptyState` guards
    // `caughtUp` on `appliedCount === 1`.
    expect(selectTaskEmptyState('pending', 2, false, HOURS)).toBe('filtered')
  })

  it('says nothing about a window it does not know', () => {
    // `/game-config` has not landed. The sentence promises a number, so with no
    // number it is not the sentence to show — never a hardcoded 48.
    expect(selectTaskEmptyState('pending', 1, false, null)).toBe('filtered')
  })

  it('leaves the other three states exactly as they were', () => {
    expect(selectTaskEmptyState('All', 0, false, HOURS)).toBe('register')
    expect(selectTaskEmptyState('All', 1, true, HOURS)).toBe('caughtUp')
    expect(selectTaskEmptyState('active', 1, false, HOURS)).toBe('filtered')
    // The eligibility rail still wins on a non-pending tab, window or no window.
    expect(selectTaskEmptyState('retired', 1, true, HOURS)).toBe('caughtUp')
  })
})
