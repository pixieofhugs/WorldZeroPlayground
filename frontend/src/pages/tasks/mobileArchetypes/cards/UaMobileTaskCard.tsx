import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TaskOut } from '../../../../api/tasks'
import { UaSigil } from '../../../../components/cards/UaSigil'
import { factionCssVar, factionName } from '../../../../utils/factions'
import { MobileTaskDescription } from './shared'

/**
 * University of Asthmatics MOBILE task card (#525/#565/#852) — a sheet from the
 * practice, torn off single-column.
 *
 * The gilt commission plate is gone with the salon (#788): no gold rail, no
 * double frame, no parchment dot-screen. What is left is the kit's §1a task row
 * — a sun-bleached sheet, one neutral hairline, a soft orange spine down the
 * gutter, and the point value written inside the ensō. The mark carries the
 * number; nothing else on the card is ornament.
 *
 * The mandala is deliberately ABSENT here (`UaMandala`'s third strength): a task
 * list is a dense, text-heavy surface, and the pattern belongs behind heroes and
 * the vote control, not behind rows.
 *
 * Every colour is a `--faction-ua-*` token with both themes, so the card dims
 * through the `[data-theme="dark"]` cascade — the "always-light" ruling that
 * used to justify this file is reversed. Reads `task.primary_faction_slug` for
 * the dot so a mixed feed still names the faction it came from.
 */

const SHEET = 'var(--faction-ua-card-bg)'
const INK = 'var(--faction-ua-card-text)'
const BODY = 'var(--faction-ua-card-body)'
const MUTED = 'var(--faction-ua-card-muted)'
const ACCENT = 'var(--faction-ua-card-accent)'
const RULE = 'var(--faction-ua-rule)'
const DISPLAY = 'var(--faction-ua-card-font)'
const SERIF = 'var(--faction-ua-body-font)'

/** Small caps in the body face — the kit's label voice. No Cinzel, no gold. */
const smallCaps: CSSProperties = {
  fontFamily: SERIF,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: MUTED,
}

export default function UaMobileTaskCard({ task, points }: { task: TaskOut; points: number }) {
  const { t } = useTranslation('tasks')
  const dot = factionCssVar(task.primary_faction_slug)
  return (
    <Link
      to={`/tasks/${task.id}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
        padding: 'var(--space-lg)',
        paddingLeft: 'var(--space-2xl)',
        background: SHEET,
        border: `1px solid ${RULE}`,
        borderRadius: 6,
        textDecoration: 'none',
      }}
    >
      {/* The spine: a breath of orange down the gutter, fading at both ends. */}
      <i
        aria-hidden
        style={{
          position: 'absolute',
          left: 14,
          top: 16,
          bottom: 16,
          width: 2,
          background: 'linear-gradient(180deg, transparent, var(--faction-ua), transparent)',
          opacity: 0.34,
        }}
      />

      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)', ...smallCaps, color: ACCENT }}>
        <i style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flex: 'none' }} />
        {factionName(task.primary_faction_slug)}
      </span>

      {/* The mark holds the number. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
        <span style={{ position: 'relative', width: 52, height: 52, flex: 'none' }}>
          <UaSigil width={52} height={52} />
          <span
            className="content-text"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: DISPLAY,
              fontWeight: 600,
              lineHeight: 1,
              color: INK,
            }}
          >
            {points}
          </span>
        </span>
        <span style={smallCaps}>{t('mobile.level', { level: task.level_required })}</span>
      </div>

      <h2
        className="content-title"
        style={{ fontFamily: DISPLAY, fontWeight: 600, lineHeight: 1.15, color: INK, margin: 0 }}
      >
        {task.title}
      </h2>

      <MobileTaskDescription
        text={task.description}
        className="content-text"
        style={{ fontFamily: SERIF, lineHeight: 1.5, color: BODY, margin: 0 }}
      />
    </Link>
  )
}
