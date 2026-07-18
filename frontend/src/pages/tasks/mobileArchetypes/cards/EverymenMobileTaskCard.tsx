import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TaskOut } from '../../../../api/tasks'
import { factionCssVar, factionName } from '../../../../utils/factions'
import { MobileTaskDescription } from './shared'

/**
 * Everymen MOBILE task card (#529/#565) — a posted work order on cream
 * newsprint with a faction ledger rail and a gold points seal. Reads
 * `task.primary_faction_slug` for its own faction tint. Grounds on the
 * `--everymen-*` tokens; flips with `[data-theme]`.
 */

const INK = 'var(--everymen-ink)'
const GOLD = 'var(--everymen-gold)'
const MUTED = 'var(--everymen-muted)'
const PAPER = 'var(--everymen-paper)'
const ACCENT_FONT = 'var(--font-accent)'
const BODY_FONT = 'var(--font-body)'

const kicker: CSSProperties = {
  fontFamily: BODY_FONT,
  fontSize: 'var(--text-xs)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: MUTED,
}

export default function EverymenMobileTaskCard({ task, points }: { task: TaskOut; points: number }) {
  const { t } = useTranslation('tasks')
  const color = factionCssVar(task.primary_faction_slug)
  return (
    <Link
      to={`/tasks/${task.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
        padding: 'var(--space-md) var(--space-lg)',
        background: PAPER,
        backgroundImage: 'radial-gradient(color-mix(in srgb, var(--everymen-ink) 6%, transparent) 0.6px, transparent 0.9px)',
        backgroundSize: '5px 5px',
        border: `2px solid ${INK}`,
        borderLeft: `5px solid ${color}`,
        textDecoration: 'none',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)', ...kicker, color }}>
        <i style={{ width: 7, height: 7, background: color, flex: 'none' }} />
        {factionName(task.primary_faction_slug)}
      </span>

      <h2 className="content-title" style={{ fontFamily: ACCENT_FONT, lineHeight: 1, letterSpacing: '0.01em', color: INK, margin: 0 }}>
        {task.title}
      </h2>

      <MobileTaskDescription
        text={task.description}
        className="content-text"
        style={{ fontFamily: BODY_FONT, lineHeight: 1.5, color: MUTED, margin: 0 }}
      />

      <div className="flex items-center gap-3" style={{ marginTop: 'var(--space-xs)' }}>
        <span style={{ fontFamily: ACCENT_FONT, fontSize: 'var(--text-xl)', letterSpacing: '0.04em', color: INK, background: GOLD, padding: 'var(--space-xs) var(--space-md)' }}>
          {t('mobile.points', { points })}
        </span>
        <span style={{ ...kicker }}>{t('mobile.level', { level: task.level_required })}</span>
      </div>
    </Link>
  )
}
