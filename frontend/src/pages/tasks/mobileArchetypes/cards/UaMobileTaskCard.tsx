import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TaskOut } from '../../../../api/tasks'
import { factionCssVar, factionName } from '../../../../utils/factions'

/**
 * University of Asthmatics MOBILE task card (#525/#565) — a parchment commission
 * plate on a gilt rail. Reads `task.primary_faction_slug` for its own faction
 * tint. Grounds on the `--faction-ua-*` / `--ua-*` tokens; always-light.
 */

const PAPER = 'var(--faction-ua-card-bg)'
const PAPER_WARM = 'var(--ua-paper-warm)'
const INK = 'var(--faction-ua-card-text)'
const SUB = 'var(--faction-ua-card-muted)'
const MUTED = 'var(--ua-muted)'
const GOLD = 'var(--ua-gold)'
const LINE = 'var(--ua-line)'
const DISPLAY = 'var(--faction-ua-card-font)'
const ENGRAVED = 'var(--font-faction-engraved)'
const MONO = 'var(--font-body)'

const kicker: CSSProperties = {
  fontFamily: MONO,
  fontSize: 8,
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: MUTED,
}

export default function UaMobileTaskCard({ task, points }: { task: TaskOut; points: number }) {
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
        background: PAPER,
        backgroundImage: 'radial-gradient(rgba(60,40,10,.03) 1px, transparent 1px)',
        backgroundSize: '5px 5px',
        border: `1px solid ${LINE}`,
        borderLeft: `4px solid ${color}`,
        boxShadow: `inset 0 0 0 3px ${PAPER}, inset 0 0 0 4px var(--ua-gold-pale)`,
        textDecoration: 'none',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: ENGRAVED, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color }}>
        <i style={{ width: 7, height: 7, borderRadius: '50%', background: color, flex: 'none' }} />
        {factionName(task.primary_faction_slug)}
      </span>

      <h2 style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 19, lineHeight: 1.15, color: INK, margin: 0 }}>
        {task.title}
      </h2>

      {task.description && (
        <p
          style={{
            fontFamily: DISPLAY,
            fontStyle: 'italic',
            fontSize: 13,
            lineHeight: 1.5,
            color: SUB,
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

      <div className="flex items-center gap-3" style={{ marginTop: 2 }}>
        <span style={{ fontFamily: ENGRAVED, fontSize: 12, letterSpacing: '0.04em', color: INK, background: PAPER_WARM, border: `1px solid ${GOLD}`, padding: '3px 9px' }}>
          {t('mobile.points', { points })}
        </span>
        <span style={{ ...kicker, color: MUTED }}>{t('mobile.level', { level: task.level_required })}</span>
      </div>
    </Link>
  )
}
