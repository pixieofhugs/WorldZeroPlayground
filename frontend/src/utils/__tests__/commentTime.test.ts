import { describe, it, expect, afterEach } from 'vitest'
import i18n from '../../i18n'
import praxisCatalog from '../../locales/en/praxis.json'
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
    expect(formatCommentTime('coven', ago(3 * 60), NOW)).toBe('3h')
    expect(formatCommentTime('coven', ago(5), NOW)).toBe('5m')
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

  it('na reads the same plain form as an unknown slug — na is a population', () => {
    for (const minutes of [0, 5, 90, 2 * 1440]) {
      expect(formatCommentTime('na', ago(minutes), NOW)).toBe(
        formatCommentTime(undefined, ago(minutes), NOW),
      )
    }
  })

  it('singular deltas drop the plural s', () => {
    expect(formatCommentTime('ua', ago(1440), NOW)).toBe('1 day ago')
    expect(formatCommentTime('ua', ago(1), NOW)).toBe('1 minute ago')
  })

  it('ordinals survive the English teens (11th, not 11st)', () => {
    for (const [days, word] of [
      [11, 'the 11th day'],
      [12, 'the 12th day'],
      [13, 'the 13th day'],
      [21, 'the 21st day'],
      [22, 'the 22nd day'],
      [23, 'the 23rd day'],
    ] as const) {
      expect(formatCommentTime('ephemerists', ago(days * 1440), NOW)).toBe(word)
    }
  })
})

/**
 * The seam this file tests is `formatCommentTime` itself — the one function every
 * comment surface routes its timestamp through (`CommentThread` plus the seven
 * voices, all passing `comment.author.faction_slug`).
 *
 * The assertions above pin the rendered words and are the "no visible change"
 * proof. The ones below pin where those words COME FROM, which is the actual
 * defect in #2666: on `origin/main` every string here was an English literal in
 * this module, so a reworded catalog changed nothing and a non-English locale
 * could not express any of it.
 */
describe('formatCommentTime — the catalog owns the words (#2666)', () => {
  afterEach(() => {
    i18n.addResourceBundle('en', 'praxis', praxisCatalog, true, true)
  })

  it('every dialect follows a reworded catalog', () => {
    i18n.addResourceBundle(
      'en',
      'praxis',
      {
        comments: {
          time: {
            default: { hours_other: 'REWORDED {{count}} hours' },
            coven: { hours: 'REWORDED {{count}}h' },
            singularity: { hours: 'REWORDED {{count}}H' },
            snide: { hours: 'REWORDED {{hours}}' },
            ephemerists: { day_ordinal_few: 'REWORDED {{count}}rd' },
            everymen: { shift: 'REWORDED {{count}}' },
          },
        },
      },
      true,
      true,
    )

    expect(formatCommentTime('ua', ago(3 * 60), NOW)).toBe('REWORDED 3 hours')
    expect(formatCommentTime(null, ago(3 * 60), NOW)).toBe('REWORDED 3 hours')
    expect(formatCommentTime('coven', ago(3 * 60), NOW)).toBe('REWORDED 3h')
    expect(formatCommentTime('singularity', ago(3 * 60), NOW)).toBe('REWORDED 3H')
    expect(formatCommentTime('snide', ago(3 * 60), NOW)).toBe('REWORDED 003')
    expect(formatCommentTime('ephemerists', ago(3 * 1440), NOW)).toBe('REWORDED 3rd')
    expect(formatCommentTime('everymen', ago(1440), NOW)).toBe('REWORDED 2')
  })

  it('has no albescent branch a copy editor could fill in (#783)', () => {
    // The #783 leak is one JSON key away if the dialect is ever resolved by
    // slug out of the catalog. It is not — selection lives in code — so the
    // absence of this branch is the guard, and this is what fails if someone
    // adds one back.
    expect(praxisCatalog.comments.time).not.toHaveProperty('albescent')

    // And prove it from the other side: a catalog branch for albescent, even if
    // one existed, is unreachable from the resolution path.
    i18n.addResourceBundle(
      'en',
      'praxis',
      { comments: { time: { albescent: { days_other: 'Vigil the {{count}}' } } } },
      true,
      true,
    )
    expect(formatCommentTime('albescent', ago(3 * 1440), NOW)).toBe('3 days ago')
  })
})
