import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TaskOut } from '../../../../api/tasks'
import { factionCssVar, factionName } from '../../../../utils/factions'
import { MobileTaskDescription } from './shared'

/**
 * Default MOBILE task card — the scannable single-column proof card each task
 * falls through to until it registers a bespoke mobile card. Reads
 * `task.primary_faction_slug` for its own faction tint, so a mixed feed shows
 * each card in its task's colour.
 */
export default function DefaultMobileTaskCard({ task, points }: { task: TaskOut; points: number }) {
  const { t } = useTranslation('tasks')
  const color = factionCssVar(task.primary_faction_slug)
  return (
    <Link
      to={`/tasks/${task.id}`}
      className="sidebar-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
        padding: 'var(--space-md) var(--space-lg)',
        borderLeft: `4px solid ${color}`,
        textDecoration: 'none',
      }}
    >
      {/* Faction tag */}
      <span
        className="eyebrow"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)', color }}
      >
        <i style={{ width: 8, height: 8, borderRadius: 2, background: color, flex: 'none' }} />
        {factionName(task.primary_faction_slug)}
      </span>

      {/* Title */}
      <h2
        className="content-title font-display italic font-medium"
        style={{ lineHeight: 1.15, color: 'var(--color-text-primary)' }}
      >
        {task.title}
      </h2>

      {/* Description — clamp to two lines */}
      <MobileTaskDescription
        text={task.description}
        className="content-text font-body"
        style={{ lineHeight: 1.5, color: 'var(--color-text-secondary)' }}
      />

      {/* Footer — points + level */}
      <div className="flex items-center gap-3" style={{ marginTop: 'var(--space-xs)' }}>
        <span
          style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: 'var(--text-lg)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            background: 'var(--color-bg-surface-alt)',
            border: '1px solid var(--color-border)',
            padding: 'var(--space-xs) var(--space-sm)',
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
