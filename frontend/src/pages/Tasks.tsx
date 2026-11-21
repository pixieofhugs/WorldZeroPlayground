import { useTranslation } from 'react-i18next'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import TaskCard from '../components/taskCard/TaskCard'
import PageTitle from '../components/ui/PageTitle'
import { useTasks } from './tasks/useTasks'
import TaskFilterBar, { TaskListEmpty } from './tasks/TaskFilterBar'
import ProposeTaskLink from './tasks/ProposeTaskLink'
import MetataskSeal from '../components/metataskSeal/MetataskSeal'
import { ErrorBanner } from "../components/ui/ErrorBanner";

/** One responsive page; each <TaskCard> skins itself (ADR-0056). */
export default function Tasks() {
  useDocumentTitle('Tasks')
  const state = useTasks()
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
    <div className="py-8">
      {/* Propose beside the title (#1556); renders nothing if refused. */}
      <div className="flex flex-wrap items-start justify-between gap-x-4">
        {/* No eyebrow: the count is in the filter bar (#2262). */}
        <PageTitle title="Tasks" />
        <ProposeTaskLink user={user} />
      </div>

      {/* One filter surface for both form factors (#1367); axes ride the URL. */}
      <div className="mb-6">
        <TaskFilterBar state={state} />
      </div>

      {signupMsg && (
        <ErrorBanner className="mb-4" message={signupMsg} />
      )}

      {loading && tasks.length === 0 ? (
        <p className="font-body text-muted">{t('listPage.loading')}</p>
      ) : error ? (
        <ErrorBanner message={<>{t('listPage.loadError')}{' '}
          <button onClick={() => window.location.reload()} className="underline">{tc('states.tryRefreshing')}</button></>} />
      ) : tasks.length === 0 ? (
        <TaskListEmpty state={state} />
      ) : (
        <>
          {isMetatask ? (
            /* Metatasks are read-only seals (#928), applied via the picker. */
            <div
              style={{ maxWidth: 640 }}
              data-stale={loading && tasks.length > 0 ? 'true' : undefined}
            >
              <MetataskSeal metatasks={tasks} />
            </div>
          ) : (
            /* Flex-wrap, NOT a grid: varied widths are intentional (Style
               Guide §6), equal row heights are not (#1945). `.task-card-row`
               owns display and stretch; an inline `display` would beat it. */
            <div
              className="task-card-row"
              style={{ gap: 'var(--space-lg)' }}
              /* The previous filter's cards dim until the read lands (#2431).
                 "Load more" is a sibling, outside the dimming. */
              data-stale={loading && tasks.length > 0 ? 'true' : undefined}
            >
              {/* Don't gate on `can_sign_up`: the card shows claim or reason
                  off `signup_reason` (#1976). Anonymous viewers get nothing. */}
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  basePoints={task.point_value}
                  multiplier={displayMultiplierFor(task)}
                  onSignup={user ? handleSignup : undefined}
                />
              ))}
            </div>
          )}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={loadMore}
                className="font-body uppercase w-full md:w-auto"
                style={{
                  fontSize: 'var(--text-md)',
                  letterSpacing: '0.1em',
                  padding: 'var(--space-sm) var(--space-lg)',
                  border: '1px solid var(--color-border-strong)',
                  background: 'var(--color-bg-surface)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                {t('listPage.loadMore')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
