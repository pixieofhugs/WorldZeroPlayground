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
 * Mounted ONLY from the `canSignUp && tasks.length === 0` branch — an EMPTY
 * eligible list, which is what keeps `useMyActiveTasks`'s fetch off the page
 * load that has tasks to show. Since #1972 the filter defaults ON — and since
 * #2025 for a level-0 character only, which is precisely the viewer this
 * sentence was written for: they claim their one task and land here on their
 * second screen of the game. The round trip #1218 is clawing back is only paid
 * on a board that came back with nothing to draw.
 *
 * That is also why the button says "see everything" rather than "clear all
 * filters": the player did not apply this filter, the default did, and a button
 * naming a thing they never did reads as chrome for someone else's mistake. It
 * is still `clearFilters` behind it — which writes an explicit `can_sign_up=0`
 * precisely so that clearing beats the default (see `clearedFilterParams`).
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
          : activeTasks.length > 0
            ? // The level-0 case the default exists for: one task on the board,
              // now claimed, so the eligible list is empty and the right answer
              // is "go do the one you have" — not 64 tasks they cannot start.
              // Deliberately countless: it reads true whether they hold one or
              // nineteen, and the bank meter is where a number belongs.
              t('listPage.finishWhatYouHold')
            : t('listPage.emptyEligible')
      }
      onClearAll={onClearAll}
      actionLabel={t('listPage.seeEverything')}
    />
  )
}
