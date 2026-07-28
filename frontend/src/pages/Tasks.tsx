import { useTranslation } from 'react-i18next'
import TaskCard from '../components/TaskCard'
import PageTitle from '../components/ui/PageTitle'
import FilterStamps from '../components/ui/FilterStamps'
import FilterFactionTabs from '../components/ui/FilterFactionTabs'
import FilterLevelNodes from '../components/ui/FilterLevelNodes'
import { extractError } from '../utils/errors'
import { useFormFactor } from '../hooks/useFormFactor'
import { useTasks, type TasksState } from './tasks/useTasks'
import DefaultTasks from './tasks/mobileArchetypes/DefaultTasks'
import MetaTaskSeal from '../components/metaTaskSeal/MetaTaskSeal'
import type { TaskType } from '../api/tasks'

export default function Tasks() {
  const state = useTasks()
  const formFactor = useFormFactor()

  // Mobile browse is faction-agnostic page chrome (#565): the page shows every
  // faction's tasks, and each card in the results list picks its own skin from
  // its task's faction slug (via the MobileTaskCard dispatcher) — mirroring the
  // desktop TaskCard per-item dispatch. No viewer-faction page skin.
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
    factions,
    statusFilters,
    levelFilters,
    taskType,
    setTaskType,
    status,
    setStatus,
    faction,
    setFaction,
    level,
    setLevel,
    query,
    setQuery,
    hasMore,
    loadMore,
    signupMsg,
    handleSignup,
    displayMultiplierFor,
  } = state

  const isMetatask = taskType === 'metatask'

  return (
    <div className="py-8">
      <PageTitle title="Tasks" eyebrow={`${tasks.length} shown`} />

      {/* Filters (Style Guide §5.3) */}
      <div className="flex flex-col gap-2.5 mb-6">
        <TaskTypeToggle value={taskType} onChange={setTaskType} />
        <FilterStamps options={statusFilters} value={status} onChange={setStatus} />
        <FilterFactionTabs factions={factions} value={faction} onChange={setFaction} />
        <FilterLevelNodes levels={levelFilters} value={level} onChange={setLevel} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('listPage.filter.searchPlaceholder')}
          aria-label={t('listPage.filter.searchLabel')}
          className="font-body"
          style={{
            fontSize: 'var(--text-sm)',
            padding: 'var(--space-sm) var(--space-md)',
            maxWidth: 320,
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-strong)',
            color: 'var(--color-text-primary)',
            borderRadius: 4,
          }}
        />
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
        <p className="font-body text-muted">{t('listPage.empty')}</p>
      ) : (
        <>
          {isMetatask ? (
            /* Metatasks are informational — the issuing faction's seal look
               (#928), stacked read-only; no sign-up CTA (they're applied to a
               praxis via the picker). */
            <div style={{ maxWidth: 640 }}>
              <MetaTaskSeal metatasks={tasks} />
            </div>
          ) : (
            /* Flex-wrap container — NOT a grid. Varied card sizes and rotations are intentional (Style Guide §6). */
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-lg)', alignItems: 'flex-start' }}>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  basePoints={task.point_value}
                  multiplier={displayMultiplierFor(task)}
                  onSignup={user && task.can_submit_praxis ? handleSignup : undefined}
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
                  fontSize: 'var(--text-sm)',
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

/**
 * Task / Metatask browse toggle (#934) — rubber-stamp pair, sharing the status
 * filter's stamp voice. Switching mode resets the growing window (setter side).
 */
function TaskTypeToggle({
  value,
  onChange,
}: {
  value: TaskType
  onChange: (value: TaskType) => void
}) {
  const { t } = useTranslation('tasks')
  const options: ReadonlyArray<{ key: TaskType; label: string }> = [
    { key: 'standard', label: t('browse.tasks') },
    { key: 'metatask', label: t('browse.metatasks') },
  ]
  return (
    <div className="flex gap-1.5 items-center">
      <span className="eyebrow">{t('browse.taskType')}</span>
      {options.map((option) => {
        const active = value === option.key
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className="font-body uppercase"
            style={{
              border: `2px solid ${active ? 'var(--color-text-primary)' : 'var(--color-border-strong)'}`,
              borderRadius: 0,
              background: active ? 'var(--color-text-primary)' : 'var(--color-bg-surface)',
              color: active ? 'var(--color-bg-page)' : 'var(--color-text-primary)',
              fontSize: 'var(--text-base)',
              fontWeight: 700,
              letterSpacing: '0.1em',
              padding: 'var(--space-xs) var(--space-sm)',
              cursor: 'pointer',
              transition: 'all 120ms',
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
