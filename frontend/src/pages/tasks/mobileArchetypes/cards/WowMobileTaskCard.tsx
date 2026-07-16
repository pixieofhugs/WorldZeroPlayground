import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TaskOut } from '../../../../api/tasks'
import { factionCssVar, factionName } from '../../../../utils/factions'

/**
 * Warriors of Whimsy MOBILE task card (#531/#565) — a pink scrapbook "quest"
 * sticker-card: dotted board, inner notepad, sparkle accents, Caveat title.
 * Reads `task.primary_faction_slug` for its own faction tint. Grounds on the
 * `--faction-wow-*` window tokens; always-light. Presentation-only.
 */

const PINK = 'var(--faction-wow)'
const PINK_DEEP = 'var(--faction-wow-card-accent)'
const TITLE_TEXT = 'var(--faction-wow-title-text)'
const CARD_MUTED = 'var(--faction-wow-card-muted)'
const WIN_BORDER = 'var(--faction-wow-win-border)'
const NOTEPAD_BG = 'var(--faction-wow-notepad-bg)'
const NOTEPAD_BORDER = 'var(--faction-wow-notepad-border)'
const BODY_BG = 'var(--faction-wow-body-bg)'
const DOT = 'var(--faction-wow-dot)'
const SCRIPT = 'var(--faction-wow-card-font)' // Caveat
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
export default function WowMobileTaskCard({ task, points }: { task: TaskOut; points: number }) {
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
          padding: 10,
          background: BODY_BG,
          backgroundImage: `radial-gradient(${DOT} 1.4px, transparent 1.4px)`,
          backgroundSize: '13px 13px',
        }}
      >
        <div style={{ background: NOTEPAD_BG, border: `1.5px solid ${NOTEPAD_BORDER}`, borderRadius: 9, padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color }}>
            <Sparkle size={10} color={color} />
            {t('wow.mobile.cardMeta', { faction: factionName(task.primary_faction_slug), points })}
          </span>

          <h2 style={{ fontFamily: SCRIPT, fontSize: 22, lineHeight: 1.05, color: TITLE_TEXT, margin: 0, overflowWrap: 'anywhere' }}>
            {task.title}
          </h2>

          {task.description && (
            <p
              style={{
                fontFamily: BODY,
                fontSize: 12,
                lineHeight: 1.5,
                color: CARD_MUTED,
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
            <span style={{ fontFamily: BODY, fontSize: 12, fontWeight: 700, color: PINK_DEEP, background: BODY_BG, border: `1px solid ${NOTEPAD_BORDER}`, borderRadius: 999, padding: '3px 11px' }}>
              {t('mobile.points', { points })}
            </span>
            <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: CARD_MUTED }}>
              {t('mobile.level', { level: task.level_required })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
