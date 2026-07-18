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
    displayPointsFor,
  } = state

  return (
    <div className="py-8">
      <PageTitle title="Tasks" eyebrow={`${tasks.length} shown`} />

      {/* Filters (Style Guide §5.3) */}
      <div className="flex flex-col gap-2.5 mb-6">
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
        <p className={`font-body text-sm mb-4 border-2 px-3 py-2 ${signupMsg.ok ? 'border-border text-ink' : 'border-red-300 text-red-600'}`}>
          {signupMsg.msg}
        </p>
      )}

      {loading && tasks.length === 0 ? (
        <p className="font-body text-muted">{t('listPage.loading')}</p>
      ) : error ? (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
          {extractError(error, "Couldn't load tasks.")}{' '}
          <button onClick={() => window.location.reload()} className="underline">{tc('states.tryRefreshing')}</button>
        </p>
      ) : tasks.length === 0 ? (
        <p className="font-body text-muted">{t('listPage.empty')}</p>
      ) : (
        <>
          {/* Flex-wrap container — NOT a grid. Varied card sizes and rotations are intentional (Style Guide §6). */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                displayPoints={displayPointsFor(task)}
                onSignup={user && task.can_submit_praxis ? handleSignup : undefined}
              />
            ))}
          </div>
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
