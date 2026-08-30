/**
 * The Updates page's filter axes, as URL params — the pure half of `useUpdates`
 * (#1421, epic #1419 decision 23).
 *
 * Before this, the page had ONE axis: a seven-way single-select tab set read
 * from `?filter=` exactly once, in a `useState` initializer, and never written
 * back. Clicking a tab did not change the address bar, a filtered feed was not
 * a link you could share, and Back did not undo anything. Three axes make that
 * worse fast, so all three live here and all three are written back.
 *
 * Kept out of the hook because the repo's harness is `renderToStaticMarkup`
 * only: a self-fetching feed cannot be driven from a test, so the derivations
 * that carry the guarantees live where they can be asserted. Same posture as
 * `pages/praxes/feedFilterParams.ts`, which this file follows closely.
 *
 * ## The three axes
 *
 * | axis | param | shape |
 * |---|---|---|
 * | relationship | `?filter=` | single-select, 5 segments, `all` is "off" |
 * | state | `?state=` | Inbox / Archived, `inbox` is "off" |
 * | type | `?types=` | multi-select over the 15 feed types, repeated bare key |
 *
 * The old code carried a `FILTER_API_MAP` / `FILTER_URL_MAP` pair, because
 * `Archived` and `All` sent the SAME wire filter and so could not share one
 * map: resolving `?filter=` through the API map made `?filter=archived`
 * unreachable and `?filter=all` ambiguous. That collision is gone — archived-ness
 * moved to its own param, which is what it always was — so a second Record
 * holding identical values would now be a number in two files rather than a
 * seam. What the split protected is kept as a FUNCTION instead:
 * {@link toFeedQuery} is the only place a URL state becomes a request, and it
 * is where the two layers stay free to differ. They already do — the state axis
 * writes the token `archived` and sends the boolean `archived=true`.
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

/**
 * The relationship rail — five segments, single-select (epic decision 2).
 *
 * The values ARE the wire values `GET /activity-feed?filter=` already accepts,
 * so this axis costs zero backend work. The design draws the same axis twice
 * (a `who` segment AND an `audience` multi-select whose first row is "Your
 * stuff"); two controls on one axis will disagree, so there is one rail.
 */
export type FeedRelationship = 'all' | 'your_stuff' | 'friends' | 'foes' | 'global'

/** Rail order, and the order the segments are drawn in. */
export const RELATIONSHIPS: readonly FeedRelationship[] = [
  'all',
  'your_stuff',
  'friends',
  'foes',
  'global',
]

export const RELATIONSHIP_DEFAULT: FeedRelationship = 'all'

/**
 * Label keys, written out rather than interpolated: the `feed` catalog is typed
 * (`i18next.d.ts`), so a template literal does not typecheck — and a computed
 * key is invisible to the unused-key sweep either way.
 *
 * `your_stuff` is "Your Stuff" and not the phone's old "Yours". The rail's
 * width budget was measured at exactly these five labels — 30 characters,
 * 261px desktop / 225px phone against a 240px content box at 320px — in
 * `filterState.ts`. Abbreviating is not needed and lengthening is not free.
 */
export const RELATIONSHIP_LABEL_KEY = {
  all: 'filter.relationship.all',
  your_stuff: 'filter.relationship.yourStuff',
  friends: 'filter.relationship.friends',
  foes: 'filter.relationship.foes',
  global: 'filter.relationship.global',
} as const satisfies Record<FeedRelationship, string>

/** The Inbox/Archived state segment. `inbox` is "off" and stays out of the URL. */
export const STATE_INBOX = 'inbox'
export const STATE_ARCHIVED = 'archived'

/**
 * Deep-link tokens from the seven-tab era (#1194) that are no longer members of
 * `?filter=`, and still arrive from links in the wild.
 *
 * `archived` was the seventh tab and is now the state axis — it keeps working,
 * resolved to `state=archived`. `requests` was the sixth and is DELETED
 * (ADR-0070: under "an unanswered obligation lives in the queue", the tab was
 * byte-for-byte the queue), so it degrades to the default rail rather than
 * 404ing a bookmark. Every in-app link to it now points at the queue anchor
 * instead — see `requestsQueueAnchor.ts`.
 */
const LEGACY_ARCHIVED_TOKEN = 'archived'

/**
 * Replace, never push. A rail tap is a re-read of the same page, not a new one;
 * pushing would make Back walk the filter history one segment at a time instead
 * of leaving the feed. Matches `FEED_FILTER_NAV_OPTIONS` on the praxis feed.
 */
export const UPDATES_NAV_OPTIONS = { replace: true } as const

export interface UpdatesFilters {
  relationship: FeedRelationship
  /** Reading the archive rather than the inbox. State, never a type-set. */
  archived: boolean
  /** The type facet's selection. Empty means no type constraint. */
  types: string[]
}

/** What a bare `/updates` shows, and what "clear all filters" restores. */
export const CLEARED_FILTERS: UpdatesFilters = {
  relationship: RELATIONSHIP_DEFAULT,
  archived: false,
  types: [],
}

/**
 * A URL is untrusted input, and this is a read projection: a hand-edited,
 * truncated or simply stale link must degrade to something sensible rather than
 * erroring or matching nothing.
 *
 * One invariant is enforced here rather than at every call site: **archived
 * implies the default relationship.** The backend's `_visible_types` returns
 * the whole `all` set whenever `archived=true` and ignores `filter` completely
 * — a player looking for something they put away should not have to remember
 * which tab they put it away from. So `?filter=friends&state=archived` cannot
 * mean anything, and normalising it here is what stops the bar drawing a
 * "Friends" chip for an axis the server is not applying.
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
 * The next param set for a filter change. Values that mean "not filtering" are
 * REMOVED rather than written, so a clean feed keeps a clean address instead of
 * accumulating `?filter=all&state=inbox`. Params this module does not own are
 * carried through untouched.
 *
 * Writing normalises exactly as reading does, which is also how a legacy
 * `?filter=archived` link rewrites itself into `?state=archived` the first time
 * the player touches any control.
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

/**
 * "Clear all filters" — every axis back to its unfiltered value, the state
 * segment included. Returning to the Inbox is part of what the button promises:
 * an empty archive that stays empty after clearing would be a dead end, and the
 * button is offered from an empty list precisely as the way out of one.
 */
export function clearedUpdatesParams(previous: URLSearchParams): URLSearchParams {
  return nextUpdatesParams(previous, CLEARED_FILTERS)
}

/**
 * The request these filters make. The one place a URL state becomes a wire
 * call, and the seam the old API-map / URL-map pair existed to hold open.
 */
export function toFeedQuery(filters: UpdatesFilters): {
  filter: FeedRelationship
  archived: boolean
  types: string[] | undefined
} {
  return {
    filter: filters.relationship,
    archived: filters.archived,
    // An empty multi-select means "no type constraint", never "match nothing".
    types: filters.types.length > 0 ? filters.types : undefined,
  }
}

/**
 * How many filters are NARROWING the list — the number `selectEmptyState`
 * reads, not the number of chips on screen.
 *
 * The Inbox/Archived state is deliberately excluded. It selects WHICH pile you
 * are reading rather than how much of that pile is hidden, and counting it
 * would make "The archive is empty" unreachable: every empty archive would
 * instead claim to be a filtering accident and offer to clear filters that were
 * never applied. The same reasoning `narrowingFilterCount` uses to leave sort
 * and era scope out on the praxis feed.
 */
export function appliedFilterCount(filters: UpdatesFilters): number {
  return (
    filters.types.length +
    (filters.relationship === RELATIONSHIP_DEFAULT ? 0 : 1)
  )
}

/**
 * Which empty state an empty list gets (#1361 ruling 9, epic #1419 decision 24).
 *
 * `caughtUp` is unreachable here and the `false` says so: it is the claim "the
 * personal rail is the only thing narrowing this, so being caught up is
 * checkable", and the feed has no personal rail. "Your Stuff" is a slice of
 * other people's news about you, not a work queue you can be done with.
 *
 * `register` still splits two ways at the call site — an empty inbox and an
 * empty archive say different things and are never collapsed (see
 * `FeedEmptyState`).
 */
export function selectUpdatesEmptyState(filters: UpdatesFilters): EmptyStateKind {
  return selectEmptyState(appliedFilterCount(filters), false)
}

/**
 * Every feed type, in facet order, mapped to its label key.
 *
 * Fourteen of the sixteen point at `feed:kicker.*` — the eyebrow a card already
 * prints for that type, which is the same question the facet row asks ("what
 * kind of update is this") and exactly the wording the design chose for these
 * rows. Two do not: `friend_completion` and `foe_completion` share the single
 * kicker "Task completed", which is fine above a card that names the actor and
 * useless as two identical checkbox rows with two different counts. Those two
 * get their own keys and nothing else is duplicated.
 *
 * Order is news first, obligations last. The four obligations only ever appear
 * on Archived — ADR-0070 keeps an unanswered one out of the live stream — so
 * they sort to the bottom where they will usually be absent.
 *
 * No ornament. The design gives each row a coloured dot drawn from a faction
 * hue (`--faction-wow` for "Task completed", `--faction-coven` for "Era"), which
 * is a faction colour used as chrome for a non-faction axis, and the faction
 * axis itself is deliberately unbuilt (decision 1). Checkbox, label, count.
 *
 * Keys are stored namespace-and-all rather than assembled at the call site: the
 * `feed` catalog is typed, and interpolating the namespace produces a template
 * literal, which does not typecheck against a key union.
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
 * The rows the type facet offers, in display order.
 *
 * **Zero-count rows are hidden** (decision 20, and CLAUDE.md's "hide unusable
 * controls; don't show them disabled"). This needs no special-casing for
 * ADR-0070: on the Inbox the four request types count 0 and drop off by
 * themselves; on Archived they come back.
 *
 * A SELECTED type always keeps its row even at zero, so it can be un-ticked.
 * Without that, a deep link like `?types=nudge` on a view with no nudges would
 * leave an un-removable filter and — because `deriveChips` reads chip labels off
 * this list — print the raw slug `nudge` on the chip. The faction facet solves
 * the same problem the same way, for the same reason.
 *
 * On a quiet board this returns NOTHING, which is a legal answer: `OptionPicker`
 * draws no trigger for an option-less facet (#1567), so the control disappears
 * rather than opening a sheet with no rows in it.
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

/**
 * The type axis as a `FilterFacet` — a sibling of `factionFacet` (#1446), not a
 * change to the widget. A plain function rather than a hook, reading the raw
 * i18n instance the way `factionFacet` does, so it is callable from a test with
 * no React around it.
 *
 * "Type", not "Kicker" (decision 5). A kicker is a typography term for the
 * eyebrow above a headline; nobody filtering their notifications is looking for
 * one.
 */
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
