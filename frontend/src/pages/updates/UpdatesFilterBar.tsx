import { useTranslation } from 'react-i18next'
import FilterBar, {
  FilterBarEmpty,
  type FilterRail,
} from '../../components/ui/FilterBar'
import FeedEmptyState from '../../components/feed/FeedEmptyState'
import {
  RELATIONSHIPS,
  RELATIONSHIP_DEFAULT,
  RELATIONSHIP_LABEL_KEY,
  STATE_ARCHIVED,
  STATE_INBOX,
  selectUpdatesEmptyState,
  typeFacet,
  type FeedRelationship,
} from './updatesFilters'
import type { UpdatesState } from './useUpdates'

/**
 * The Updates page's filter surface — the shared `FilterBar` (#1365/#1446) wired
 * to `useUpdates`, replacing filter implementations **#5 and #6**.
 *
 * Both were hand-rolled and neither imported the shared component: the desktop
 * page drew a stamp-shaped button duplicating `FilterStamps` almost exactly
 * (same border, same dashed inset, same Courier recipe) plus a count badge, and
 * the mobile page drew a pill duplicating `Chip`. Epic #1361 exists to collapse
 * four such implementations into one and did not know about these two.
 *
 * ONE component for both form factors, not a mobile twin: `FilterBar` is chrome
 * rather than a faction-dressed surface, so it sits outside the
 * `MOBILE_ARCHETYPE_BY_SLUG` seam and folds itself down on the phone.
 *
 * Two rails and one facet. Four things the design draws that are deliberately
 * absent, so the next editor does not "restore" them:
 *
 *   - the **faction axis** — `context_faction_slug` is a `@computed_field`
 *     rather than a column, so filtering it means a bespoke join in each of 15
 *     query builders. The design scripts the dimension (`data-faction` on eight
 *     elements, a `['faction','type','audience']` loop) and never renders a
 *     control for it. It stays unbuilt (epic decision 1).
 *   - **search** — there is no text column, and the readable string for a feed
 *     item is composed in Python at map time. Its own issue, #1426.
 *   - the **audience multi-select**, which is the relationship axis drawn a
 *     second time. Two controls on one axis will disagree (decision 2).
 *   - the **Snide-lime accent** (`--faction-snide-acid` nineteen times, as
 *     checkbox fill, count badges and the Done button, plus a
 *     `--faction-wow → --faction-snide-acid` gradient on the mobile confirm).
 *     A faction colour cannot be site chrome. `FilterBar` is already authored
 *     neutral; the one spectrum it keeps is the rail ring, which is `na`'s and
 *     the site default's shared identity and must NOT be "fixed" (#1361
 *     ruling 1).
 */
export default function UpdatesFilterBar({ state }: { state: UpdatesState }) {
  const { t } = useTranslation('feed')
  const { filters, setFilters, clearFilters, counts, items, loading } = state

  const rails: FilterRail[] = [
    {
      key: 'state',
      label: t('filter.stateLabel'),
      value: filters.archived ? STATE_ARCHIVED : STATE_INBOX,
      defaultValue: STATE_INBOX,
      // No count badge, deliberately (decision 22). `FeedCounts` carries no
      // archived number: one would cost a second fifteen-source fan-out, and
      // the six it does carry are defined to describe the LIVE feed so they
      // stay truthful while the player reads the archive.
      segments: [
        { value: STATE_INBOX, label: t('filter.state.inbox') },
        { value: STATE_ARCHIVED, label: t('filter.state.archived') },
      ],
      onChange: (next) => setFilters({ archived: next === STATE_ARCHIVED }),
    },
  ]

  // The relationship rail is hidden on Archived, not disabled and not left
  // drawing a value it does not have. The backend's `_visible_types` returns
  // the whole `all` set whenever `archived=true` and ignores `filter`
  // completely — a player looking for something they put away should not have
  // to remember which tab they put it away from — so on that view the rail is a
  // control that cannot work, and this page hides those (STYLE §1.4).
  if (!filters.archived) {
    rails.push({
      key: 'relationship',
      label: t('filter.relationshipLabel'),
      value: filters.relationship,
      defaultValue: RELATIONSHIP_DEFAULT,
      segments: RELATIONSHIPS.map((relationship) => ({
        value: relationship,
        label: t(RELATIONSHIP_LABEL_KEY[relationship]),
      })),
      onChange: (next) => setFilters({ relationship: next as FeedRelationship }),
    })
  }

  return (
    <FilterBar
      rails={rails}
      facets={[
        typeFacet(counts.by_type, filters.types, (types) => setFilters({ types })),
      ]}
      onClearAll={clearFilters}
      // "Showing N updates" — one of the two controls the design's script
      // writes and its markup never contains (`[data-showing]`; the other is
      // the applied-count badge on the collapse toggle, which `FilterBar`
      // already draws). Both ship: they are the honest counterweight to the
      // axes this epic cut. The number is what is ON SCREEN and grows with
      // "load older", rather than a total the windowed counts cannot promise.
      summary={loading ? undefined : t('page.showing', { count: items.length })}
    />
  )
}

/**
 * Which empty state an empty feed gets (#1361 ruling 9, epic decision 24).
 *
 * **"Filtered to nothing" is newly reachable.** Every tab used to be a fixed
 * set, so an empty list only ever meant "no friends yet" or "the archive is
 * empty"; with a type multi-select any view can be filtered to zero. The
 * design's register-empty line — "Nothing left to read. The city is quiet." —
 * is simply a lie when the player has ticked four boxes, so that case gets its
 * own copy and a way out.
 *
 * The register case still splits two ways, and `FeedEmptyState` keeps owning
 * it: an empty inbox is an invitation to go and do something, an empty archive
 * is a statement that you have thrown nothing away, and they are never
 * collapsed into one message.
 */
export function UpdatesListEmpty({ state }: { state: UpdatesState }) {
  const { t } = useTranslation('feed')

  if (selectUpdatesEmptyState(state.filters) === 'filtered') {
    return (
      <FilterBarEmpty
        title={t('filter.emptyFiltered')}
        hint={t('filter.emptyFilteredHint')}
        onClearAll={state.clearFilters}
      />
    )
  }
  return <FeedEmptyState archivedView={state.archivedView} />
}
