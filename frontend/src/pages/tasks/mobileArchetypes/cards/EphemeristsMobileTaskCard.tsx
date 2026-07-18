import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TaskOut } from '../../../../api/tasks'
import { factionCssVar, factionName } from '../../../../utils/factions'
import { MobileTaskDescription } from './shared'

/**
 * The Ephemerists MOBILE task card (#527/#565) — a ledger-ruled commission leaf
 * on aged vellum. Reads `task.primary_faction_slug` for its own faction tint.
 * Grounds on the `--eph-*` tokens; theme-aware through the cascade.
 */

const VELLUM = 'var(--eph-vellum)'
const VELLUM_DEEP = 'var(--eph-vellum-deep)'
const TEXT = 'var(--eph-vellum-text)'
const MUTED = 'var(--eph-muted)'
const GOLD = 'var(--eph-gold)'
const GOLD_DEEP = 'var(--eph-gold-deep)'
const DISPLAY = 'var(--eph-display)'
const SCRIPT = 'var(--eph-script)'

const kicker: CSSProperties = {
  fontFamily: DISPLAY,
  fontSize: 'var(--text-xs)',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: MUTED,
}

export default function EphemeristsMobileTaskCard({ task, points }: { task: TaskOut; points: number }) {
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
        background: VELLUM,
        border: `1px solid ${GOLD_DEEP}`,
        borderLeft: `4px solid ${color}`,
        textDecoration: 'none',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: DISPLAY, fontSize: 'var(--text-sm)', letterSpacing: '0.1em', textTransform: 'uppercase', color }}>
        <i style={{ width: 7, height: 7, borderRadius: '50%', background: color, flex: 'none' }} />
        {factionName(task.primary_faction_slug)}
      </span>

      <h2 className="content-title" style={{ fontFamily: DISPLAY, fontWeight: 700, lineHeight: 1.15, color: TEXT, margin: 0 }}>
        {task.title}
      </h2>

      <MobileTaskDescription
        text={task.description}
        className="content-text"
        style={{ fontFamily: SCRIPT, fontStyle: 'italic', lineHeight: 1.5, color: MUTED, margin: 0 }}
      />

      <div className="flex items-center gap-3" style={{ marginTop: 2 }}>
        <span style={{ fontFamily: DISPLAY, fontSize: 'var(--text-lg)', letterSpacing: '0.04em', color: TEXT, background: VELLUM_DEEP, border: `1px solid ${GOLD}`, padding: '3px 9px' }}>
          {t('mobile.points', { points })}
        </span>
        <span style={{ ...kicker, color: MUTED }}>{t('mobile.level', { level: task.level_required })}</span>
      </div>
    </Link>
  )
}
