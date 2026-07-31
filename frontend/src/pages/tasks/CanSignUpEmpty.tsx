import { useTranslation } from 'react-i18next'
import { useMyActiveTasks } from '../../hooks/useMyActiveTasks'
import { useGameConfig } from '../../hooks/useGameConfig'
import { FilterBarEmpty } from '../../components/ui/FilterBar'

/** Fallback bank size before `/game-config` lands, matching the Sidebar meter. */
const DEFAULT_MAX_TASK_SLOTS = 20

/**
 * The empty state for the "tasks I can sign up for" filter (#1130).
 *
 * The filter includes the task-bank cap and means it, so a full bank empties the
 * list wholesale. That has to say so: a bare "no tasks match your filters" would
 * read as "the catalogue is empty for you" when the real answer is "you already
 * hold twenty" — and letting a full-bank player believe otherwise is the same
 * false-affordance class as #1263.
 *
 * Mounted ONLY from the `canSignUp && tasks.length === 0` branch, which is what
 * keeps `useMyActiveTasks`'s fetch off the default page load: the filter defaults
 * off, so the common path never mounts this and never pays the round trip that
 * #1218 is trying to claw back.
 *
 * ponytail: the count is the client's own, taken from the same request the
 * Sidebar's slot meter uses, so the two always agree on screen. It is not the
 * number the server gated on — `_count_in_progress_praxes` also counts `pending`
 * collab memberships, which this endpoint's `status=in_progress` filter does not.
 * The cost of that gap is showing the generic sentence instead of this one; it
 * cannot show a wrong number, because the message is gated on reaching the cap.
 * The upgrade path is for the server to say why it emptied the list — a response
 * envelope or header on GET /tasks — which is a bigger change than the sentence
 * is worth today.
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
          : t('listPage.emptyEligible')
      }
      onClearAll={onClearAll}
    />
  )
}
