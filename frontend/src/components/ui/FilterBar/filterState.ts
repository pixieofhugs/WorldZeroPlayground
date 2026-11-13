/**
 * FilterBar's pure half (#1365, #1446): every state derivation, testable
 * without a DOM. Faction-agnostic; see `factionFacet.tsx`.
 */
import type { ReactNode } from 'react'

/** `value` is what the page stores and puts in the URL. */
interface FilterSegment {
  value: string
  label: string
}

/**
 * A segmented rail: one value, 2 to 6 segments (#1361 ruling 5); rails are
 * independent axes. `defaultValue` (not always the first segment, ruling 6)
 * raises no chip.
 */
export interface FilterRail {
  key: string
  /** Group accessible name. */
  label: string
  value: string
  defaultValue: string
  segments: FilterSegment[]
  onChange: (value: string) => void
}

export type OrnamentPlace = 'row' | 'trigger' | 'chip'

export interface FilterOption {
  value: string
  label: string
  /**
   * Deliberately not uniform: faction counts are cut (#1361 ruling 3), Updates'
   * type counts ship (#1419). Don't "correct" one against the other.
   */
  count?: number
}

/** A multi-select facet. Rows arrive in display order; sorting is the caller's. */
export interface FilterFacet {
  /** Namespaces this facet's chips. */
  key: string
  /** Trigger text and panel accessible name. */
  label: string
  options: FilterOption[]
  selected: string[]
  onChange: (values: string[]) => void
  /** Optional leading ornament, sized per place. */
  renderOrnament?: (value: string, place: OrnamentPlace) => ReactNode
}

/** A removable statement of one applied filter. */
interface AppliedChip {
  key: string
  label: string
  ornament?: ReactNode
  remove: () => void
}

/**
 * ponytail: no runtime guard; 6 is a measurement, not an enforced limit. A rail
 * of C chars over S segments is `0.6 * fontSize * C + 2 * pad * S + 9` px at
 * narrowest (Courier Prime 0.6em); the praxis sort (33 chars, 4 segs) exactly
 * fills a 375px phone. Past that the rail wraps (`flex-wrap`). Widening past 6
 * means re-running that arithmetic.
 */
export const RAIL_SEGMENTS_MIN = 2
export const RAIL_SEGMENTS_MAX = 6

/** One measured segment: `offset*` px against the rail's padding box. */
export interface SegmentBox {
  left: number
  top: number
  width: number
  height: number
}

interface ThumbGeometry {
  left: string
  top: string
  width: string
  height: string
}

/**
 * The thumb over the measured active segment (#1726). `null` = not measured
 * (or count changed before re-measure): draw no thumb; any fallback flashes.
 */
export function thumbGeometry(
  boxes: SegmentBox[],
  activeIndex: number,
): ThumbGeometry | null {
  const box = boxes[activeIndex]
  if (!box || box.width <= 0 || box.height <= 0) return null
  return {
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  }
}

/** Equal boxes, so a `ResizeObserver` re-measure can keep the old array. */
export function sameBoxes(before: SegmentBox[], after: SegmentBox[]): boolean {
  return (
    before.length === after.length &&
    before.every(
      (box, index) =>
        box.left === after[index].left &&
        box.top === after[index].top &&
        box.width === after[index].width &&
        box.height === after[index].height,
    )
  )
}

export function selectedFirst(values: string[], selected: string[]): string[] {
  return [
    ...values.filter((value) => selected.includes(value)),
    ...values.filter((value) => !selected.includes(value)),
  ]
}

export function toggleOption(selected: string[], value: string): string[] {
  return selected.includes(value)
    ? selected.filter((each) => each !== value)
    : [...selected, value]
}

/** One chip per active filter: facet chips first, then rails off their default. */
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

/** The three empty states (#1361 ruling 9). */
export type EmptyStateKind = 'register' | 'filtered' | 'caughtUp'

/**
 * `caughtUp` only when the personal rail is the sole filter; with another
 * filter on, "caught up" is unknowable.
 */
export function selectEmptyState(
  appliedCount: number,
  personalFilterApplied: boolean,
): EmptyStateKind {
  if (appliedCount === 0) return 'register'
  if (personalFilterApplied && appliedCount === 1) return 'caughtUp'
  return 'filtered'
}
