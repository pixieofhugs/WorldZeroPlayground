import { useTranslation } from 'react-i18next'
import type { TasksState } from '../useTasks'
import MobileTaskCard from './mobileTaskCard'
import FactionSigilRow from '../../../components/ui/FactionSigilRow'
import { ChipRow, Chip } from '../../../components/ui/ChipRow'

/**
 * Default MOBILE task-browse skin — a scannable single-column card list with
 * phone-native filter chips (horizontal-scroll rows for status / faction /
 * level), NOT the desktop sidebar. Consumes the shared `useTasks()` state so a
 * chip tap updates the same filter state that keys the task read, and the
 * rendered set changes. The page chrome is faction-agnostic; each card in the
 * results list picks its own skin from its task's faction slug via the
 * `MobileTaskCard` dispatcher (#565). Mirrors the DefaultTaskDetail mobile idiom
 * (#496–#500).
 */
export default function DefaultTasks({ state }: { state: TasksState }) {
  const { t } = useTranslation('tasks')
  const { t: tc } = useTranslation('common')
  const {
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
    displayPointsFor,
  } = state

  return (
    <div className="py-4" data-testid="mobile-tasks-browse">
      <h1
        className="font-display italic font-medium mb-1"
        style={{ fontSize: 26, color: 'var(--color-text-primary)', lineHeight: 1.1 }}
      >
        {tc('nav.tasks')}
      </h1>
      <p className="eyebrow mb-3">{t('mobile.count', { count: tasks.length })}</p>

      {/* Status chips */}
      <ChipRow label={tc('filters.status')}>
        {statusFilters.map((option) => (
          <Chip key={option} on={status === option} onClick={() => setStatus(option)}>
            {option}
          </Chip>
        ))}
      </ChipRow>

      {/* Faction sigils */}
      <div className="mb-2">
        <FactionSigilRow factions={factions} value={faction} onChange={setFaction} />
      </div>

      {/* Level chips */}
      <ChipRow label={tc('filters.level')}>
        <Chip on={level === ''} onClick={() => setLevel('')}>
          {t('mobile.anyLevel')}
        </Chip>
        {levelFilters.map((lvl) => (
          <Chip key={lvl} on={level === lvl} onClick={() => setLevel(level === lvl ? '' : lvl)}>
            {tc('filters.levelAtLeast', { level: lvl })}
          </Chip>
        ))}
      </ChipRow>

      {/* Results */}
      <div className="mt-4">
        {loading ? (
          <p className="font-body text-muted">{t('listPage.loading')}</p>
        ) : error ? (
          <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
            {t('mobile.loadError')}
          </p>
        ) : tasks.length === 0 ? (
          <p className="font-body text-muted">{t('listPage.empty')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {tasks.map((task) => (
              <MobileTaskCard key={task.id} task={task} points={displayPointsFor(task)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
