/** Which empty state an empty task list picks, incl. the pending window (#1695). */
import { describe, it, expect } from 'vitest'
import { PENDING_WINDOW_EMPTY, selectTaskEmptyState } from '../useTasks'

const HOURS = 48

describe('selectTaskEmptyState — the pending window is its own empty state', () => {
  it('claims the window when the status tab is the ONLY filter', () => {
    expect(selectTaskEmptyState('pending', 1, false, HOURS)).toBe(PENDING_WINDOW_EMPTY)
  })

  it('defers to the filtered sentence once a second filter narrows the list', () => {
    expect(selectTaskEmptyState('pending', 2, false, HOURS)).toBe('filtered')
  })

  it('says nothing about a window it does not know', () => {
    // `/game-config` not landed: the sentence needs the number; never hardcode 48.
    expect(selectTaskEmptyState('pending', 1, false, null)).toBe('filtered')
  })

  it('leaves the other three states exactly as they were', () => {
    expect(selectTaskEmptyState('All', 0, false, HOURS)).toBe('register')
    expect(selectTaskEmptyState('All', 1, true, HOURS)).toBe('caughtUp')
    expect(selectTaskEmptyState('active', 1, false, HOURS)).toBe('filtered')
    expect(selectTaskEmptyState('retired', 1, true, HOURS)).toBe('caughtUp')
  })
})
