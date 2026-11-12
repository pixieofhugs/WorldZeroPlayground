import { useTranslation } from 'react-i18next'
import { useMyActiveTasks } from '../../hooks/useMyActiveTasks'
import { useGameConfig } from '../../hooks/useGameConfig'
import { FilterBarEmpty } from '../../components/ui/FilterBar'

/** Fallback bank size before `/game-config` lands, matching the Sidebar meter. */
const DEFAULT_MAX_TASK_SLOTS = 20

/**
 * Empty state for the "tasks I can sign up for" filter (#1130): a full bank
 * empties the list, and must say so rather than look like an empty catalogue.
 * Mount only on an empty eligible list, so `useMyActiveTasks` stays off normal
 * loads (#1218). "See everything", not "clear filters": the default applied the
 * filter, not the player (#2025).
 *
 * ponytail: count is the client's (matches the Sidebar meter), not the server's
 * gate, which also counts pending collab memberships; worst case is the generic
 * sentence. Upgrade: GET /tasks says why it emptied the list.
 */
export default function CanSignUpEmpty({
  onClearAll,
}: {
  /** Present once the filter bar owns the axis (#1367) — the way back out. */
  onClearAll?: () => void
}) {
  const { t } = useTranslation('tasks')
  const { activeTasks } = useMyActiveTasks()
  const gameConfig = useGameConfig()
  const maxTaskSlots = gameConfig?.max_task_signups ?? DEFAULT_MAX_TASK_SLOTS

  const bankFull = activeTasks.length >= maxTaskSlots

  return (
    <FilterBarEmpty
      title={t('listPage.emptyCaughtUp')}
      hint={
        bankFull
          ? t('listPage.bankFull', { used: activeTasks.length, max: maxTaskSlots })
          : activeTasks.length > 0
            ? // "Go do the one you have"; deliberately countless.
              t('listPage.finishWhatYouHold')
            : t('listPage.emptyEligible')
      }
      onClearAll={onClearAll}
      actionLabel={t('listPage.seeEverything')}
    />
  )
}
