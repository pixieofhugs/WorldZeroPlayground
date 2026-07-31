/**
 * FilterBar — the pure half (#1365).
 *
 * The seam under test is `filterState.ts`: every derivation the chrome reads,
 * with no DOM in sight. The frontend harness is renderToStaticMarkup only —
 * no jsdom, no click, no effects — so the parts worth guarding are the ones
 * that are functions of state rather than of a pointer:
 *
 *   - thumbOffset / thumbWidth for each (index, segment count) pair, 2..4
 *   - deriveChips from a filter-state object, faction chips first
 *   - the applied-count badge, which is chips.length rendered
 *   - selectEmptyState — which of the three empty states a state picks
 *   - filterRoster — `GET /factions` plus the explicit `na` sentinel, never a
 *     hardcoded roster (#1361 ruling 4)
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'

// factionName reads the raw i18n instance, not the hook.
import '../../../../i18n'

import FilterBar from '..'
import {
  deriveChips,
  filterRoster,
  selectEmptyState,
  selectedFirst,
  thumbOffset,
  thumbWidth,
  toggleFaction,
  type FilterRail,
} from '../filterState'
import type { FactionOut } from '../../../../api/factions'

const PAD = 'var(--filter-rail-pad)'

const sortRail = (value: string, onChange = () => {}): FilterRail => ({
  key: 'sort',
  label: 'sort',
  value,
  defaultValue: 'newest',
  segments: [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'most_voted', label: 'Most voted' },
    { value: 'least_voted', label: 'Least voted' },
  ],
  onChange,
})

const eraRail = (value: string, onChange = () => {}): FilterRail => ({
  key: 'era',
  label: 'era',
  value,
  defaultValue: 'current',
  segments: [
    { value: 'current', label: 'This era' },
    { value: 'all', label: 'All eras' },
  ],
  onChange,
})

describe('thumbOffset / thumbWidth — the sliding thumb geometry', () => {
  // The design's maths is `calc(i * (100% - 6px) / n + 3px)`; the 3px rail
  // padding is a token here so the CSS and the JS cannot drift.
  it('places a 2-segment thumb at either end', () => {
    expect(thumbOffset(0, 2)).toBe(`calc(0 * (100% - 2 * ${PAD}) / 2 + ${PAD})`)
    expect(thumbOffset(1, 2)).toBe(`calc(1 * (100% - 2 * ${PAD}) / 2 + ${PAD})`)
  })

  it('places a 3-segment thumb (the tasks sort rail: level / newest / oldest)', () => {
    expect(thumbOffset(0, 3)).toBe(`calc(0 * (100% - 2 * ${PAD}) / 3 + ${PAD})`)
    expect(thumbOffset(1, 3)).toBe(`calc(1 * (100% - 2 * ${PAD}) / 3 + ${PAD})`)
    expect(thumbOffset(2, 3)).toBe(`calc(2 * (100% - 2 * ${PAD}) / 3 + ${PAD})`)
  })

  it('places a 4-segment thumb (the praxis sort rail)', () => {
    for (const index of [0, 1, 2, 3]) {
      expect(thumbOffset(index, 4)).toBe(
        `calc(${index} * (100% - 2 * ${PAD}) / 4 + ${PAD})`,
      )
    }
  })

  it('sizes the thumb to one nth of the track for 2, 3 and 4 segments', () => {
    expect(thumbWidth(2)).toBe(`calc((100% - 2 * ${PAD}) / 2)`)
    expect(thumbWidth(3)).toBe(`calc((100% - 2 * ${PAD}) / 3)`)
    expect(thumbWidth(4)).toBe(`calc((100% - 2 * ${PAD}) / 4)`)
  })
})

describe('deriveChips — one removable chip per active filter', () => {
  it('raises no chip for a rail sitting on its default', () => {
    const chips = deriveChips({
      rails: [sortRail('newest'), eraRail('current')],
      selectedFactions: [],
      onFactionsChange: () => {},
    })
    expect(chips).toEqual([])
  })

  it('labels a rail chip with the SELECTED segment, not the rail', () => {
    const chips = deriveChips({
      rails: [sortRail('least_voted'), eraRail('current')],
      selectedFactions: [],
      onFactionsChange: () => {},
    })
    expect(chips.map((chip) => chip.label)).toEqual(['Least voted'])
  })

  it('puts faction chips first and carries the slug so the chip can wear a sigil', () => {
    const chips = deriveChips({
      rails: [sortRail('oldest'), eraRail('all')],
      selectedFactions: ['ua', 'coven'],
      onFactionsChange: () => {},
    })
    expect(chips.map((chip) => chip.slug)).toEqual([
      'ua',
      'coven',
      undefined,
      undefined,
    ])
    expect(chips.map((chip) => chip.label)).toEqual([
      'UA',
      'Cozy Coven',
      'Oldest',
      'All eras',
    ])
  })

  it('removing a rail chip returns the rail to its default, not to empty', () => {
    const onChange = vi.fn()
    const [chip] = deriveChips({
      rails: [eraRail('all', onChange)],
      selectedFactions: [],
      onFactionsChange: () => {},
    })
    chip.remove()
    expect(onChange).toHaveBeenCalledWith('current')
  })

  it('removing a faction chip drops only that slug', () => {
    const onFactionsChange = vi.fn()
    const [chip] = deriveChips({
      rails: [],
      selectedFactions: ['ua', 'coven'],
      onFactionsChange,
    })
    chip.remove()
    expect(onFactionsChange).toHaveBeenCalledWith(['coven'])
  })
})

describe('the applied-count badge', () => {
  const render = (selectedFactions: string[], eraValue: string) =>
    renderToStaticMarkup(
      <FilterBar
        rails={[eraRail(eraValue)]}
        factions={[{ slug: 'ua' }]}
        selectedFactions={selectedFactions}
        onFactionsChange={() => {}}
        onClearAll={() => {}}
      />,
    )

  it('is absent when nothing is applied', () => {
    expect(render([], 'current')).not.toContain('filter-bar__badge')
  })

  it('counts faction chips and rail chips together', () => {
    const html = render(['ua', 'coven'], 'all')
    expect(html).toContain('>3<')
  })
})

describe('selectEmptyState — three states, not one (#1361 ruling 9)', () => {
  it('shows the register-empty copy when nothing is filtered', () => {
    expect(selectEmptyState(0, false)).toBe('register')
  })

  it('shows "all caught up" only when the personal rail is the ONLY filter', () => {
    expect(selectEmptyState(1, true)).toBe('caughtUp')
  })

  it('falls back to filtered when a faction is also narrowing the list', () => {
    // The design's single empty state lies here: "nothing is waiting on your
    // vote" is a claim it has not checked.
    expect(selectEmptyState(2, true)).toBe('filtered')
  })

  it('shows filtered when a filter other than the personal rail is applied', () => {
    expect(selectEmptyState(1, false)).toBe('filtered')
  })
})

describe('filterRoster — GET /factions plus the na sentinel (#1361 ruling 4)', () => {
  const VISIBLE: FactionOut[] = [
    { slug: 'singularity' },
    { slug: 'ua' },
    { slug: 'everymen' },
  ]

  it('renders exactly the factions it is given, in rainbow order, then na', () => {
    expect(filterRoster(VISIBLE)).toEqual([
      'everymen',
      'ua',
      'singularity',
      'na',
    ])
  })

  it('never invents a hidden faction the API withheld', () => {
    expect(filterRoster(VISIBLE)).not.toContain('albescent')
    expect(filterRoster(VISIBLE)).not.toContain('coven')
  })

  it('appends the na sentinel exactly once even if the API ever emits it', () => {
    expect(filterRoster([...VISIBLE, { slug: 'na' }]).filter((s) => s === 'na'))
      .toHaveLength(1)
  })
})

describe('selectedFirst / toggleFaction', () => {
  it('sorts selected rows to the top, keeping roster order inside each group', () => {
    expect(
      selectedFirst(['everymen', 'ua', 'singularity', 'na'], ['singularity', 'na']),
    ).toEqual(['singularity', 'na', 'everymen', 'ua'])
  })

  it('toggles a slug in and out without mutating the input', () => {
    const selected = ['ua']
    expect(toggleFaction(selected, 'coven')).toEqual(['ua', 'coven'])
    expect(toggleFaction(selected, 'ua')).toEqual([])
    expect(selected).toEqual(['ua'])
  })
})
