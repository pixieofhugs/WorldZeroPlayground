/**
 * "1 points" (#2239). Both halves matter: the catalog needs an `_one` twin
 * (so 1 and 2 must differ), and the call site must pass `count` to `t()`.
 * Abbreviations ("pts") don't inflect, so they're excluded.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import i18n from '../../i18n'
import type { PraxisCardOut } from '../../api/praxis'
import DefaultScoreStamp from '../../components/praxisCard/scoreStamp/DefaultScoreStamp'

/** Keys printing "point" beside a number; VARS only fill placeholders. */
const POINT_BEARING = [
  'praxis:card.stamp.points',
  'praxis:detail.owner.confirmPrompt',
  'feed:taskCard.pointsUnit',
  'tasks:detail.points.total',
  'common:sidebar.characterCard.points',
  'common:sidebar.characterCard.eraPoints',
  'factions:detail.spotlightStat',
  // Formerly "pts" (#2598); the long form needs `_one`.
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
