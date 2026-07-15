import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FilterStamps from '../../../components/ui/FilterStamps'
import FilterFactionTabs from '../../../components/ui/FilterFactionTabs'
import FilterLevelNodes from '../../../components/ui/FilterLevelNodes'
import LevelPill from '../../../components/ui/LevelPill'
import { factionCssVar, factionName } from '../../../utils/factions'
import { LEVEL_FILTERS, type TasksState } from '../useTasks'
import SortSheet from './SortSheet'

/**
 * Default MOBILE tasks-browse skin — single-column card list, thumb-first.
 * Filters are phone-native horizontally-scrollable chip rows (reusing the
 * existing FilterStamps/FilterFactionTabs/FilterLevelNodes widgets, each
 * wrapped in its own `overflow-x: auto` strip) instead of the desktop
 * sidebar layout, plus a "Sort" control that opens a bottom sheet for the
 * default (level/points) vs "Newest" toggle already supported by
 * listTasks(). Cards show faction + points + level gate (when set) + task
 * type only — no difficulty dots or slot/capacity counts, neither of which
 * is on the Task model. Tapping a card navigates to the task detail page.
 * Every faction falls through here until it registers a bespoke mobile skin
 * (#496–#500).
 */
export default function DefaultTaskList({ state }: { state: TasksState }) {
  const { t } = useTranslation('tasks')
  const { t: tc } = useTranslation('common')
  const [sheetOpen, setSheetOpen] = useState(false)

  const {
    tasks,
    factions,
    status,
    setStatus,
    faction,
    setFaction,
    level,
    setLevel,
    sort,
    setSort,
    statusFilters,
    loading,
    fetchError,
    displayPointsFor,
  } = state

  return (
    <div>
      {/* Filters — phone-native horizontal-scroll chip rows, no desktop sidebar. */}
      <div className="flex flex-col gap-2 mb-4">
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <FilterStamps options={statusFilters} value={status} onChange={setStatus} />
        </div>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <FilterFactionTabs factions={factions} value={faction} onChange={setFaction} />
        </div>
        <div className="flex items-center gap-2">
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', flex: 1 }}>
            <FilterLevelNodes levels={LEVEL_FILTERS} value={level} onChange={setLevel} />
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            className="eyebrow"
            style={{
              flex: 'none',
              border: '1px solid var(--color-border-strong)',
              background: 'var(--color-bg-surface)',
              color: 'var(--color-text-primary)',
              padding: '5px 10px',
              cursor: 'pointer',
            }}
          >
            {t('mobile.sortButton')}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="font-body text-muted">{t('listPage.loading')}</p>
      ) : fetchError ? (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
          {fetchError}{' '}
          <button onClick={() => window.location.reload()} className="underline">
            {tc('states.tryRefreshing')}
          </button>
        </p>
      ) : tasks.length === 0 ? (
        <p className="font-body text-muted">{t('listPage.empty')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => {
            const color = factionCssVar(task.primary_faction_slug)
            return (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                className="sidebar-card"
                style={{
                  display: 'block',
                  borderLeft: `4px solid ${color}`,
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div className="card-meta flex items-center gap-2" style={{ color }}>
                  <span>{factionName(task.primary_faction_slug)}</span>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>
                    {task.task_type === 'metatask' ? t('mobile.taskType.metatask') : t('mobile.taskType.standard')}
                  </span>
                </div>

                <h3
                  className="font-display italic font-medium"
                  style={{ fontSize: 18, color: 'var(--color-text-primary)', margin: '0 0 8px' }}
                >
                  {task.title}
                </h3>

                <div className="card-footer">
                  <span className="font-body font-bold" style={{ fontSize: 16, color: 'var(--color-text-primary)' }}>
                    {t('mobile.points', { points: displayPointsFor(task) })}
                  </span>
                  {task.level_required > 0 && (
                    <LevelPill level={task.level_required} factionSlug={task.primary_faction_slug} />
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <SortSheet open={sheetOpen} sort={sort} onSelect={setSort} onClose={() => setSheetOpen(false)} />
    </div>
  )
}
