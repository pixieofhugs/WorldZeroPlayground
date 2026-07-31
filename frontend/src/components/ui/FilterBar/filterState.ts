/**
 * FilterBar — the pure half (#1365, generalised in #1446).
 *
 * Everything the bar's chrome reads that is a function of state rather than of
 * a pointer lives here, so it can be guarded by a harness that has no DOM.
 * The components in this folder hold no derivation of their own.
 *
 * Nothing here knows what a faction is. The faction facet is one configuration
 * of the generic multi-select and lives in `factionFacet.ts` (#1446).
 */
import type { ReactNode } from 'react'

/** One choice on a rail. `value` is what the page stores and puts in the URL. */
export interface FilterSegment {
  value: string
  label: string
}

/**
 * A segmented rail: one value, one `ORDER BY`, 2 to 6 segments (#1361 ruling 5,
 * widened in #1446). Rails never compose — two rails are two independent axes,
 * not two halves of one sort key.
 *
 * `defaultValue` is what "not filtering" means for this axis, and it is not
 * always the first segment: the era rail defaults to *this era* and the tasks
 * sort rail defaults to *level* (#1361 ruling 6). A rail sitting on its default
 * raises no chip and does not count toward the applied badge.
 */
export interface FilterRail {
  key: string
  /** The rail's accessible name — a group label, not a segment label. */
  label: string
  value: string
  defaultValue: string
  segments: FilterSegment[]
  onChange: (value: string) => void
}

/** Where a facet's optional ornament is being drawn. Sizes differ per place. */
export type OrnamentPlace = 'row' | 'trigger' | 'chip'

/** One row of a multi-select facet. */
export interface FilterOption {
  value: string
  label: string
  /**
   * Optional trailing count. Absent by default and deliberately not uniform
   * across facets (#1446): faction counts are CUT (#1361 ruling 3 — a windowed
   * page cannot derive them), type counts on Updates SHIP (#1419 decision 4 —
   * the backend already builds the dict and discards it). Do not "correct" one
   * against the other.
   */
  count?: number
}

/**
 * A multi-select facet: an option list, the selection, and an optional leading
 * ornament. Rows arrive in display order — sorting (selected-first, rainbow
 * order, whatever the axis means by it) is the caller's, not the widget's.
 */
export interface FilterFacet {
  /** Namespaces this facet's chips. `faction`, `type`, … */
  key: string
  /** The facet's name — the trigger's text and the panel's accessible name. */
  label: string
  options: FilterOption[]
  selected: string[]
  onChange: (values: string[]) => void
  /**
   * Optional leading ornament — a faction sigil, a colour dot, nothing. Called
   * for each of the three places it can appear, which want different sizes.
   * A facet without one renders as checkbox + label.
   */
  renderOrnament?: (value: string, place: OrnamentPlace) => ReactNode
}

/** A removable statement of one applied filter. */
export interface AppliedChip {
  key: string
  label: string
  /** Set only when the chip's facet draws one — see `FilterFacet`. */
  ornament?: ReactNode
  remove: () => void
}

/**
 * A rail takes 2 to 6 segments. Stated as constants rather than enforced with a
 * throw: the praxis sort rail is 4 (newest / oldest / most voted / least voted),
 * the task sort rail is 3 (level / newest / oldest) and Updates' relationship
 * rail is 5 (all / your stuff / friends / foes / global), so the range is the
 * shipped spread and not a guess.
 *
 * ponytail: no runtime guard, and 6 is a measurement rather than a limit the
 * code enforces. There is no ellipsis on `.filter-rail__segment` — it is
 * `white-space: nowrap` with no `overflow`/`text-overflow`, and a flex item's
 * `min-width` is `auto`, so a segment never shrinks below its label. The
 * failure mode past the ceiling is therefore clipping (`.filter-bar` is
 * `overflow: hidden`), not an ellipsis. Courier Prime advances 0.6em, segments
 * carry no horizontal padding, and the rail costs 9px of pad and border, so a
 * rail of C characters is `0.6 * fontSize * C + 9` wide at its narrowest.
 * The 5-segment relationship rail is 30 characters: 261px at the desktop
 * `--text-xl` (14px), 225px at the phone's `--text-lg` (12px) against a 240px
 * content box at a 320px viewport (`.page` is `px-4`, `.filter-bar__body` is
 * `--space-xl`). It fits, with ~15px to spare at 320px and ~70px at 375px.
 * Widening past 6 — or past ~32 characters on a five-up — means re-running that
 * arithmetic, not deleting this comment.
 */
export const RAIL_SEGMENTS_MIN = 2
export const RAIL_SEGMENTS_MAX = 6

// The rail's inner padding, as the token `.filter-rail` is drawn with. The
// design writes this maths as `calc(i * (100% - 6px) / n + 3px)`; the literal
// 6/3 is that padding doubled and single, so it is read from index.css here
// instead of restated — a number in two files is a number that drifts.
const RAIL_PAD = 'var(--filter-rail-pad)'
const TRACK = `(100% - 2 * ${RAIL_PAD})`

/** Left edge of the sliding thumb over segment `index` of `segmentCount`. */
export function thumbOffset(index: number, segmentCount: number): string {
  return `calc(${index} * ${TRACK} / ${segmentCount} + ${RAIL_PAD})`
}

/** Width of the sliding thumb — one nth of the track. */
export function thumbWidth(segmentCount: number): string {
  return `calc(${TRACK} / ${segmentCount})`
}

/** Selected rows to the top, list order preserved inside each group. */
export function selectedFirst(values: string[], selected: string[]): string[] {
  return [
    ...values.filter((value) => selected.includes(value)),
    ...values.filter((value) => !selected.includes(value)),
  ]
}

/** Multi-select toggle. Never mutates. */
export function toggleOption(selected: string[], value: string): string[] {
  return selected.includes(value)
    ? selected.filter((each) => each !== value)
    : [...selected, value]
}

/**
 * One chip per active filter — facet chips first, then rails in mount order,
 * matching the design. A rail on its `defaultValue` is not an active filter.
 */
export function deriveChips({
  rails,
  facets,
}: {
  rails: FilterRail[]
  facets: FilterFacet[]
}): AppliedChip[] {
  const facetChips: AppliedChip[] = facets.flatMap((facet) =>
    facet.selected.map((value) => ({
      key: `${facet.key}:${value}`,
      label:
        facet.options.find((option) => option.value === value)?.label ?? value,
      ornament: facet.renderOrnament?.(value, 'chip'),
      remove: () => facet.onChange(toggleOption(facet.selected, value)),
    })),
  )
  const railChips: AppliedChip[] = rails
    .filter((rail) => rail.value !== rail.defaultValue)
    .map((rail) => ({
      key: `rail:${rail.key}`,
      label:
        rail.segments.find((segment) => segment.value === rail.value)?.label ??
        rail.value,
      remove: () => rail.onChange(rail.defaultValue),
    }))
  return [...facetChips, ...railChips]
}

/** Which of the three empty states a list should show (#1361 ruling 9). */
export type EmptyStateKind = 'register' | 'filtered' | 'caughtUp'

/**
 * `register` — nothing is filtered and the register itself is empty.
 * `caughtUp` — the personal rail ("needs my vote" / "I can sign up") is the
 *              ONLY thing narrowing the list, so the claim is checkable.
 * `filtered` — everything else.
 *
 * The design collapses all three into "All caught up / Nothing is waiting on
 * your vote", which is a claim it has not checked: filter to a faction with no
 * praxes and it lies. Hence the `appliedCount === 1` guard — with a second
 * filter on, being caught up is unknowable from here.
 */
export function selectEmptyState(
  appliedCount: number,
  personalFilterApplied: boolean,
): EmptyStateKind {
  if (appliedCount === 0) return 'register'
  if (personalFilterApplied && appliedCount === 1) return 'caughtUp'
  return 'filtered'
}
