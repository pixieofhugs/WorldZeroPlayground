import { useTranslation } from 'react-i18next'
import { FilterBarEmpty, type EmptyStateKind } from '../../components/ui/FilterBar'

/**
 * The praxis feed's three empty states (#1361 ruling 9), shared by both
 * surfaces. Which one shows is `selectEmptyState`'s call, made in `usePraxes`;
 * the words are the feed's.
 *
 *  - `register`  — nothing is filtered and no praxis has ever been filed.
 *  - `filtered`  — filtered to nothing, with a way out.
 *  - `caughtUp`  — "needs my vote" is the ONLY thing narrowing the list, so
 *                  "nothing is waiting on your vote" is a claim we can check.
 *
 * The two-way `hasActiveFilters` branch this replaces could only say the first
 * two, and the design's single "All caught up" could only say the third — and
 * lied whenever a faction filter was what emptied the feed.
 */
// `as const` so the keys keep their literal types — the i18n catalog is typed,
// and a widened `string` is not a key it will accept.
const COPY = {
  register: { title: 'listPage.empty' },
  filtered: { title: 'listPage.emptyFiltered' },
  caughtUp: { title: 'listPage.emptyCaughtUp', hint: 'listPage.emptyCaughtUpHint' },
} as const satisfies Record<EmptyStateKind, { title: string; hint?: string }>

export default function PraxisFeedEmpty({
  kind,
  onClearAll,
}: {
  kind: EmptyStateKind
  onClearAll: () => void
}) {
  const { t } = useTranslation('praxis')
  const copy = COPY[kind]
  return (
    <FilterBarEmpty
      title={t(copy.title)}
      hint={'hint' in copy ? t(copy.hint) : undefined}
      // Nothing to clear on an unfiltered register (STYLE §1.4).
      onClearAll={kind === 'register' ? undefined : onClearAll}
    />
  )
}
