import { useTranslation } from 'react-i18next'
import type { TasksState } from '../useTasks'
import TaskCard from '../../../components/taskCard/TaskCard'
import MetataskSeal from '../../../components/metataskSeal/MetataskSeal'
import TaskFilterBar, { TaskListEmpty } from '../TaskFilterBar'
import ProposeTaskLink from '../ProposeTaskLink'

/**
 * Default mobile task-browse skin: faction-agnostic chrome over the shared
 * `useTasks()` state, rendering the shared `<TaskCard>` (ADR-0056), each card
 * skinned by its own faction (#565).
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

      {/* #1556. Above the filter bar so a collapsed rail doesn't bury it. */}
      <div className="mb-3">
        <ProposeTaskLink user={user} fullWidth />
      </div>

      <TaskFilterBar state={state} />

      {/* Signup outcome for the shared card's CTA. */}
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
          /* Cards fill this column (#2763): no `items-center`, which would
             shrink a `width: 100%` card to its content. */
          <div
            className="flex flex-col gap-3"
            data-testid="mobile-tasks-results"
            /* Stale rows dim until the read lands (#2431); "Load more" is a
               child here so it dims with them. */
            data-stale={loading && tasks.length > 0 ? 'true' : undefined}
          >
            {isMetatask ? (
              <MetataskSeal metatasks={tasks} />
            ) : (
              // The card decides claim-vs-reason off `signup_reason` (#1976).
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
