import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TaskOut } from '../../../../api/tasks'
import { factionCssVar, factionName } from '../../../../utils/factions'
import { MobileTaskDescription } from './shared'

/**
 * Cozy Coven MOBILE task card (#531/#565) — a pink scrapbook "quest"
 * sticker-card: dotted board, inner notepad, sparkle accents, Caveat title.
 * Reads `task.primary_faction_slug` for its own faction tint. Grounds on the
 * `--faction-coven-*` window tokens; always-light. Presentation-only.
 */

const PINK = 'var(--faction-coven)'
const PINK_DEEP = 'var(--faction-coven-card-accent)'
const TITLE_TEXT = 'var(--faction-coven-title-text)'
const CARD_MUTED = 'var(--faction-coven-card-muted)'
const WIN_BORDER = 'var(--faction-coven-win-border)'
const NOTEPAD_BG = 'var(--faction-coven-notepad-bg)'
const NOTEPAD_BORDER = 'var(--faction-coven-notepad-border)'
const BODY_BG = 'var(--faction-coven-body-bg)'
const DOT = 'var(--faction-coven-dot)'
const SCRIPT = 'var(--faction-coven-card-font)' // Caveat
const BODY = 'var(--font-body)' // Courier Prime

/** The kit's four-point sparkle. */
function Sparkle({ size, color, style }: { size: number; color: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden>
      <path
        d="M12 0c.9 7 4.1 10.2 11 11-6.9.8-10.1 4-11 11-.9-7-4.1-10.2-11-11C7.9 10.2 11.1 7 12 0Z"
        fill={color}
      />
    </svg>
  )
}

/** A pink scrapbook quest sticker-card: dotted board + inner notepad. */
export default function CovenMobileTaskCard({ task, points }: { task: TaskOut; points: number }) {
  const { t } = useTranslation('tasks')
  const color = factionCssVar(task.primary_faction_slug)
  return (
    <Link
      to={`/tasks/${task.id}`}
      style={{
        display: 'block',
        borderRadius: 14,
        overflow: 'hidden',
        border: `2px solid ${WIN_BORDER}`,
        boxShadow: `0 6px 16px color-mix(in srgb, ${PINK} 18%, transparent)`,
        textDecoration: 'none',
      }}
    >
      <div
        style={{
          padding: 'var(--space-md)',
          background: BODY_BG,
          backgroundImage: `radial-gradient(${DOT} 1.4px, transparent 1.4px)`,
          backgroundSize: '13px 13px',
        }}
      >
        <div style={{ background: NOTEPAD_BG, border: `1.5px solid ${NOTEPAD_BORDER}`, borderRadius: 9, padding: 'var(--space-md) var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--text-sm)', letterSpacing: '0.14em', textTransform: 'uppercase', color }}>
            <Sparkle size={10} color={color} />
            {t('coven.mobile.cardMeta', { faction: factionName(task.primary_faction_slug), points })}
          </span>

          <h2 className="content-title" style={{ fontFamily: SCRIPT, lineHeight: 1.05, color: TITLE_TEXT, margin: 0, overflowWrap: 'anywhere' }}>
            {task.title}
          </h2>

          <MobileTaskDescription
            text={task.description}
            className="content-text"
            style={{ fontFamily: BODY, lineHeight: 1.5, color: CARD_MUTED, margin: 0 }}
          />

          <div className="flex items-center gap-3" style={{ marginTop: 'var(--space-xs)' }}>
            <span style={{ fontFamily: BODY, fontSize: 'var(--text-lg)', fontWeight: 700, color: PINK_DEEP, background: BODY_BG, border: `1px solid ${NOTEPAD_BORDER}`, borderRadius: 999, padding: 'var(--space-xs) var(--space-md)' }}>
              {t('mobile.points', { points })}
            </span>
            <span style={{ fontSize: 'var(--text-sm)', letterSpacing: '0.12em', textTransform: 'uppercase', color: CARD_MUTED }}>
              {t('mobile.level', { level: task.level_required })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
