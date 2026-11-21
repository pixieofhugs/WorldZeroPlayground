import { describe, it, expect, afterEach } from 'vitest'
import i18n from '../../i18n'
import praxisCatalog from '../../locales/en/praxis.json'
import { formatCommentTime, formatCompactTime } from '../commentTime'

const NOW = new Date('2026-06-25T12:00:00Z').getTime()
const ago = (mins: number) => new Date(NOW - mins * 60_000).toISOString()

describe('formatCommentTime', () => {
  it('speaks full relative words', () => {
    expect(formatCommentTime(ago(2 * 1440), NOW)).toBe('2 days ago')
    expect(formatCommentTime(ago(3 * 60), NOW)).toBe('3 hours ago')
    expect(formatCommentTime(ago(5), NOW)).toBe('5 minutes ago')
    expect(formatCommentTime(ago(0), NOW)).toBe('just now')
  })

  it('singular deltas drop the plural s', () => {
    expect(formatCommentTime(ago(1440), NOW)).toBe('1 day ago')
    expect(formatCommentTime(ago(60), NOW)).toBe('1 hour ago')
    expect(formatCommentTime(ago(1), NOW)).toBe('1 minute ago')
  })

  it('a timestamp from the future reads as now, not a negative age', () => {
    expect(formatCommentTime(ago(-90), NOW)).toBe('just now')
  })
})

describe('formatCommentTime — the catalog owns the words (#2666)', () => {
  afterEach(() => {
    i18n.addResourceBundle('en', 'praxis', praxisCatalog, true, true)
  })

  it('follows a reworded catalog', () => {
    i18n.addResourceBundle(
      'en',
      'praxis',
      { comments: { time: { default: { hours_other: 'REWORDED {{count}} hours' } } } },
      true,
      true,
    )
    expect(formatCommentTime(ago(3 * 60), NOW)).toBe('REWORDED 3 hours')
  })

  it('holds one form and no per-faction branch (#783)', () => {
    // A branch keyed on the comment author's faction is a tell: Albescent's
    // "Vigil the Third" announced a member every time they commented.
    expect(Object.keys(praxisCatalog.comments.time)).toEqual(['compact', 'default'])
  })
})

describe('formatCompactTime (the feed look)', () => {
  it('pins the compact strings', () => {
    expect(formatCompactTime(ago(0), NOW)).toBe('just now')
    expect(formatCompactTime(ago(3), NOW)).toBe('3m ago')
    expect(formatCompactTime(ago(2 * 60), NOW)).toBe('2h ago')
    expect(formatCompactTime(ago(3 * 1440), NOW)).toBe('3d ago')
    expect(formatCompactTime(ago(29 * 1440), NOW)).toBe('29d ago')
    expect(formatCompactTime(ago(65 * 1440), NOW)).toBe('2mo ago')
  })

  it('a future timestamp reads as just now', () => {
    expect(formatCompactTime(ago(-90), NOW)).toBe('just now')
  })
})
