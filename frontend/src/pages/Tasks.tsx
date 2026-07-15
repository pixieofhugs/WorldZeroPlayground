import { useTranslation } from 'react-i18next'
import TaskCard from '../components/TaskCard'
import PageTitle from '../components/ui/PageTitle'
import FilterStamps from '../components/ui/FilterStamps'
import FilterFactionTabs from '../components/ui/FilterFactionTabs'
import FilterLevelNodes from '../components/ui/FilterLevelNodes'
import { extractError } from '../utils/errors'
import { useFormFactor } from '../hooks/useFormFactor'
import { pickVariant } from '../utils/factionDispatch'
import { useTasks, type TasksState } from './tasks/useTasks'
import DefaultTasks from './tasks/mobileArchetypes/DefaultTasks'
import UaTaskList from './tasks/mobileArchetypes/UaTaskList'
import SingularityTaskList from './tasks/mobileArchetypes/SingularityTaskList'

type MobileSkin = (props: { state: TasksState }) => JSX.Element | null

// Parallel MOBILE registry, mirroring TaskDetail. Task browse shows every
// faction's tasks, so — unlike task/praxis detail — it has no single task slug
// to dispatch on; instead the VIEWING life's faction picks the skin, so a UA
// member reads the catalogue in the gilt salon (#525). Unregistered factions
// (and logged-out visitors) fall through to the Default mobile browse skin.
export const MOBILE_ARCHETYPE_BY_SLUG: Record<string, MobileSkin> = {
  ua: UaTaskList,
  singularity: SingularityTaskList,
}

export default function Tasks() {
  const state = useTasks()
  const formFactor = useFormFactor()

  if (formFactor === 'mobile') {
    const viewerSlug = state.user?.character?.faction_slug ?? null
    const Mobile = pickVariant(MOBILE_ARCHETYPE_BY_SLUG, viewerSlug, DefaultTasks)
    return <Mobile state={state} />
  }

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
      </div>

      {signupMsg && (
        <p className={`font-body text-sm mb-4 border-2 px-3 py-2 ${signupMsg.ok ? 'border-border text-ink' : 'border-red-300 text-red-600'}`}>
          {signupMsg.msg}
        </p>
      )}

      {loading ? (
        <p className="font-body text-muted">{t('listPage.loading')}</p>
      ) : error ? (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
          {extractError(error, "Couldn't load tasks.")}{' '}
          <button onClick={() => window.location.reload()} className="underline">{tc('states.tryRefreshing')}</button>
        </p>
      ) : tasks.length === 0 ? (
        <p className="font-body text-muted">{t('listPage.empty')}</p>
      ) : (
        /* Flex-wrap container — NOT a grid. Varied card sizes and rotations are intentional (Style Guide §6). */
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
      )}
    </div>
  )
}
