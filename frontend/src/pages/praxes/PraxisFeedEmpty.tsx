import { useTranslation } from 'react-i18next'
import { FilterBarEmpty, type EmptyStateKind } from '../../components/ui/FilterBar'

/**
 * The feed's three empty states (#1361 ruling 9); `selectEmptyState` picks.
 * `caughtUp` only when "needs my vote" is the sole filter.
 */
// `as const`: the typed i18n catalog rejects a widened `string` key.
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
