import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { PraxisCardOut } from '../api/praxis'
import { factionCssVar } from '../utils/factions'

interface Props {
  collab: PraxisCardOut
}

export default function CollaborationCard({ collab }: Props) {
  const { t } = useTranslation('common')
  const isDuel = collab.type === 'duel'

  return (
    <div
      className="card p-4 flex flex-col gap-2 transition-all duration-150"
      style={{
        background: factionCssVar(collab.task_faction_slug, 'card-bg'),
        borderLeft: `4px solid ${factionCssVar(collab.task_faction_slug, 'card-accent')}`,
        color: factionCssVar(collab.task_faction_slug, 'card-text'),
      }}
    >
      {/* Mode label */}
      <span
        className="eyebrow self-start"
        style={{
          fontSize: 7, padding: '1px 6px',
          background: isDuel
            ? 'color-mix(in srgb, var(--color-danger) 12%, transparent)'
            : 'color-mix(in srgb, var(--color-success) 12%, transparent)',
          color: isDuel ? 'var(--color-danger)' : 'var(--color-success)',
          border: `1px solid ${isDuel
            ? 'color-mix(in srgb, var(--color-danger) 30%, transparent)'
            : 'color-mix(in srgb, var(--color-success) 30%, transparent)'}`,
        }}
      >
        {isDuel ? t('collaborationCard.duel') : t('collaborationCard.collaboration')}
      </span>

      {/* Task link */}
      <Link to={`/tasks/${collab.task_id}`} className="font-body text-xs text-muted hover:underline">
        {collab.task_title}
      </Link>

      {/* Title or member count */}
      <Link to={`/praxes/${collab.id}`}>
        <h3 className="font-display text-lg font-semibold leading-tight hover:underline">
          {collab.title ?? t('collaborationCard.titleFallback', {
            label: isDuel ? t('collaborationCard.duel') : t('collaborationCard.collaboration'),
            count: collab.member_count,
          })}
        </h3>
      </Link>

      <div className="flex justify-between items-center pt-2 border-t border-dashed border-border/40 font-body text-xs text-muted mt-auto">
        <Link to={`/praxes/${collab.id}`} className="hover:underline">
          {isDuel ? t('collaborationCard.viewDuel') : t('collaborationCard.viewCollaboration')}
        </Link>
        {collab.score !== null && collab.score > 0 && (
          <span className="font-display text-sm font-bold text-ink">
            ★ {collab.score.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  )
}
