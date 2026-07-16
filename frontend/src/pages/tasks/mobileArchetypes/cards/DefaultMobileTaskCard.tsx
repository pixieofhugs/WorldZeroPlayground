import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TaskOut } from '../../../../api/tasks'
import { factionCssVar, factionName } from '../../../../utils/factions'

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
