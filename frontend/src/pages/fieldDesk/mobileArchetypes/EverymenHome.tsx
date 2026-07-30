import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import { praxisModeLabel } from '../../../utils/praxis'
import type { FieldDeskHomeState } from '../useFieldDeskHome'

/**
 * Everymen MOBILE FieldDesk home (#529) — the union broadsheet on a phone. The
 * carried life becomes the day's front page: a red masthead billboard with the
 * cog seal and knockout Bebas nameplate, gold points seals for the stat tiles,
 * and the in-progress work filed as newsprint dispatches. Same content slots as
 * the Default mobile home (character header, Points/Votes/Era tiles,
 * active-tasks list, primary actions) — only the dress changes. Grounds on the
 * `--everymen-*` tokens already in index.css (the set EverymenTaskDetail /
 * EverymenFactionBody use), so it flips with `[data-theme]` without mutating the
 * document theme. Presentation-only — all data arrives via
 * {@link FieldDeskHomeState}.
 */

const INK = 'var(--everymen-ink)'
const CREAM = 'var(--everymen-cream)'
const RED = 'var(--everymen-red)'
const GOLD = 'var(--everymen-gold)'
const MUTED = 'var(--everymen-muted)'
const PAPER = 'var(--everymen-paper)'
const PAPER_DEEP = 'var(--everymen-paper-deep)'
const ACCENT_FONT = 'var(--font-accent)'
const BODY_FONT = 'var(--font-body)'

const kicker: CSSProperties = {
  fontFamily: BODY_FONT,
  fontSize: 'var(--text-xs)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: MUTED,
}

/** The Everymen cog seal — a riveted gear, the union's mark. */
function CogSeal({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <g fill={GOLD}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <rect key={deg} x="11" y="0.5" width="2" height="5" rx="0.5" transform={`rotate(${deg} 12 12)`} />
        ))}
      </g>
      <circle cx="12" cy="12" r="6.5" fill="none" stroke={GOLD} strokeWidth="2.4" />
      <circle cx="12" cy="12" r="2" fill={GOLD} />
    </svg>
  )
}

/** Cream newsprint plate framed in union ink. */
function Plate({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: PAPER,
        backgroundImage: 'radial-gradient(color-mix(in srgb, var(--everymen-ink) 6%, transparent) 0.6px, transparent 0.9px)',
        backgroundSize: '5px 5px',
        border: `2px solid ${INK}`,
        padding: 'var(--space-lg)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function SectionHead({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
      <span style={{ fontFamily: ACCENT_FONT, fontSize: 'var(--text-content)', letterSpacing: '0.06em', color: INK, whiteSpace: 'nowrap' }}>
        {title}
      </span>
      <span style={{ flex: 1, height: 3, background: `repeating-linear-gradient(90deg, ${RED} 0 12px, ${GOLD} 12px 20px)` }} />
      {trailing}
    </div>
  )
}

export default function EverymenHome({ state }: { state: FieldDeskHomeState }) {
  const { t } = useTranslation('common')
  const { character, eraName, votesReceived, activeTasks, pendingCount, canProposeTask } = state

  const stats = [
    { label: t('fieldDesk.home.stats.points'), value: character.score?.toLocaleString() ?? '0' },
    { label: t('fieldDesk.home.stats.votes'), value: votesReceived.toLocaleString() },
    { label: t('fieldDesk.home.stats.era'), value: eraName || '—' },
  ]

  return (
    <div
      data-skin="everymen"
      className="page"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', fontFamily: BODY_FONT, color: INK, background: PAPER }}
    >
      {/* Masthead billboard */}
      <header style={{ border: `3px solid ${INK}`, background: RED, color: CREAM, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            background: INK,
            color: GOLD,
            padding: 'var(--space-sm) var(--space-lg)',
          }}
        >
          <CogSeal size={16} />
          <span style={{ fontFamily: ACCENT_FONT, fontSize: 'var(--text-xl)', letterSpacing: '0.2em' }}>
            {t('fieldDesk.home.everymen.masthead')}
          </span>
          <span style={{ ...kicker, marginLeft: 'auto', color: CREAM }}>{t('nav.home')}</span>
        </div>
        <div style={{ height: 4, background: GOLD }} />
        <h1
          style={{
            fontFamily: ACCENT_FONT,
            fontSize: 'var(--text-heading)',
            lineHeight: 0.95,
            letterSpacing: '0.02em',
            color: CREAM,
            textShadow: `2px 2px 0 ${INK}`,
            margin: 0,
            padding: 'var(--space-lg)',
          }}
        >
          {t('fieldDesk.home.title')}
        </h1>
      </header>

      {/* ── The worker on the roll ── */}
      <Plate>
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
          <span style={kicker}>{t('fieldDesk.home.everymen.charEyebrow')}</span>
          <Link to={`/characters/${character.id}/edit`} style={{ ...kicker, color: RED, textDecoration: 'none' }}>
            {t('fieldDesk.home.edit')}
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="shrink-0"
            style={{
              width: 56,
              height: 56,
              // eslint-disable-next-line local/no-raw-style-values -- ornament: gold ring thickness inside the 2px ink border of a 56px avatar; the nearest rung (4px) thickens the band by a third.
              padding: 3,
              background: GOLD,
              border: `2px solid ${INK}`,
            }}
          >
            {character.avatar_url ? (
              <img
                src={mediaUrl(character.avatar_url)}
                alt={character.display_name}
                className="w-full h-full"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <span
                className="flex w-full h-full items-center justify-center"
                // eslint-disable-next-line local/no-raw-style-values -- ornament: avatar initial sized to its 56px gold plate, not text
                style={{ background: PAPER_DEEP, fontFamily: ACCENT_FONT, fontSize: 26, color: RED }}
              >
                {character.display_name[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              to={`/characters/${character.id}`}
              className="block truncate"
              style={{ fontFamily: ACCENT_FONT, fontSize: 'var(--text-title)', lineHeight: 0.95, color: INK, textDecoration: 'none' }}
            >
              {character.display_name}
            </Link>
            <div className="truncate" style={{ ...kicker, marginTop: 'var(--space-xs)' }}>
              {t('sidebar.characterCard.factionLevel', {
                faction: factionName(character.faction_slug),
                level: character.level,
              })}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div style={{ fontFamily: ACCENT_FONT, fontSize: 'var(--text-title)', lineHeight: 0.9, color: RED }}>
              {character.score?.toLocaleString() ?? '0'}
            </div>
            <div style={{ ...kicker, marginTop: 'var(--space-xs)' }}>{t('fieldDesk.home.stats.points')}</div>
          </div>
        </div>

        {/* Points seals */}
        <div className="flex gap-2" style={{ marginTop: 'var(--space-lg)' }}>
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center"
              style={{ flex: '1 1 0', minWidth: 0, background: PAPER_DEEP, border: `1.5px solid ${INK}`, padding: 'var(--space-md) var(--space-sm)' }}
            >
              <div className="truncate" style={{ fontFamily: ACCENT_FONT, fontSize: 'var(--text-title)', lineHeight: 0.9, color: INK }}>
                {stat.value}
              </div>
              <div style={{ ...kicker, marginTop: 'var(--space-sm)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </Plate>

      {/* ── Pending requests ── */}
      {pendingCount > 0 && (
        <Link
          to="/updates?filter=requests"
          className="flex items-center justify-between"
          style={{ background: PAPER, border: `1.5px solid ${INK}`, padding: 'var(--space-md) var(--space-lg)', fontFamily: ACCENT_FONT, fontSize: 'var(--text-content)', letterSpacing: '0.04em', color: INK, textDecoration: 'none' }}
        >
          <span>{t('fieldDesk.home.pending', { count: pendingCount })}</span>
          <span aria-hidden style={{ color: RED }}>›</span>
        </Link>
      )}

      {/* ── On the job ── */}
      <Plate>
        <SectionHead
          title={t('fieldDesk.home.everymen.questsHeading')}
          trailing={
            <Link to="/tasks" style={{ ...kicker, color: RED, textDecoration: 'none' }}>
              {t('fieldDesk.home.viewAll')}
            </Link>
          }
        />

        {activeTasks.length === 0 ? (
          <p style={{ fontFamily: BODY_FONT, fontSize: 'var(--text-content)', color: MUTED, margin: 0 }}>
            {t('fieldDesk.home.questsEmpty')}
          </p>
        ) : (
          <div className="flex flex-col">
            {activeTasks.map((praxis, index) => (
              <Link
                key={praxis.id}
                to={`/praxis/${praxis.id}/edit`}
                className="flex items-center gap-3"
                style={{ padding: 'var(--space-md) 0', borderTop: index === 0 ? undefined : `1px solid color-mix(in srgb, var(--everymen-ink) 20%, transparent)`, textDecoration: 'none' }}
              >
                <span className="shrink-0" style={{ width: 10, height: 10, background: RED }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ fontFamily: ACCENT_FONT, fontSize: 'var(--text-content)', lineHeight: 1.05, color: INK }}>
                    {praxis.task_title}
                  </div>
                  <div className="truncate" style={{ ...kicker, marginTop: 'var(--space-xs)' }}>
                    {t('fieldDesk.home.taskMeta', {
                      faction: factionName(praxis.task_faction_slug),
                      points: praxis.task_point_value,
                    })}
                  </div>
                </div>
                <span
                  className="shrink-0"
                  style={{ fontFamily: BODY_FONT, fontSize: 'var(--text-xs)', letterSpacing: '0.1em', textTransform: 'uppercase', color: CREAM, background: INK, padding: 'var(--space-xs) var(--space-sm)' }}
                >
                  {praxisModeLabel(praxis, t)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Plate>

      {/* ── Primary actions ── */}
      <div className="flex gap-2.5">
        <Link
          to="/tasks"
          className="flex-1 flex items-center justify-center"
          style={{ fontFamily: ACCENT_FONT, fontSize: 'var(--text-xl)', letterSpacing: '0.08em', padding: 'var(--space-lg)', color: CREAM, background: RED, border: `2px solid ${INK}`, textDecoration: 'none' }}
        >
          {t('fieldDesk.home.browseTasks')}
        </Link>
        {canProposeTask && (
          <Link
            to="/propose-task"
            className="flex-1 flex items-center justify-center gap-2"
            style={{ fontFamily: ACCENT_FONT, fontSize: 'var(--text-xl)', letterSpacing: '0.08em', padding: 'var(--space-lg)', color: INK, background: PAPER_DEEP, border: `2px solid ${INK}`, textDecoration: 'none' }}
          >
            {/* eslint-disable-next-line local/no-raw-style-values -- ornament: "+" glyph used as an icon, sized to the button row */}
            <span aria-hidden style={{ fontSize: 15, lineHeight: 1 }}>+</span>
            <span>{t('actions.proposeTask')}</span>
          </Link>
        )}
      </div>
    </div>
  )
}
