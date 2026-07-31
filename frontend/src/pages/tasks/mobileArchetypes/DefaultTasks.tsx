import { useTranslation } from 'react-i18next'
import type { TasksState } from '../useTasks'
import TaskCard from '../../../components/taskCard/TaskCard'
import MetataskSeal from '../../../components/metataskSeal/MetataskSeal'
import TaskFilterBar, { TaskListEmpty } from '../TaskFilterBar'

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
 * `can_submit_praxis` exactly as desktop is), the in-progress count and the
 * multiplier badge, none of which the old mobile-only cards had. That was
 * shipped as a reversible experiment; the owner's hands-on verdict accepted it,
 * so the `mobileTaskCard` dispatcher and its nine cards are now deleted and
 * there is no second task-card implementation to revert to.
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
      <p className="eyebrow mb-3">{t('mobile.count', { count: tasks.length })}</p>

      <TaskFilterBar state={state} />

      {/* Signup outcome — the CTA arrived with the shared card (ADR-0056), so
          the message that answers it has to arrive too. */}
      {signupMsg && (
        <p className={`font-body content-text mt-3 border-2 px-3 py-2 ${signupMsg.ok ? 'border-border text-ink' : 'border-red-300 text-red-600'}`}>
          {signupMsg.msg}
        </p>
      )}

      {/* Results */}
      <div className="mt-4">
        {loading && tasks.length === 0 ? (
          <p className="font-body text-muted">{t('listPage.loading')}</p>
        ) : error ? (
          <p className="font-body content-text text-red-600 border-2 border-red-300 px-3 py-2">
            {t('mobile.loadError')}
          </p>
        ) : tasks.length === 0 ? (
          <TaskListEmpty state={state} />
        ) : (
          <div className="flex flex-col gap-3">
            {isMetatask ? (
              <MetataskSeal metatasks={tasks} />
            ) : (
              tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  basePoints={task.point_value}
                  multiplier={displayMultiplierFor(task)}
                  onSignup={user && task.can_submit_praxis ? handleSignup : undefined}
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
