/**
 * FilterBar — the pure half (#1365, epic #1361).
 *
 * Everything the bar's chrome reads that is a function of state rather than of
 * a pointer lives here, so it can be guarded by a harness that has no DOM.
 * The components in this folder hold no derivation of their own.
 */
import type { FactionOut } from '../../../api/factions'
import {
  factionName,
  sortFactionsByRainbowOrder,
  UNAFFILIATED_FACTION_SLUG,
} from '../../../utils/factions'

/** One choice on a rail. `value` is what the page stores and puts in the URL. */
export interface FilterSegment {
  value: string
  label: string
}

/**
 * A segmented rail: one value, one `ORDER BY`, 2 to 4 segments (#1361 ruling 5).
 * Rails never compose — two rails are two independent axes, not two halves of
 * one sort key.
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

/** A removable statement of one applied filter. */
export interface AppliedChip {
  key: string
  label: string
  /** Set only for faction chips — the chip wears that faction's sigil. */
  slug?: string
  remove: () => void
}

/**
 * A rail takes 2 to 4 segments. Stated as constants rather than enforced with a
 * throw: the praxis sort rail is 4 (newest / oldest / most voted / least voted)
 * and the task sort rail is 3 (level / newest / oldest), so the range is the
 * shipped spread and not a guess.
 *
 * ponytail: no runtime guard. A 5-segment rail renders — narrowly, but it
 * renders. If a fifth axis ever wants one, widen the number here and re-measure
 * the label ellipsis rather than adding a throw a page can only hit in prod.
 */
export const RAIL_SEGMENTS_MIN = 2
export const RAIL_SEGMENTS_MAX = 4

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

/**
 * The faction roster the picker offers: `GET /factions` in rainbow order plus
 * the explicit `na` sentinel, appended last (#1361 ruling 4).
 *
 * This is `FilterFactionTabs`' rationale, unchanged. `na` is a state rather
 * than a faction (ADR-0030 / ADR-0039), so it is deliberately absent from
 * `GET /factions` and from `FACTION_RAINBOW_ORDER`; cross-faction is the
 * commonest kind of task and the one slice you could not otherwise isolate, so
 * the filter supplies it by hand. The design's hardcoded nine is the thing this
 * must not be: `/factions` returns visible factions only, so `albescent` is
 * absent pre-reveal (ADR-0027) and a literal list would leak it.
 */
export function filterRoster(factions: FactionOut[]): string[] {
  const visible = sortFactionsByRainbowOrder(factions)
    .map((faction) => faction.slug)
    .filter((slug) => slug !== UNAFFILIATED_FACTION_SLUG)
  return [...visible, UNAFFILIATED_FACTION_SLUG]
}

/** Selected rows to the top, roster order preserved inside each group. */
export function selectedFirst(roster: string[], selected: string[]): string[] {
  return [
    ...roster.filter((slug) => selected.includes(slug)),
    ...roster.filter((slug) => !selected.includes(slug)),
  ]
}

/** Multi-select toggle. Never mutates. */
export function toggleFaction(selected: string[], slug: string): string[] {
  return selected.includes(slug)
    ? selected.filter((each) => each !== slug)
    : [...selected, slug]
}

/**
 * One chip per active filter — faction chips first, then rails in mount order,
 * matching the design. A rail on its `defaultValue` is not an active filter.
 */
export function deriveChips({
  rails,
  selectedFactions,
  onFactionsChange,
}: {
  rails: FilterRail[]
  selectedFactions: string[]
  onFactionsChange: (slugs: string[]) => void
}): AppliedChip[] {
  const factionChips: AppliedChip[] = selectedFactions.map((slug) => ({
    key: `faction:${slug}`,
    label: factionName(slug),
    slug,
    remove: () => onFactionsChange(toggleFaction(selectedFactions, slug)),
  }))
  const railChips: AppliedChip[] = rails
    .filter((rail) => rail.value !== rail.defaultValue)
    .map((rail) => ({
      key: `rail:${rail.key}`,
      label:
        rail.segments.find((segment) => segment.value === rail.value)?.label ??
        rail.value,
      remove: () => rail.onChange(rail.defaultValue),
    }))
  return [...factionChips, ...railChips]
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
