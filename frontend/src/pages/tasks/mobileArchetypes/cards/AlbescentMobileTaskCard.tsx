import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TaskOut } from '../../../../api/tasks'
import { factionName } from '../../../../utils/factions'
import AlbescentSigil from '../../../../components/cards/AlbescentSigil'
import { MobileTaskDescription } from './shared'

/**
 * Albescent MOBILE task card (#528/#565) — a quiet cotton Ledger entry: the
 * surveyor's Mark, hairline borders, Cormorant italic, one hue of ink. Reads
 * `task.primary_faction_slug` for its faction label. Grounds on the
 * `--faction-albescent-*` tokens; always-light.
 */

const INK = 'var(--faction-albescent-card-text)'
const SHEET = 'var(--faction-albescent-card-bg)'
const FONT = 'var(--faction-albescent-card-font)'
const MONO = 'var(--faction-albescent-mono)'
/** A near-black ink wash at the given opacity — the whole palette is one hue. */
const ink = (pct: number) => `color-mix(in srgb, ${INK} ${pct}%, transparent)`

const kicker: CSSProperties = {
  fontFamily: MONO,
  fontSize: 'var(--text-xs)',
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  color: ink(30),
}

export default function AlbescentMobileTaskCard({ task, points }: { task: TaskOut; points: number }) {
  const { t } = useTranslation('tasks')
  return (
    <Link
      to={`/tasks/${task.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
        padding: 'var(--space-lg)',
        background: SHEET,
        border: `1px solid ${ink(10)}`,
        boxShadow: '0 2px 18px rgba(0,0,0,0.045), 0 1px 3px rgba(0,0,0,0.04)',
        textDecoration: 'none',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <AlbescentSigil size={16} opacity={0.75} />
        <i style={{ fontFamily: MONO, fontSize: 'var(--text-xs)', letterSpacing: '0.22em', textTransform: 'uppercase', color: ink(24), fontStyle: 'normal' }}>
          {factionName(task.primary_faction_slug)}
        </i>
      </span>

      <h2 className="content-title" style={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 300, lineHeight: 1.28, color: INK, margin: 0, overflowWrap: 'anywhere' }}>
        {task.title}
      </h2>

      <MobileTaskDescription
        text={task.description}
        className="content-text"
        style={{ fontFamily: MONO, lineHeight: 1.6, color: ink(42), margin: 0 }}
      />

      <div className="flex items-center justify-between" style={{ marginTop: 'var(--space-xs)', borderTop: `1px solid ${ink(7)}`, paddingTop: 'var(--space-md)' }}>
        <span style={{ ...kicker, letterSpacing: '0.2em', color: ink(24) }}>{t('mobile.level', { level: task.level_required })}</span>
        <span style={{ fontFamily: FONT, fontStyle: 'italic', fontSize: 'var(--text-xl)', color: ink(55) }}>{t('mobile.points', { points })}</span>
      </div>
    </Link>
  )
}
