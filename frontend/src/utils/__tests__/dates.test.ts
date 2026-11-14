import { describe, it, expect, vi, afterEach } from 'vitest'
import { relativeTime } from '../dates'

const NOW = Date.parse('2026-06-15T12:00:00Z')
const ago = (ms: number) => new Date(NOW - ms).toISOString()
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

afterEach(() => vi.useRealTimers())

describe('relativeTime', () => {
  it.each([
    [0, 'just now'],
    [59_000, 'just now'],
    [MIN, '1m ago'],
    [59 * MIN, '59m ago'],
    [HOUR, '1h ago'],
    [23 * HOUR, '23h ago'],
    [DAY, '1d ago'],
    [29 * DAY, '29d ago'],
    [30 * DAY, '1mo ago'],
    [90 * DAY, '3mo ago'],
  ])('%i ms ago reads %s (each unit flips at its boundary)', (ms, expected) => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    expect(relativeTime(ago(ms))).toBe(expected)
  })

  it('a timestamp slightly in the future (clock skew) reads as just now, not negative', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    expect(relativeTime(ago(-5_000))).toBe('just now')
  })
})
