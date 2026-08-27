import { useTranslation } from 'react-i18next'
import type { TasksState } from '../useTasks'
import TaskCard from '../../../components/taskCard/TaskCard'
import MetataskSeal from '../../../components/metataskSeal/MetataskSeal'
import TaskFilterBar, { TaskListEmpty } from '../TaskFilterBar'
import ProposeTaskLink from '../ProposeTaskLink'

/**
 * Default MOBILE task-browse skin — a scannable single-column card list, NOT the
 * desktop sidebar. Consumes the shared `useTasks()` state so a filter change
 * updates the same state that keys the task read, and the rendered set changes.
 * The page chrome is faction-agnostic; each card in the results list picks its
 * own skin from its task's faction slug (#565). Mirrors the DefaultTaskDetail
 * mobile idiom (#496–#500).
 *
 * The chip rows and the sigil row are gone (#1367): filtering is the shared
 * `FilterBar`, which is one component for both form factors and collapses
 * itself on the phone. `ChipRow` survives — `DefaultPlayers` still uses it.
 *
 * The results list renders the SHARED `<TaskCard>` — the one call site
 * ADR-0056 turned on. Each faction card sizes itself for the phone via
 * `useFormFactor()`, and mobile inherits the inline signup CTA (gated on
 * `can_sign_up` exactly as desktop is), the in-progress count and the
 * multiplier badge. There is one task-card implementation, not a phone twin.
 */
export default function DefaultTasks({ state }: { state: TasksState }) {
  const { t } = useTranslation('tasks')
  const { t: tc } = useTranslation('common')
  const {
    user,
    tasks,
    loading,
    error,
    taskType,
    hasMore,
    loadMore,
    signupMsg,
    handleSignup,
    displayMultiplierFor,
  } = state

  const isMetatask = taskType === 'metatask'

  return (
    <div className="py-4" data-testid="mobile-tasks-browse">
      <h1
        className="font-display italic font-medium mb-1"
        style={{ fontSize: 'var(--text-heading)', color: 'var(--color-text-primary)', lineHeight: 1.1 }}
      >
        {tc('nav.tasks')}
      </h1>

      {/* The affordance that left the Field Desk (#1556). Full width because the
          mobile path stacks single-column (#494) and this is a thumb target;
          above the filter bar so it is not buried under a collapsed rail. */}
      <div className="mb-3">
        <ProposeTaskLink user={user} fullWidth />
      </div>

      <TaskFilterBar state={state} />

      {/* Signup outcome — the CTA arrived with the shared card (ADR-0056), so
          the message that answers it has to arrive too. */}
      {signupMsg && (
        <p className="font-body content-text mt-3 border-2 danger-edge danger-text px-3 py-2">
          {signupMsg}
        </p>
      )}

      {/* Results */}
      <div className="mt-4">
        {loading && tasks.length === 0 ? (
          <p className="font-body text-muted">{t('listPage.loading')}</p>
        ) : error ? (
          <p className="font-body content-text danger-text border-2 danger-edge px-3 py-2">
            {t('mobile.loadError')}
          </p>
        ) : tasks.length === 0 ? (
          <TaskListEmpty state={state} />
        ) : (
          /* THE CARD FILLS THIS COLUMN (#2763), so the column stretches.
             It used to centre: a phone card drew at its own 340px, which is
             narrower than this column, and a stretched item left it flush
             against the left edge under a full-width filter bar (#1964). The
             owner reversed that for the phone — below 768px a card fills its
             column, the nine archetypes ask for `width: 100%`, and centring a
             box that wants the whole line is what shrinks it back to its
             content. The `isMetatask` carve-out went with it: the seal always
             filled the column, and now the card does too, so both branches want
             the same column. The load-more button keeps `w-full`, unchanged. */
          <div
            className="flex flex-col gap-3"
            data-testid="mobile-tasks-results"
            /* Stale rows dim and stop taking taps until the read lands
               (#2431). "Load more" is a CHILD of this column rather than a
               sibling, as it is on the desktop page — it is laid out by this
               flex flow, so it dims with the rows rather than being
               re-parented out of it. */
            data-stale={loading && tasks.length > 0 ? 'true' : undefined}
          >
            {isMetatask ? (
              <MetataskSeal metatasks={tasks} />
            ) : (
              // Same rule as the desktop list: the card decides claim-vs-reason
              // off `task.signup_reason` (#1976), so this only decides whether
              // there is a viewer to say anything to.
              tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  basePoints={task.point_value}
                  multiplier={displayMultiplierFor(task)}
                  onSignup={user ? handleSignup : undefined}
                />
              ))
            )}
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                className="font-body uppercase w-full"
                style={{
                  fontSize: 'var(--text-md)',
                  letterSpacing: '0.1em',
                  padding: 'var(--space-md)',
                  border: '1px solid var(--color-border-strong)',
                  background: 'var(--color-bg-surface)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                {t('listPage.loadMore')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
