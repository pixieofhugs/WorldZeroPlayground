import { useTranslation } from 'react-i18next'
import TaskCard from '../components/taskCard/TaskCard'
import PageTitle from '../components/ui/PageTitle'
import { extractError } from '../utils/errors'
import { useFormFactor } from '../hooks/useFormFactor'
import { useTasks, type TasksState } from './tasks/useTasks'
import DefaultTasks from './tasks/mobileArchetypes/DefaultTasks'
import TaskFilterBar, { TaskListEmpty } from './tasks/TaskFilterBar'
import ProposeTaskLink from './tasks/ProposeTaskLink'
import MetataskSeal from '../components/metataskSeal/MetataskSeal'

export default function Tasks() {
  const state = useTasks()
  const formFactor = useFormFactor()

  // Mobile browse is faction-agnostic page chrome (#565): the page shows every
  // faction's tasks, and each card in the results list picks its own skin from
  // its task's faction slug. Both branches now hand that per-item dispatch to
  // the same <TaskCard> (ADR-0056) — only the page chrome differs. No
  // viewer-faction page skin.
  if (formFactor === 'mobile') return <DefaultTasks state={state} />

  return <DesktopTasks state={state} />
}

function DesktopTasks({ state }: { state: TasksState }) {
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
      {/* Propose sits beside the title, not in the rail (#1556) — the bank and
          the way to add to it are one surface now. `ProposeTaskLink` renders
          nothing for a viewer the server would refuse, so the row collapses to
          the title alone rather than drawing a dead control. */}
      <div className="flex items-start justify-between gap-4">
        <PageTitle title="Tasks" eyebrow={`${tasks.length} shown`} />
        <ProposeTaskLink user={user} />
      </div>

      {/* One filter surface for both form factors (#1367, epic #1361). The
          stamp stack, the faction tabs and the inline search input that used to
          sit here are gone — every axis they held is a rail in the bar, and
          every axis now rides in the URL. */}
      <div className="mb-6">
        <TaskFilterBar state={state} />
      </div>

      {signupMsg && (
        <p className={`font-body content-text mb-4 border-2 px-3 py-2 ${signupMsg.ok ? 'border-border text-ink' : 'border-red-300 text-red-600'}`}>
          {signupMsg.msg}
        </p>
      )}

      {loading && tasks.length === 0 ? (
        <p className="font-body text-muted">{t('listPage.loading')}</p>
      ) : error ? (
        <p className="font-body content-text text-red-600 border-2 border-red-300 px-3 py-2">
          {extractError(error, "Couldn't load tasks.")}{' '}
          <button onClick={() => window.location.reload()} className="underline">{tc('states.tryRefreshing')}</button>
        </p>
      ) : tasks.length === 0 ? (
        <TaskListEmpty state={state} />
      ) : (
        <>
          {isMetatask ? (
            /* Metatasks are informational — the issuing faction's seal look
               (#928), stacked read-only; no sign-up CTA (they're applied to a
               praxis via the picker). */
            <div style={{ maxWidth: 640 }}>
              <MetataskSeal metatasks={tasks} />
            </div>
          ) : (
            /* Flex-wrap container — NOT a grid. Varied card sizes and rotations are intentional (Style Guide §6).
               `scanning-surface` declares this a browsing list (#1716): a WOW
               card hangs its points upside down here, and upright on the
               profile / faction / detail pages that mount the same card and
               declare nothing. See the class in index.css. */
            <div
              className="scanning-surface"
              style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-lg)', alignItems: 'flex-start' }}
            >
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  basePoints={task.point_value}
                  multiplier={displayMultiplierFor(task)}
                  onSignup={user && task.can_sign_up ? handleSignup : undefined}
                />
              ))}
            </div>
          )}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={loadMore}
                className="font-body uppercase"
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
