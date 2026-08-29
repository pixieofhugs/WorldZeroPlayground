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
interface FilterSegment {
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
interface AppliedChip {
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
 * `min-width` is `auto`, so a segment never shrinks below its label. Since
 * #1726 a segment is sized to its own label plus horizontal padding, so a rail
 * of C characters over S segments is `0.6 * fontSize * C + 2 * pad * S + 9`
 * wide at its narrowest (Courier Prime advances 0.6em; the rail itself costs
 * 9px of pad and border). At the phone's `--text-lg` (12px) and `--space-sm`
 * (8px) of segment padding, the widest rail the site mounts — the praxis sort,
 * 33 characters over 4 segments — is 311px against a 311px content box at a
 * 375px viewport (`.page` is `px-4`, `.filter-bar__body` is `--space-lg` on the
 * phone). Past that the rail WRAPS to a second row rather than overflowing the
 * page: `.filter-rail` is `flex-wrap: wrap` with `max-width: 100%`, and the
 * thumb is measured, so it lands on the active segment's row either way.
 * Widening past 6 means re-running that arithmetic, not deleting this comment.
 */
export const RAIL_SEGMENTS_MIN = 2
export const RAIL_SEGMENTS_MAX = 6

/**
 * One measured segment, in CSS px relative to the rail's padding box — that is,
 * `offsetLeft`/`offsetTop`/`offsetWidth`/`offsetHeight` against the rail, which
 * is the same origin an absolutely positioned thumb resolves `left`/`top`
 * against. Deliberately plain numbers: the measuring is the component's job,
 * and everything decided FROM a measurement lives here where a DOM-less harness
 * can reach it.
 */
export interface SegmentBox {
  left: number
  top: number
  width: number
  height: number
}

/** Inline geometry for the sliding thumb. */
interface ThumbGeometry {
  left: string
  top: string
  width: string
  height: string
}

/**
 * Where the thumb goes: exactly over the measured active segment (#1726).
 *
 * `null` means "not measurable yet" and the caller must draw no thumb at all —
 * before layout there is no honest answer, and any fallback (zero width, an
 * assumed 1/n share) IS the first-paint flash. The rail is viewer-gated, so the
 * render that changes the segment count arrives before the re-measure does;
 * that is the out-of-range case, not an error.
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

/**
 * Did anything actually move? A `ResizeObserver` fires once per observed
 * element the moment it is observed, so a re-measure that always stores a fresh
 * array would re-render on every observation for no reason. Holding the old
 * array when the numbers match keeps that to one render.
 */
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
