/**
 * FilterBar — the pure half (#1365, generalised in #1446).
 *
 * The seam under test is `filterState.ts` plus its one shipped configuration,
 * `factionFacet.ts`: every derivation the chrome reads, with no DOM in sight.
 * The frontend harness is renderToStaticMarkup only — no jsdom, no click, no
 * effects — so the parts worth guarding are the ones that are functions of
 * state rather than of a pointer:
 *
 *   - thumbOffset / thumbWidth for each (index, segment count) pair, 2..6
 *   - deriveChips from a filter-state object, facet chips first, with and
 *     without an ornament
 *   - the applied-count badge, which is chips.length rendered
 *   - selectEmptyState — which of the three empty states a state picks
 *   - filterRoster — `GET /factions` plus the explicit `na` sentinel, never a
 *     hardcoded roster (#1361 ruling 4)
 *   - factionFacet — the faction axis expressed in the generic shape: rows in
 *     roster order, selected first, named, and NO counts (#1361 ruling 3)
 *
 * The picker's rows are not reachable here: the panel is behind `open`, which
 * only a click sets. The option list they render is what `factionFacet` and
 * `FilterOption` say it is, and that is what these tests pin.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'

// factionName reads the raw i18n instance, not the hook.
import '../../../../i18n'

import FilterBar from '..'
import { factionFacet, filterRoster } from '../factionFacet'
import {
  deriveChips,
  selectEmptyState,
  selectedFirst,
  thumbOffset,
  thumbWidth,
  toggleOption,
  type FilterFacet,
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

/** A facet with no ornament and no counts — the plainest legal configuration. */
const typeFacet = (
  selected: string[],
  onChange = () => {},
): FilterFacet => ({
  key: 'type',
  label: 'Type',
  options: [
    { value: 'praxis', label: 'Praxis' },
    { value: 'comment', label: 'Comment' },
  ],
  selected,
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

  // #1446 widened RAIL_SEGMENTS_MAX to 6 for Updates' relationship rail
  // (All / Your Stuff / Friends / Foes / Global).
  it('places a 5-segment thumb (the relationship rail)', () => {
    for (const index of [0, 1, 2, 3, 4]) {
      expect(thumbOffset(index, 5)).toBe(
        `calc(${index} * (100% - 2 * ${PAD}) / 5 + ${PAD})`,
      )
    }
  })

  it('places a 6-segment thumb — the widened ceiling', () => {
    for (const index of [0, 1, 2, 3, 4, 5]) {
      expect(thumbOffset(index, 6)).toBe(
        `calc(${index} * (100% - 2 * ${PAD}) / 6 + ${PAD})`,
      )
    }
  })

  it('sizes the thumb to one nth of the track for 2 through 6 segments', () => {
    for (const count of [2, 3, 4, 5, 6]) {
      expect(thumbWidth(count)).toBe(`calc((100% - 2 * ${PAD}) / ${count})`)
    }
  })
})

describe('deriveChips — one removable chip per active filter', () => {
  it('raises no chip for a rail sitting on its default', () => {
    const chips = deriveChips({
      rails: [sortRail('newest'), eraRail('current')],
      facets: [],
    })
    expect(chips).toEqual([])
  })

  it('labels a rail chip with the SELECTED segment, not the rail', () => {
    const chips = deriveChips({
      rails: [sortRail('least_voted'), eraRail('current')],
      facets: [],
    })
    expect(chips.map((chip) => chip.label)).toEqual(['Least voted'])
  })

  it('puts facet chips first and carries the ornament the facet draws', () => {
    const chips = deriveChips({
      rails: [sortRail('oldest'), eraRail('all')],
      facets: [factionFacet([{ slug: 'ua' }, { slug: 'coven' }], ['ua', 'coven'], () => {})],
    })
    expect(chips.map((chip) => chip.label)).toEqual([
      'UA',
      'Cozy Coven',
      'Oldest',
      'All eras',
    ])
    // Faction chips wear a sigil; rail chips wear nothing.
    expect(chips.map((chip) => chip.ornament !== undefined)).toEqual([
      true,
      true,
      false,
      false,
    ])
  })

  it('leaves the ornament unset for a facet that draws none', () => {
    const chips = deriveChips({ rails: [], facets: [typeFacet(['praxis'])] })
    expect(chips).toHaveLength(1)
    expect(chips[0].label).toBe('Praxis')
    expect(chips[0].key).toBe('type:praxis')
    expect(chips[0].ornament).toBeUndefined()
  })

  it('names a selected faction even before GET /factions has answered', () => {
    // `useFactions()` is null until its response lands, so the deep-linked
    // chip has to be nameable from an empty roster.
    const [chip] = deriveChips({
      rails: [],
      facets: [factionFacet([], ['ua'], () => {})],
    })
    expect(chip.label).toBe('UA')
  })

  it('removing a rail chip returns the rail to its default, not to empty', () => {
    const onChange = vi.fn()
    const [chip] = deriveChips({ rails: [eraRail('all', onChange)], facets: [] })
    chip.remove()
    expect(onChange).toHaveBeenCalledWith('current')
  })

  it('removing a facet chip drops only that option', () => {
    const onChange = vi.fn()
    const [chip] = deriveChips({
      rails: [],
      facets: [typeFacet(['praxis', 'comment'], onChange)],
    })
    chip.remove()
    expect(onChange).toHaveBeenCalledWith(['comment'])
  })
})

describe('the applied-count badge', () => {
  const render = (selectedFactions: string[], eraValue: string) =>
    renderToStaticMarkup(
      <FilterBar
        rails={[eraRail(eraValue)]}
        facets={[factionFacet([{ slug: 'ua' }], selectedFactions, () => {})]}
        onClearAll={() => {}}
      />,
    )

  it('is absent when nothing is applied', () => {
    expect(render([], 'current')).not.toContain('filter-bar__badge')
  })

  it('counts facet chips and rail chips together', () => {
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
    expect(
      filterRoster([...VISIBLE, { slug: 'na' }]).filter(
        (slug: string) => slug === 'na',
      ),
    ).toHaveLength(1)
  })
})

describe('factionFacet — the faction axis as one configuration of the widget', () => {
  const VISIBLE: FactionOut[] = [{ slug: 'singularity' }, { slug: 'ua' }]

  it('offers the roster in order, named, with the selected rows first', () => {
    const facet = factionFacet(VISIBLE, ['na'], () => {})
    expect(facet.options.map((option) => option.value)).toEqual([
      'na',
      'ua',
      'singularity',
    ])
    expect(facet.options.map((option) => option.label)).toEqual([
      'Unaffiliated',
      'UA',
      'Singularity',
    ])
  })

  it('carries NO counts — cut by #1361 ruling 3, and the slot is opt-in', () => {
    const facet = factionFacet(VISIBLE, [], () => {})
    expect(facet.options.every((option) => option.count === undefined)).toBe(true)
  })

  it('draws an ornament in all three places', () => {
    const facet = factionFacet(VISIBLE, [], () => {})
    for (const place of ['row', 'trigger', 'chip'] as const) {
      expect(facet.renderOrnament?.('ua', place)).toBeTruthy()
    }
  })
})

describe('selectedFirst / toggleOption', () => {
  it('sorts selected rows to the top, keeping list order inside each group', () => {
    expect(
      selectedFirst(['everymen', 'ua', 'singularity', 'na'], ['singularity', 'na']),
    ).toEqual(['singularity', 'na', 'everymen', 'ua'])
  })

  it('toggles a value in and out without mutating the input', () => {
    const selected = ['ua']
    expect(toggleOption(selected, 'coven')).toEqual(['ua', 'coven'])
    expect(toggleOption(selected, 'ua')).toEqual([])
    expect(selected).toEqual(['ua'])
  })
})
