/**
 * The Updates page's filter axes as URL params, the pure half of `useUpdates`
 * (#1421); mirrors `pages/praxes/feedFilterParams.ts`.
 *
 * | axis | param | shape |
 * |---|---|---|
 * | relationship | `?filter=` | single-select, 5 segments, `all` is "off" |
 * | state | `?state=` | Inbox / Archived, `inbox` is "off" |
 * | type | `?types=` | multi-select over the feed types, repeated bare key |
 *
 * {@link toFeedQuery} is the only place URL state becomes a request.
 */
import i18n from '../../i18n'
import {
  selectedFirst,
  selectEmptyState,
  type EmptyStateKind,
  type FilterFacet,
  type FilterOption,
} from '../../components/ui/FilterBar/filterState'

export const RELATIONSHIP_PARAM = 'filter'
export const STATE_PARAM = 'state'
export const TYPE_PARAM = 'types'

/** The relationship rail; values are `GET /activity-feed?filter=` wire values. */
export type FeedRelationship = 'all' | 'your_stuff' | 'friends' | 'foes' | 'global'

export const RELATIONSHIPS: readonly FeedRelationship[] = [
  'all',
  'your_stuff',
  'friends',
  'foes',
  'global',
]

export const RELATIONSHIP_DEFAULT: FeedRelationship = 'all'

/**
 * Keys written out: template literals don't typecheck and hide from the
 * unused-key sweep. Rail width budget is measured in `filterState.ts`.
 */
export const RELATIONSHIP_LABEL_KEY = {
  all: 'filter.relationship.all',
  your_stuff: 'filter.relationship.yourStuff',
  friends: 'filter.relationship.friends',
  foes: 'filter.relationship.foes',
  global: 'filter.relationship.global',
} as const satisfies Record<FeedRelationship, string>

/** `inbox` is "off" and stays out of the URL. */
export const STATE_INBOX = 'inbox'
export const STATE_ARCHIVED = 'archived'

/**
 * Legacy `?filter=archived` deep links (#1194) resolve to the state axis;
 * `?filter=requests` (ADR-0070) degrades to the default.
 */
const LEGACY_ARCHIVED_TOKEN = 'archived'

/** Replace, never push, so Back leaves the feed. */
export const UPDATES_NAV_OPTIONS = { replace: true } as const

export interface UpdatesFilters {
  relationship: FeedRelationship
  archived: boolean
  /** Empty means no type constraint. */
  types: string[]
}

export const CLEARED_FILTERS: UpdatesFilters = {
  relationship: RELATIONSHIP_DEFAULT,
  archived: false,
  types: [],
}

/**
 * Untrusted URL degrades to something sensible. Invariant: archived implies the
 * default relationship, since `_visible_types` ignores `filter` when archived.
 */
export function readUpdatesFilters(params: URLSearchParams): UpdatesFilters {
  const token = params.get(RELATIONSHIP_PARAM)
  const archived =
    params.get(STATE_PARAM) === STATE_ARCHIVED || token === LEGACY_ARCHIVED_TOKEN
  const relationship = RELATIONSHIPS.includes(token as FeedRelationship)
    ? (token as FeedRelationship)
    : RELATIONSHIP_DEFAULT
  return {
    relationship: archived ? RELATIONSHIP_DEFAULT : relationship,
    archived,
    types: params.getAll(TYPE_PARAM).filter((type) => type !== ''),
  }
}

/**
 * The next param set; "not filtering" values are removed, foreign params kept.
 * Normalises like reading, so legacy `?filter=archived` rewrites on first touch.
 */
export function nextUpdatesParams(
  previous: URLSearchParams,
  patch: Partial<UpdatesFilters>,
): URLSearchParams {
  const merged = { ...readUpdatesFilters(previous), ...patch }
  const next = new URLSearchParams(previous)
  next.delete(RELATIONSHIP_PARAM)
  next.delete(STATE_PARAM)
  next.delete(TYPE_PARAM)

  const relationship = merged.archived ? RELATIONSHIP_DEFAULT : merged.relationship
  if (relationship !== RELATIONSHIP_DEFAULT) {
    next.set(RELATIONSHIP_PARAM, relationship)
  }
  if (merged.archived) next.set(STATE_PARAM, STATE_ARCHIVED)
  for (const type of merged.types) next.append(TYPE_PARAM, type)
  return next
}

/** Every axis unfiltered, state included: an empty archive must not be a dead end. */
export function clearedUpdatesParams(previous: URLSearchParams): URLSearchParams {
  return nextUpdatesParams(previous, CLEARED_FILTERS)
}

/** The one place URL state becomes a wire call. */
export function toFeedQuery(filters: UpdatesFilters): {
  filter: FeedRelationship
  archived: boolean
  types: string[] | undefined
} {
  return {
    filter: filters.relationship,
    archived: filters.archived,
    // Empty means "no constraint", never "match nothing".
    types: filters.types.length > 0 ? filters.types : undefined,
  }
}

/**
 * Filters narrowing the list, for `selectEmptyState`. Excludes Inbox/Archived:
 * it picks which pile, and counting it would make "archive is empty" unreachable.
 */
export function appliedFilterCount(filters: UpdatesFilters): number {
  return (
    filters.types.length +
    (filters.relationship === RELATIONSHIP_DEFAULT ? 0 : 1)
  )
}

/** Empty state for an empty list (#1361); `caughtUp` is unreachable: no personal rail. */
export function selectUpdatesEmptyState(filters: UpdatesFilters): EmptyStateKind {
  return selectEmptyState(appliedFilterCount(filters), false)
}

/**
 * Every feed type in facet order (news first, obligations last) to its label
 * key, mostly `feed:kicker.*`. The two completions share a kicker, so they get
 * their own keys. Full keys stored: template literals don't typecheck.
 */
export const FEED_TYPE_LABEL_KEY = {
  vote_on_mine: 'feed:kicker.vote_on_mine',
  vote_changed_on_mine: 'feed:kicker.vote_changed_on_mine',
  friend_completion: 'feed:filter.typeName.friendCompletion',
  foe_completion: 'feed:filter.typeName.foeCompletion',
  friend_signup: 'feed:kicker.friend_signup',
  collaborator_submitted: 'feed:kicker.collaborator_submitted',
  nudge: 'feed:kicker.nudge',
  comment_mention: 'feed:kicker.comment_mention',
  comment_on_mine: 'feed:kicker.comment_on_mine',
  foe_taunt: 'feed:kicker.foe_taunt',
  friend_defection: 'feed:kicker.friend_defection',
  global_task: 'feed:kicker.global_task',
  era_announcement: 'feed:kicker.era_announcement',
  invitation_letter: 'feed:kicker.invitation_letter',
  collab_invite: 'feed:kicker.collab_invite',
  duel_challenge: 'feed:kicker.duel_challenge',
  awaiting_submission: 'feed:kicker.awaiting_submission',
} as const satisfies Record<string, string>

/** One type's row label, falling back to the raw value for an unknown type. */
export function feedTypeLabel(type: string): string {
  return type in FEED_TYPE_LABEL_KEY
    ? i18n.t(FEED_TYPE_LABEL_KEY[type as keyof typeof FEED_TYPE_LABEL_KEY])
    : type
}

/**
 * The type facet's rows. Zero-count rows hide, but a selected type keeps its row
 * so it can be un-ticked (`deriveChips` reads labels here). May be empty (#1567).
 */
export function typeFacetOptions(
  byType: Record<string, number>,
  selected: string[],
): FilterOption[] {
  const candidates = [
    ...Object.keys(FEED_TYPE_LABEL_KEY),
    ...Object.keys(byType),
    ...selected,
  ].filter((type, index, all) => all.indexOf(type) === index)

  const rows = candidates.filter(
    (type) => (byType[type] ?? 0) > 0 || selected.includes(type),
  )

  return selectedFirst(rows, selected).map((type) => ({
    value: type,
    label: feedTypeLabel(type),
    count: byType[type] ?? 0,
  }))
}

/** The type axis as a `FilterFacet`, sibling of `factionFacet` (#1446); no hook. */
export function typeFacet(
  byType: Record<string, number>,
  selected: string[],
  onChange: (types: string[]) => void,
): FilterFacet {
  return {
    key: 'type',
    label: i18n.t('feed:filter.type'),
    options: typeFacetOptions(byType, selected),
    selected,
    onChange,
  }
}
