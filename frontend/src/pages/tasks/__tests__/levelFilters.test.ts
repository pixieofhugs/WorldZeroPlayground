/**
 * #1046 — the task browse level filter offered levels 0–5 from a hardcoded
 * literal, so every task above level 5 was unfilterable. The range belongs to
 * the era (`level_thresholds`), not to the frontend.
 *
 * Two halves, because either alone would pass while the bug was live:
 *  1. the pure derivation (indices of the ladder, level 0 included);
 *  2. an adoption guard on `useTasks.ts` — the derivation could be perfect and
 *     the hook could still hand back a literal. There is no jsdom/renderHook in
 *     this repo (effects never run), so the hook itself cannot be rendered to
 *     observe the fetch; asserting against the source is the available check,
 *     same posture as `hooks/__tests__/searchQueryParamAdoption.test.ts`.
 *
 * The tests use synthetic ladders on purpose. The live numbers live in
 * `backend/eras/era_1.py` and copying them here would duplicate a game rule.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { levelFiltersFromThresholds } from '../levelFilters'

describe('levelFiltersFromThresholds', () => {
  it('offers every level on the ladder, as its indices', () => {
    // Four thresholds = levels 0..3. Values are irrelevant — only the count is.
    expect(levelFiltersFromThresholds([0, 10, 70, 170])).toEqual([0, 1, 2, 3])
  })

  it('includes level 0 — a real, filterable level', () => {
    // `na` seeds a level-0 self-portrait task each era, so 0 is not an
    // off-by-one to be trimmed off the front.
    expect(levelFiltersFromThresholds([0, 10])[0]).toBe(0)
  })

  it('grows with the ladder rather than stopping at a fixed bound', () => {
    // The regression: a nine-level era must offer nine levels, not six.
    const ladder = Array.from({ length: 9 }, (_entry, level) => level * 10)
    expect(levelFiltersFromThresholds(ladder)).toHaveLength(9)
    expect(levelFiltersFromThresholds(ladder).at(-1)).toBe(8)
  })

  it('offers nothing before the config lands, so the control can hide', () => {
    expect(levelFiltersFromThresholds([])).toEqual([])
    expect(levelFiltersFromThresholds(undefined)).toEqual([])
    expect(levelFiltersFromThresholds(null)).toEqual([])
  })
})

const SOURCE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url))
const USE_TASKS_SOURCE = readFileSync(path.join(SOURCE_DIRECTORY, '../useTasks.ts'), 'utf8')

describe('useTasks drives the level filter from config', () => {
  it('derives its options rather than exporting a literal range', () => {
    expect(USE_TASKS_SOURCE).toContain('levelFiltersFromThresholds')
    expect(USE_TASKS_SOURCE).not.toContain('LEVEL_FILTERS')
  })

  it('feeds the derivation from the /game-config level ladder', () => {
    // #1141 routed the read through the shared `useGameConfig` cache, so the
    // ladder is now optional-chained off that hook's nullable return rather
    // than destructured from a local `getGameConfig()` response.
    expect(USE_TASKS_SOURCE).toMatch(/[Cc]onfig\??\.level_thresholds/)
  })

  it('holds no hardcoded level sequence', () => {
    // The exact shape #1046 replaced, plus the obvious "fix" of widening the
    // literal to 0–8 — which would be just as wrong the next era.
    expect(USE_TASKS_SOURCE).not.toMatch(/\[\s*0,\s*1,\s*2,\s*3/)
  })
})
