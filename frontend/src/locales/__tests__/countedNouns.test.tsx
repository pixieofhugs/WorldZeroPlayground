/**
 * "1 points" (#2239) — the seam is a COUNT meeting its NOUN.
 *
 * Two halves, and either alone lets the bug back in:
 *
 *   1. THE CATALOG. Every point-bearing string is an i18next plural pair, so
 *      the singular exists at all. A key that lost its `_one` twin resolves to
 *      the plural for every count and nothing here would notice — hence the
 *      assertion that 1 and 2 say DIFFERENT words, not merely that both exist.
 *
 *   2. THE CALL SITE. A pair in the catalog does nothing until `count` is
 *      handed to `t()`, and a missing `count` is silent in production. The
 *      render below is the surface the issue screenshotted — the unaffiliated
 *      praxis score stamp, whose ring letters its unit under the figure.
 *
 * Abbreviated units ("pts", "PTS") are deliberately absent: an abbreviation
 * does not inflect, and `praxis:card.stamp.pointsShort` is the one the S.N.I.D.E.
 * stamp reads for exactly that reason.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import i18n from '../../i18n'
import type { PraxisCardOut } from '../../api/praxis'
import DefaultScoreStamp from '../../components/praxisCard/scoreStamp/DefaultScoreStamp'

/**
 * Every key that prints the word "point" beside a number. The extra variables
 * are the placeholders each value carries; they make the string resolve, and
 * the plural choice comes from `count` alone.
 */
const POINT_BEARING = [
  'praxis:card.stamp.points',
  'praxis:detail.owner.confirmPrompt',
  'feed:taskCard.pointsUnit',
  'tasks:detail.points.total',
  'common:sidebar.characterCard.points',
  'common:sidebar.characterCard.eraPoints',
  'factions:detail.spotlightStat',
  // #2598 took these five from "{{points}} pts" to the long form. An
  // abbreviation does not inflect, so "1 pts" was merely terse; "1 points" is
  // wrong, and each needed an `_one` twin on the way out of the short form.
  'feed:row.points',
  'forms:proposeTask.preview.points',
  'forms:taskMeta.points',
  'praxis:card.points',
  'praxis:detail.taskRef.points',
] as const

const VARS = { era: 'Era One', level: 2, points: '1', score: '1' }

describe('a count meets its noun in the right number (#2239)', () => {
  for (const key of POINT_BEARING) {
    it(`${key} says "point" at 1 and "points" at 2`, () => {
      const one = i18n.t(key, { ...VARS, count: 1 })
      const other = i18n.t(key, { ...VARS, count: 2 })
      expect(one, 'a singular that never differs is a missing `_one`').not.toBe(other)
      expect(one).not.toMatch(/\bpoints\b/i)
      expect(other).toMatch(/\bpoints\b/i)
    })
  }
})

/** A one-point praxis: no multiplier, no metatask, no votes — just the mark. */
const ONE_POINT = {
  task_point_value: 1,
  display_multiplier: 1,
  metatask_points: 0,
  points_from_votes: 0,
  habit_bonus_points: 0,
  is_top_for_task: false,
  score: 1,
} as PraxisCardOut

describe('the call site hands the figure to the catalog (#2239)', () => {
  it('letters the unaffiliated stamp "1 point", never "1 points"', () => {
    const text = renderToStaticMarkup(<DefaultScoreStamp praxis={ONE_POINT} />).replace(
      /<[^>]*>/g,
      '',
    )
    expect(text).toContain('1')
    expect(text).toContain(i18n.t('praxis:card.stamp.points', { count: 1 }))
    expect(text, 'the plural is what a missing `count` would print').not.toMatch(/points/i)
  })
})
