import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TaskOut } from '../../../api/tasks'
import { factionCssVar, factionName, sortFactionsByRainbowOrder } from '../../../utils/factions'
import type { TasksState } from '../useTasks'

/**
 * Default MOBILE task-browse skin — a scannable single-column card list with
 * phone-native filter chips (horizontal-scroll rows for status / faction /
 * level), NOT the desktop sidebar. Consumes the shared `useTasks()` state so a
 * chip tap updates the same filter state that keys the task read, and the
 * rendered set changes. Every faction falls through here until it registers a
 * bespoke mobile skin. Mirrors the DefaultTaskDetail mobile idiom (#496–#500).
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

      {/* Faction chips */}
      <ChipRow label={tc('filters.faction')}>
        <Chip on={faction === ''} onClick={() => setFaction('')}>
          {t('mobile.allFactions')}
        </Chip>
        {sortFactionsByRainbowOrder(factions).map((f) => (
          <Chip
            key={f.slug}
            on={faction === f.slug}
            onClick={() => setFaction(faction === f.slug ? '' : f.slug)}
            tint={factionCssVar(f.slug)}
          >
            {factionName(f.slug)}
          </Chip>
        ))}
      </ChipRow>

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

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="eyebrow" style={{ flex: 'none' }}>
        {label}
      </span>
      <div
        className="flex gap-2"
        style={{ overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}
      >
        {children}
      </div>
    </div>
  )
}

function Chip({
  on,
  onClick,
  tint,
  children,
}: {
  on: boolean
  onClick: () => void
  tint?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: "'Courier Prime', monospace",
        fontSize: 11,
        fontWeight: on ? 700 : 400,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: on ? 'var(--color-text-on-accent)' : 'var(--color-text-secondary)',
        background: on ? 'var(--color-text-primary)' : 'var(--color-bg-surface)',
        border: `1px solid ${on ? 'transparent' : 'var(--color-border-strong)'}`,
        borderRadius: 999,
        padding: '8px 14px',
        minHeight: 36,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      }}
    >
      {tint && (
        <i
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            flex: 'none',
            background: tint,
          }}
        />
      )}
      {children}
    </button>
  )
}

function MobileTaskCard({ task, points }: { task: TaskOut; points: number }) {
  const { t } = useTranslation('tasks')
  const color = factionCssVar(task.primary_faction_slug)
  return (
    <Link
      to={`/tasks/${task.id}`}
      className="sidebar-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '14px 16px 14px 18px',
        borderLeft: `4px solid ${color}`,
        textDecoration: 'none',
      }}
    >
      {/* Faction tag */}
      <span
        className="eyebrow"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color }}
      >
        <i style={{ width: 8, height: 8, borderRadius: 2, background: color, flex: 'none' }} />
        {factionName(task.primary_faction_slug)}
      </span>

      {/* Title */}
      <h2
        className="font-display italic font-medium"
        style={{ fontSize: 18, lineHeight: 1.15, color: 'var(--color-text-primary)' }}
      >
        {task.title}
      </h2>

      {/* Description — clamp to two lines */}
      {task.description && (
        <p
          className="font-body"
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--color-text-secondary)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {task.description}
        </p>
      )}

      {/* Footer — points + level */}
      <div className="flex items-center gap-3" style={{ marginTop: 2 }}>
        <span
          style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            background: 'var(--color-bg-surface-alt)',
            border: '1px solid var(--color-border)',
            padding: '3px 9px',
          }}
        >
          {t('mobile.points', { points })}
        </span>
        <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>
          {t('mobile.level', { level: task.level_required })}
        </span>
      </div>
    </Link>
  )
}
