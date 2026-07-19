import { describe, it, expect } from 'vitest'
import { formatCommentTime } from '../commentTime'

const NOW = new Date('2026-06-25T12:00:00Z').getTime()
const ago = (mins: number) => new Date(NOW - mins * 60_000).toISOString()

describe('formatCommentTime — per-faction dialects', () => {
  it('ua speaks full relative words', () => {
    expect(formatCommentTime('ua', ago(2 * 1440), NOW)).toBe('2 days ago')
    expect(formatCommentTime('ua', ago(3 * 60), NOW)).toBe('3 hours ago')
    expect(formatCommentTime('ua', ago(0), NOW)).toBe('just now')
  })

  it('wow is terse', () => {
    expect(formatCommentTime('wow', ago(3 * 60), NOW)).toBe('3h')
    expect(formatCommentTime('wow', ago(5), NOW)).toBe('5m')
  })

  it('snide zero-pads hours and shouts', () => {
    expect(formatCommentTime('snide', ago(48 * 60), NOW)).toBe('048H AGO')
    expect(formatCommentTime('snide', ago(30), NOW)).toBe('000H AGO')
  })

  it('ephemerists count days as ordinals', () => {
    expect(formatCommentTime('ephemerists', ago(3 * 1440), NOW)).toBe('the 3rd day')
    expect(formatCommentTime('ephemerists', ago(60), NOW)).toBe('the 1st day')
  })

  it('everymen count shifts (1-based)', () => {
    expect(formatCommentTime('everymen', ago(1 * 1440), NOW)).toBe('Shift 2')
    expect(formatCommentTime('everymen', ago(0), NOW)).toBe('Shift 1')
  })

  it('albescent timestamps read exactly like unaffiliated ones (#783)', () => {
    // The inverse of "albescent keeps vigil in ordinal words". This dialect
    // keyed on the comment AUTHOR's faction, so "Vigil the Third" announced a
    // member every time they commented — to anyone, revealed or not. It is the
    // same tell as the vote vocabulary, on a far more trafficked surface.
    for (const minutes of [0, 90, 2 * 1440]) {
      expect(formatCommentTime('albescent', ago(minutes), NOW)).toBe(
        formatCommentTime(null, ago(minutes), NOW),
      )
    }
    expect(formatCommentTime('albescent', ago(2 * 1440), NOW)).toBe('2 days ago')
  })

  it('singularity uses a bare terse terminal clock (no T-#### fluff)', () => {
    expect(formatCommentTime('singularity', ago(12 * 60), NOW)).toBe('12h')
  })

  it('unknown slug falls back to relative words', () => {
    expect(formatCommentTime(null, ago(60), NOW)).toBe('1 hour ago')
  })
})
