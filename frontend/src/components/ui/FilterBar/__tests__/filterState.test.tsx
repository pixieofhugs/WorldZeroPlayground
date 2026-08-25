/**
 * FilterBar — the pure half (#1365, generalised in #1446).
 *
 * The seam under test is `filterState.ts` plus its one shipped configuration,
 * `factionFacet.ts`: every derivation the chrome reads, with no DOM in sight.
 * The frontend harness is renderToStaticMarkup only — no jsdom, no click, no
 * effects — so the parts worth guarding are the ones that are functions of
 * state rather than of a pointer:
 *
 *   - thumbGeometry / sameBoxes — the pure half of the measured thumb (#1726).
 *     The MEASUREMENT is not reachable here and never will be: `offsetLeft` and
 *     `ResizeObserver` need a real layout. What is reachable is the decision
 *     taken from a set of measured boxes, and the fact that an unmeasured rail
 *     draws no thumb at all.
 *   - deriveChips from a filter-state object, facet chips first, with and
 *     without an ornament
 *   - the applied-count badge, which is chips.length rendered
 *   - selectEmptyState — which of the three empty states a state picks
 *   - filterRoster — `GET /factions` plus the explicit `na` sentinel, never a
 *     hardcoded roster (#1361 ruling 4)
 *   - factionFacet — the faction axis expressed in the generic shape: rows in
 *     roster order, selected first, named, and NO counts (#1361 ruling 3)
 *   - an option-less facet drawing no trigger at all (#1567), which IS reachable
 *     here: it is the absence of markup, not the contents of the panel
 *
 * The picker's rows are not reachable here: the panel is behind `open`, which
 * only a click sets. The option list they render is what `factionFacet` and
 * `FilterOption` say it is, and that is what these tests pin.
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
// The catalog itself, not a hardcoded string: the assertion has to fail if the
// key is missing, not merely if the words drift.
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
  // The tasks status rail as a viewer who can see all four states measures it:
  // "All" is 3 characters and "Pending" is 7, so the boxes are UNEQUAL. The old
  // `calc(i * track / n)` arithmetic could only say "one nth", which is what
  // forced `flex: 1` on the segment and made "Retired"/"Pending" overflow.
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

  // 2 segments logged out, 3 or 4 signed in: the same function, no segment
  // count anywhere in it.
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
    // The rail is viewer-gated: signing out drops two segments, and the render
    // that shrinks the set runs before the re-measure.
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
      // `names.ua`, which #2332 renamed from "UA". Spelled out rather than read
      // back through `factionName()` so a rename has to come THROUGH here — the
      // chip label being the faction's real name is the assertion.
      'Unwavering Artisans',
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
    // The thumb is a function of a measured rect since #1726, and this harness
    // runs no effects, so the FIRST render carries no thumb at all. That is the
    // shipped behaviour too: a thumb rendered before layout would flash at the
    // wrong place or at zero width, and `useLayoutEffect` puts the real one in
    // before the browser paints. If a thumb ever appears in this markup, some
    // fallback geometry has been reintroduced — that fallback IS the flash.
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
   * #2528. This facet is the only sigil mount in the tree that passes a `color`,
   * and the ink it passes is `factionCssVar(slug)` — the faction's one solid hue.
   * That is the point for the seven themed slugs: the mark has to read as that
   * faction at the trigger's 13px, and #2635 is what made UA's actually land.
   *
   * `na` and `albescent` both map to CSS_KEY `default`, and `--faction-default`
   * is a flat grey — so a solid handed to either paints over the spectrum they
   * own (ADR-0039 for na, #783 for the labyrinth's deliberate absence of livery).
   * The guard is on the SEAM, i.e. the element this facet builds, because that is
   * where the decision is taken; what each mark does with a `color` it is given
   * is the mark's own business and has already drifted once per adapter.
   */
  it('hands a solid ink only to a slug that owns one (#2528)', () => {
    const facet = factionFacet(VISIBLE, [], () => {})
    const inkFor = (slug: string) =>
      (facet.renderOrnament?.(slug, 'trigger') as ReactElement<FactionSigilProps>)
        .props.color

    // The seven themed marks keep their hue, at every size.
    expect(inkFor('ua')).toBe('var(--faction-ua)')
    expect(inkFor('singularity')).toBe('var(--faction-singularity)')

    // The two that own a spectrum get NO ink, and fall through to it.
    for (const slug of ['na', 'albescent']) {
      expect(isKnownFaction(slug)).toBe(false)
      expect(inkFor(slug)).toBeUndefined()
    }

    // And the rule is the predicate, not a two-name denylist: an unregistered
    // slug resolves to `default` too, so it must not be inked grey either.
    expect(inkFor('not-a-faction')).toBeUndefined()
  })
})

describe('an option-less facet draws no trigger (#1567)', () => {
  // A facet is allowed to narrow itself to nothing: Updates' type facet hides
  // zero-count rows, so a quiet board leaves it empty. `OptionPicker` returns
  // null rather than opening a panel with no rows in it. `FilterBar` maps facets
  // to pickers unconditionally and is deliberately not the place this lives.
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
    // One trigger, not two: the faction facet still draws.
    expect(html.match(/filter-factions__trigger/g)).toHaveLength(1)
  })

  it('KEEPS the trigger for a facet whose only row is a selected zero', () => {
    // The shape `typeFacetOptions` returns for a deep link like `?types=nudge`
    // on a board with no nudges. Hiding it would strand the chip.
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
    // #1567 guessed this was the same bug; it is not. `factionFacet` carries no
    // counts at all (#1361 ruling 3) and `filterRoster` always appends the `na`
    // sentinel, so its option list is non-empty even before GET /factions
    // answers. Nothing to fix, and nothing to "restore" either.
    expect(factionFacet([], [], () => {}).options).not.toHaveLength(0)
    expect(render([factionFacet([], [], () => {})])).toContain(
      'filter-factions__trigger',
    )
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
 * #2431 — a filter change has to say something before the rows arrive.
 *
 * `useResource` keeps the previous rows in `data` for the whole flight (that is
 * what stops the list flashing empty), and every list surface spells its
 * loading branch as `loading && items.length === 0` — so after first paint a
 * facet click changed nothing on screen at all. The bar is the one component
 * both mounting pages share, so the pending signal lives here.
 *
 * This is the props-level seam, and it is the ONLY one this harness can reach:
 * `renderToStaticMarkup` runs no effects, so a `useResource`-driven render is
 * always `data: null, loading: true` — the empty branch. `busy` passed directly
 * is exactly what `TaskFilterBar`/`PraxisFilterBar` do with their `loading`.
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
    // Replaces rather than joins: the count in `summary` is the STALE one until
    // the flight lands, so printing it beside "Updating…" would state a number
    // the bar is in the middle of disproving.
    const html = render(true)
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain(common.filters.bar.updating)
    expect(html).not.toContain(SUMMARY)
  })
})
