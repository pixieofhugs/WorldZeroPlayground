/**
 * Tasks browse dispatcher.
 *
 * Loads/filters tasks once via `useTasks()` and branches between the
 * existing desktop flex-wrap `TaskCard` list (per-task faction styling is
 * handled inside TaskCard/CARD_COMPONENTS — unrelated to this page-level
 * split) and a single-column mobile skin. Mirrors the TaskDetail dispatcher
 * (#494).
 *
 * Unlike Task Detail, this page shows a *mixed* list of tasks spanning every
 * faction, so there is no single task-faction to key the page-chrome
 * dispatch on. Instead we key the mobile archetype on the viewer's own
 * character's faction (`user?.character?.faction_slug`) — the same "one
 * faction, coherent idiom across screens" identity FactionDetail's
 * `viewerFactionSlug` already uses. Bespoke faction mobile skins land
 * incrementally in #525–#531; every viewer faction falls through to
 * DefaultTaskList until then.
 */
import PageTitle from '../components/ui/PageTitle'
import TaskCard from '../components/TaskCard'
import FilterStamps from '../components/ui/FilterStamps'
import FilterFactionTabs from '../components/ui/FilterFactionTabs'
import FilterLevelNodes from '../components/ui/FilterLevelNodes'
import { useTranslation } from 'react-i18next'
import { useFormFactor } from '../hooks/useFormFactor'
import { pickVariant } from '../utils/factionDispatch'
import { useTasks, LEVEL_FILTERS, type TasksState } from './tasks/useTasks'
import DefaultTaskList from './tasks/mobileArchetypes/DefaultTaskList'

type TasksArchetype = (props: { state: TasksState }) => JSX.Element | null

// Parallel MOBILE registry. Empty for now — every faction falls through to
// the Default mobile skin; bespoke faction mobile skins land incrementally
// (#525–#531), exactly like the taskDetail archetypes' MOBILE_ARCHETYPE_BY_SLUG.
export const MOBILE_ARCHETYPE_BY_SLUG: Record<string, TasksArchetype> = {}

export default function Tasks() {
  const { t } = useTranslation('tasks')
  const { t: tc } = useTranslation('common')
  const state = useTasks()
  const formFactor = useFormFactor()
  const {
    tasks,
    factions,
    status,
    setStatus,
    faction,
    setFaction,
    level,
    setLevel,
    statusFilters,
    loading,
    fetchError,
    signupMsg,
    isLoggedIn,
    handleSignup,
    displayPointsFor,
    viewerFactionSlug,
  } = state

  if (formFactor === 'mobile') {
    const Archetype = pickVariant(MOBILE_ARCHETYPE_BY_SLUG, viewerFactionSlug, DefaultTaskList)
    return (
      <div className="py-8">
        <PageTitle title="Tasks" eyebrow={`${tasks.length} shown`} />
        <Archetype state={state} />
      </div>
    )
  }

  return (
    <div className="py-8">
      <PageTitle title="Tasks" eyebrow={`${tasks.length} shown`} />

      {/* Filters (Style Guide §5.3) */}
      <div className="flex flex-col gap-2.5 mb-6">
        <FilterStamps options={statusFilters} value={status} onChange={setStatus} />
        <FilterFactionTabs factions={factions} value={faction} onChange={setFaction} />
        <FilterLevelNodes levels={LEVEL_FILTERS} value={level} onChange={setLevel} />
      </div>

      {signupMsg && (
        <p className={`font-body text-sm mb-4 border-2 px-3 py-2 ${signupMsg.ok ? 'border-border text-ink' : 'border-red-300 text-red-600'}`}>
          {signupMsg.msg}
        </p>
      )}

      {loading ? (
        <p className="font-body text-muted">{t('listPage.loading')}</p>
      ) : fetchError ? (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
          {fetchError}{' '}
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
              onSignup={isLoggedIn && task.can_submit_praxis ? handleSignup : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
