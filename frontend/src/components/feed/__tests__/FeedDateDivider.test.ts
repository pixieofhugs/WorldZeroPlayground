import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../../i18n'
import { getDateLabel } from '../FeedDateDivider'

const yesterday = () => i18n.t('feed:dateDivider.yesterday')
const today = () => i18n.t('feed:dateDivider.today')
const realTZ = process.env.TZ

function at(tz: string, now: Date) {
  process.env.TZ = tz
  vi.useFakeTimers()
  vi.setSystemTime(now)
}

afterEach(() => {
  vi.useRealTimers()
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
})

describe('getDateLabel across DST', () => {
  it('autumn: Monday after the clock goes back', () => {
    at('America/Los_Angeles', new Date(2026, 10, 2, 9))
    expect(getDateLabel(new Date(2026, 10, 1, 12).toISOString())).toBe(yesterday())
  })

  it('spring: Monday after the clock goes forward (LA and London)', () => {
    at('America/Los_Angeles', new Date(2027, 2, 15, 9))
    expect(getDateLabel(new Date(2027, 2, 14, 12).toISOString())).toBe(yesterday())
    at('Europe/London', new Date(2027, 2, 29, 9))
    expect(getDateLabel(new Date(2027, 2, 28, 12).toISOString())).toBe(yesterday())
  })

  it('ordinary weekday: today, yesterday, then a formatted date', () => {
    at('America/Los_Angeles', new Date(2026, 5, 10, 9))
    expect(getDateLabel(new Date(2026, 5, 10, 1).toISOString())).toBe(today())
    expect(getDateLabel(new Date(2026, 5, 9, 12).toISOString())).toBe(yesterday())
    const old = getDateLabel(new Date(2026, 5, 8, 12).toISOString())
    expect(old).not.toBe(yesterday())
    expect(old).not.toBe(today())
  })
})
