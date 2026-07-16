import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TaskOut } from '../../../../api/tasks'
import { factionCssVar, factionName } from '../../../../utils/factions'

/**
 * Singularity MOBILE task card (#526/#565) — a bracketed readout card on a void
 * field. Reads `task.primary_faction_slug` for its own faction tint.
 *
 * Always-dark: every colour resolves to a --faction-singularity-* token that
 * reads identically in both themes; the card paints its own void and never
 * mutates data-theme.
 */

const VOID = 'var(--faction-singularity-card-bg)'
const PHOSPHOR = 'var(--faction-singularity-card-accent)'
const SIGNAL = 'var(--faction-singularity-card-muted)'
const FONT = 'var(--font-faction-terminal)'

const phosphor = (pct: number): string => `color-mix(in srgb, ${PHOSPHOR} ${pct}%, transparent)`
const signal = (pct: number): string => `color-mix(in srgb, ${SIGNAL} ${pct}%, transparent)`

const kicker: CSSProperties = {
  fontFamily: FONT,
  fontSize: 8,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: signal(60),
}

export default function SingularityMobileTaskCard({ task, points }: { task: TaskOut; points: number }) {
  const { t } = useTranslation('tasks')
  const color = factionCssVar(task.primary_faction_slug)
  return (
    <Link
      to={`/tasks/${task.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '14px 16px',
        background: VOID,
        border: `1px solid ${signal(38)}`,
        borderLeft: `3px solid ${color}`,
        textDecoration: 'none',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT, fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: SIGNAL }}>
        <i style={{ width: 7, height: 7, background: color, flex: 'none' }} />
        {factionName(task.primary_faction_slug)}
      </span>

      <h2 style={{ fontFamily: FONT, fontSize: 15, lineHeight: 1.3, color: PHOSPHOR, margin: 0, overflowWrap: 'anywhere' }}>
        {'> '}
        {task.title}
      </h2>

      {task.description && (
        <p
          style={{
            fontFamily: FONT,
            fontSize: 11,
            lineHeight: 1.5,
            color: phosphor(55),
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {task.description}
        </p>
      )}

      <div className="flex items-center gap-3" style={{ marginTop: 2, borderTop: `1px solid ${signal(20)}`, paddingTop: 8 }}>
        <span style={{ fontFamily: FONT, fontSize: 12, letterSpacing: '0.04em', color: PHOSPHOR, border: `1px solid ${signal(38)}`, padding: '3px 9px' }}>
          {t('mobile.points', { points })}
        </span>
        <span style={{ ...kicker }}>{t('mobile.level', { level: task.level_required })}</span>
      </div>
    </Link>
  )
}
