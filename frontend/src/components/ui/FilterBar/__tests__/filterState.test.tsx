/**
 * FilterBar's pure half (#1365, #1446): `filterState.ts` and `factionFacet.ts`.
 * No DOM, so measurement and the click-gated picker panel are out of reach.
 */
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'

// factionName reads the raw i18n instance, not the hook.
import '../../../../i18n'

import FilterBar from '..'
import { factionFacet, filterRoster } from '../factionFacet'
import {
  deriveChips,
  sameBoxes,
  selectEmptyState,
  selectedFirst,
  thumbGeometry,
  toggleOption,
  type FilterFacet,
  type FilterRail,
  type SegmentBox,
} from '../filterState'
import type { FactionOut } from '../../../../api/factions'
import type { FactionSigilProps } from '../../../sigil/FactionSigil'
import { isKnownFaction } from '../../../../utils/factions'
// The catalog, so a missing key fails.
import common from '../../../../locales/en/common.json'

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

describe('thumbGeometry — the thumb sits on the MEASURED active segment (#1726)', () => {
  // A four-state status rail: label lengths differ, so boxes are unequal.
  const statusBoxes: SegmentBox[] = [
    { left: 3, top: 3, width: 49, height: 38 },
    { left: 52, top: 3, width: 74, height: 38 },
    { left: 126, top: 3, width: 83, height: 38 },
    { left: 209, top: 3, width: 83, height: 38 },
  ]

  it('takes the active segment box whole, unequal widths and all', () => {
    expect(thumbGeometry(statusBoxes, 0)).toEqual({
      left: '3px',
      top: '3px',
      width: '49px',
      height: '38px',
    })
    expect(thumbGeometry(statusBoxes, 3)).toEqual({
      left: '209px',
      top: '3px',
      width: '83px',
      height: '38px',
    })
  })

  it('places the thumb at either end of a 2-segment rail', () => {
    const twoUp: SegmentBox[] = [
      { left: 3, top: 3, width: 90, height: 38 },
      { left: 93, top: 3, width: 140, height: 38 },
    ]
    expect(thumbGeometry(twoUp, 1)?.left).toBe('93px')
    expect(thumbGeometry(twoUp, 1)?.width).toBe('140px')
  })

  it('carries top and height too, so a wrapped rail still lands on its row', () => {
    const wrapped: SegmentBox[] = [
      { left: 3, top: 3, width: 90, height: 44 },
      { left: 3, top: 47, width: 90, height: 44 },
    ]
    expect(thumbGeometry(wrapped, 1)?.top).toBe('47px')
  })

  it('is null before the rail has been measured — first paint draws no thumb', () => {
    expect(thumbGeometry([], 0)).toBeNull()
  })

  it('is null for a zero-width measurement (a hidden or unlaid-out rail)', () => {
    expect(thumbGeometry([{ left: 0, top: 0, width: 0, height: 0 }], 0)).toBeNull()
  })

  it('is null when the active index is past the measured set', () => {
    // Signing out drops segments; the render runs before the re-measure.
    expect(thumbGeometry(statusBoxes.slice(0, 2), 3)).toBeNull()
  })
})

describe('sameBoxes — the re-measure guard', () => {
  const box = (left: number): SegmentBox => ({ left, top: 3, width: 49, height: 38 })

  it('holds the old array when nothing moved, so a ResizeObserver cannot loop', () => {
    expect(sameBoxes([box(3), box(52)], [box(3), box(52)])).toBe(true)
  })

  it('sees a move, a resize and a change of segment count', () => {
    expect(sameBoxes([box(3)], [box(4)])).toBe(false)
    expect(sameBoxes([box(3)], [{ ...box(3), width: 50 }])).toBe(false)
    expect(sameBoxes([box(3)], [box(3), box(52)])).toBe(false)
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
      facets: [factionFacet([{ slug: 'ua', status: 'visible' }, { slug: 'coven', status: 'visible' }], ['ua', 'coven'], () => {})],
    })
    expect(chips.map((chip) => chip.label)).toEqual([
      // Spelled out, not via `factionName()`, so a rename must pass here.
      'Unwavering Artisans',
      'Cozy Coven',
      'Oldest',
      'All eras',
    ])
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
    // `useFactions()` is null until it lands; a deep link must still name it.
    const [chip] = deriveChips({
      rails: [],
      facets: [factionFacet([], ['ua'], () => {})],
    })
    expect(chip.label).toBe('Unwavering Artisans')
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
        facets={[factionFacet([{ slug: 'ua', status: 'visible' }], selectedFactions, () => {})]}
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

describe('the rail before it has been measured (#1726)', () => {
  it('draws its segments but no thumb', () => {
    // A thumb before layout would flash; any thumb here means fallback
    // geometry came back.
    const html = renderToStaticMarkup(
      <FilterBar rails={[eraRail('current')]} facets={[]} onClearAll={() => {}} />,
    )
    expect(html).toContain('filter-rail__segment')
    expect(html).not.toContain('filter-rail__thumb')
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
    expect(selectEmptyState(2, true)).toBe('filtered')
  })

  it('shows filtered when a filter other than the personal rail is applied', () => {
    expect(selectEmptyState(1, false)).toBe('filtered')
  })
})

describe('filterRoster — GET /factions plus the na sentinel (#1361 ruling 4)', () => {
  const VISIBLE: FactionOut[] = [
    { slug: 'singularity', status: 'visible' },
    { slug: 'ua', status: 'visible' },
    { slug: 'everymen', status: 'visible' },
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
      filterRoster([...VISIBLE, { slug: 'na', status: 'visible' }]).filter(
        (slug: string) => slug === 'na',
      ),
    ).toHaveLength(1)
  })
})

describe('factionFacet — the faction axis as one configuration of the widget', () => {
  const VISIBLE: FactionOut[] = [{ slug: 'singularity', status: 'visible' }, { slug: 'ua', status: 'visible' }]

  it('offers the roster in order, named, with the selected rows first', () => {
    const facet = factionFacet(VISIBLE, ['na'], () => {})
    expect(facet.options.map((option) => option.value)).toEqual([
      'na',
      'ua',
      'singularity',
    ])
    expect(facet.options.map((option) => option.label)).toEqual([
      'Unaffiliated',
      'Unwavering Artisans',
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

  /**
   * #2528. The seven themed slugs get `factionCssVar(slug)`; `na`/`albescent`
   * map to the grey `--faction-default` and would lose their spectrum
   * (ADR-0039, #783), so they get no ink.
   */
  it('hands a solid ink only to a slug that owns one (#2528)', () => {
    const facet = factionFacet(VISIBLE, [], () => {})
    const inkFor = (slug: string) =>
      (facet.renderOrnament?.(slug, 'trigger') as ReactElement<FactionSigilProps>)
        .props.color

    expect(inkFor('ua')).toBe('var(--faction-ua)')
    expect(inkFor('singularity')).toBe('var(--faction-singularity)')

    for (const slug of ['na', 'albescent']) {
      expect(isKnownFaction(slug)).toBe(false)
      expect(inkFor(slug)).toBeUndefined()
    }

    // The rule is the predicate, not a denylist.
    expect(inkFor('not-a-faction')).toBeUndefined()
  })
})

describe('an option-less facet draws no trigger (#1567)', () => {
  // e.g. Updates' type facet on a quiet board; `OptionPicker` owns the check.
  const emptyFacet: FilterFacet = {
    key: 'type',
    label: 'Type',
    options: [],
    selected: [],
    onChange: () => {},
  }

  const render = (facets: FilterFacet[], summary?: string) =>
    renderToStaticMarkup(
      <FilterBar
        rails={[eraRail('current')]}
        facets={facets}
        onClearAll={() => {}}
        summary={summary}
      />,
    )

  it('hides the trigger when the facet has no options', () => {
    expect(render([emptyFacet])).not.toContain('filter-factions')
  })

  it('leaves the rails, the summary and the bar itself alone', () => {
    const html = render([emptyFacet], 'Showing 0 updates')
    expect(html).toContain('filter-bar')
    expect(html).toContain('filter-rail')
    expect(html).toContain('Showing 0 updates')
  })

  it('hides only the empty facet, not its populated neighbour', () => {
    const html = render([emptyFacet, factionFacet([{ slug: 'ua', status: 'visible' }], [], () => {})])
    expect(html.match(/filter-factions__trigger/g)).toHaveLength(1)
  })

  it('KEEPS the trigger for a facet whose only row is a selected zero', () => {
    // A deep link `?types=nudge` with no nudges; hiding would strand the chip.
    const html = render([
      {
        ...emptyFacet,
        options: [{ value: 'nudge', label: 'Nudge', count: 0 }],
        selected: ['nudge'],
      },
    ])
    expect(html).toContain('filter-factions__trigger')
    expect(html).toContain('Nudge')
  })

  it('never hides the FACTION facet — its roster is not count-filtered', () => {
    // No counts, and `filterRoster` always appends `na`, so never empty.
    expect(factionFacet([], [], () => {}).options).not.toHaveLength(0)
    expect(render([factionFacet([], [], () => {})])).toContain(
      'filter-factions__trigger',
    )
  })

  it('draws the ornament stack only around a selection (#3095)', () => {
    // An empty span still takes the flex `gap` and pushes the label off centre.
    const roster = [{ slug: 'ua', status: 'visible' as const }]
    expect(render([factionFacet(roster, [], () => {})])).not.toContain('filter-factions__stack')
    expect(render([factionFacet(roster, ['ua'], () => {})])).toContain('filter-factions__stack-sigil')
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

/**
 * #2431 — a filter change must show something before rows arrive: `useResource`
 * keeps stale rows during the flight, so the bar carries the pending signal.
 * Tested via the `busy` prop the filter bars pass from `loading`.
 */
describe('the bar states a read in flight (#2431)', () => {
  const SUMMARY = 'Showing 12 tasks'
  const render = (busy?: boolean) =>
    renderToStaticMarkup(
      <FilterBar
        rails={[eraRail('current')]}
        facets={[]}
        onClearAll={() => {}}
        summary={SUMMARY}
        busy={busy}
      />,
    )

  it("states the caller's summary, and claims nothing, while idle", () => {
    const html = render()
    expect(html).toContain(SUMMARY)
    expect(html).not.toContain('aria-busy')
    expect(html).not.toContain(common.filters.bar.updating)
  })

  it('marks the region busy and swaps the count for the updating copy', () => {
    // Replaces: the summary count is stale until the flight lands.
    const html = render(true)
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain(common.filters.bar.updating)
    expect(html).not.toContain(SUMMARY)
  })
})
