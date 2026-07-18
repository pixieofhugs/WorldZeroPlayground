import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TaskOut } from '../../../../api/tasks'
import { factionCssVar, factionName } from '../../../../utils/factions'
import { MobileTaskDescription } from './shared'

/**
 * S.N.I.D.E. MOBILE task card (#530/#565) — a dark job file taped to the wall:
 * Bebas title, acid edge, hard offset shadow. Reads `task.primary_faction_slug`
 * for its own faction tint. Grounds on the `--faction-snide-*` tokens;
 * native-dark.
 */

const INK = 'var(--faction-snide-card-bg)'
const TEXT = 'var(--faction-snide-card-text)'
const MUTED = 'var(--faction-snide-card-muted)'
const ACID = 'var(--faction-snide-card-accent)'
const LINE = 'var(--faction-snide-border)'
const COND = 'var(--faction-snide-font-cond)'
const IMPACT = 'var(--faction-snide-font-impact)'
const TYPE = 'var(--faction-snide-font-type)'

const CARD_SHADOW = '5px 6px 0 rgba(0,0,0,.5)'

const kicker: CSSProperties = {
  fontFamily: TYPE,
  fontSize: 'var(--text-xs)',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: MUTED,
}

export default function SnideMobileTaskCard({ task, points }: { task: TaskOut; points: number }) {
  const { t } = useTranslation('tasks')
  const color = factionCssVar(task.primary_faction_slug)
  return (
    <Link
      to={`/tasks/${task.id}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
        padding: 'var(--space-md) var(--space-lg)',
        background: INK,
        color: TEXT,
        border: `1px solid ${LINE}`,
        borderLeft: `4px solid ${color}`,
        boxShadow: CARD_SHADOW,
        textDecoration: 'none',
        overflow: 'hidden',
      }}
    >
      <span
        aria-hidden
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(rgba(182,255,46,0.07) 32%, transparent 34%)', backgroundSize: '5px 5px' }}
      />
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)', fontFamily: TYPE, fontSize: 'var(--text-sm)', letterSpacing: '0.1em', textTransform: 'uppercase', color }}>
        <i style={{ width: 7, height: 7, background: color, flex: 'none' }} />
        {factionName(task.primary_faction_slug)}
      </span>

      <h2 className="content-title" style={{ position: 'relative', fontFamily: COND, letterSpacing: '0.02em', lineHeight: 1.1, color: TEXT, margin: 0 }}>
        {task.title}
      </h2>

      <MobileTaskDescription
        text={task.description}
        className="content-text"
        style={{ position: 'relative', fontFamily: TYPE, lineHeight: 1.5, color: MUTED, margin: 0 }}
      />

      <div className="flex items-center gap-3" style={{ position: 'relative', marginTop: 'var(--space-xs)' }}>
        <span style={{ fontFamily: IMPACT, fontSize: 'var(--text-xl)', letterSpacing: '0.02em', color: INK, background: ACID, padding: 'var(--space-xs) var(--space-sm)' }}>
          {t('mobile.points', { points })}
        </span>
        <span style={{ ...kicker, color: MUTED }}>{t('mobile.level', { level: task.level_required })}</span>
      </div>
    </Link>
  )
}
