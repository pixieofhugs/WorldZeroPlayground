import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import type { FieldDeskHomeState } from '../useFieldDeskHome'

/**
 * Cozy Coven MOBILE FieldDesk home (#500) — the scrapbook window idiom
 * on a phone: the carried life and its in-progress quests each become a little
 * pink "window" (traffic-light dots + sparkle-titled bar, a dotted board and an
 * inner notepad), taped to a rose board. Same content slots as the Default
 * mobile home — character header, stat tiles, active-tasks list, primary
 * actions — only the dress changes. Ported from the Field Kit `wow-treatment`
 * §02 home; grounds entirely on the `--faction-coven-*` window tokens already in
 * index.css (same set CovenTaskDetail uses). Presentation-only.
 */

const PINK = 'var(--faction-coven)'
const TITLE_TEXT = 'var(--faction-coven-title-text)'
const CARD_TEXT = 'var(--faction-coven-card-text)'
const CARD_MUTED = 'var(--faction-coven-card-muted)'
const WIN_BORDER = 'var(--faction-coven-win-border)'
const NOTEPAD_BG = 'var(--faction-coven-notepad-bg)'
const NOTEPAD_BORDER = 'var(--faction-coven-notepad-border)'
const BODY_BG = 'var(--faction-coven-body-bg)'
const DOT = 'var(--faction-coven-dot)'
const SCRIPT = 'var(--faction-coven-card-font)' // Caveat
const BODY = 'var(--font-body)' // Courier Prime
const ON_ACCENT = 'var(--color-text-on-accent)'

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

/** A pink window: dotted title bar + dotted board wrapping an inner notepad. */
function Window({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        border: `2px solid ${WIN_BORDER}`,
        boxShadow: `0 8px 22px color-mix(in srgb, ${PINK} 22%, transparent)`,
      }}
    >
      {/* title bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: 'var(--space-sm) var(--space-md)',
          background: 'linear-gradient(180deg, var(--faction-coven-title-from), var(--faction-coven-title-to))',
          borderBottom: `2px solid ${WIN_BORDER}`,
        }}
      >
        {['var(--faction-coven-scrap-deep)', 'var(--faction-coven-tape)', 'var(--faction-coven-ivy-leaf)'].map((c) => (
          <span
            key={c}
            style={{ width: 9, height: 9, borderRadius: '50%', background: c, border: '1.2px solid rgba(255,255,255,0.7)' }}
          />
        ))}
        <span
          style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)', fontFamily: SCRIPT, fontSize: 'var(--text-content)', color: TITLE_TEXT }}
        >
          <Sparkle size={11} color={TITLE_TEXT} />
          {title}
        </span>
      </div>
      {/* dotted board */}
      <div
        style={{
          padding: 'var(--space-md)',
          background: BODY_BG,
          backgroundImage: `radial-gradient(${DOT} 1.4px, transparent 1.4px)`,
          backgroundSize: '13px 13px',
        }}
      >
        <div style={{ background: NOTEPAD_BG, border: `1.5px solid ${NOTEPAD_BORDER}`, borderRadius: 9, padding: 'var(--space-md)' }}>
          {children}
        </div>
      </div>
    </section>
  )
}

const pinkButton: CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-sm)',
  fontFamily: BODY,
  fontSize: 'var(--text-lg)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  fontWeight: 700,
  padding: 'var(--space-lg)',
  borderRadius: 14,
  color: ON_ACCENT,
  border: `1.5px solid ${WIN_BORDER}`,
  background: `linear-gradient(180deg, ${PINK}, var(--faction-coven-card-muted))`,
  textDecoration: 'none',
}

const ghostButton: CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-sm)',
  fontFamily: BODY,
  fontSize: 'var(--text-lg)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  padding: 'var(--space-lg)',
  borderRadius: 14,
  color: TITLE_TEXT,
  border: `1.5px solid ${NOTEPAD_BORDER}`,
  background: NOTEPAD_BG,
  textDecoration: 'none',
}

export default function CovenFieldDesk({ state }: { state: FieldDeskHomeState }) {
  const { t } = useTranslation('common')
  const { character, eraName, votesReceived, activeTasks, pendingCount, canProposeTask } = state

  const stats = [
    { label: t('fieldDesk.home.stats.points'), value: character.score?.toLocaleString() ?? '0' },
    { label: t('fieldDesk.home.stats.votes'), value: votesReceived.toLocaleString() },
    { label: t('fieldDesk.home.stats.era'), value: eraName || '—' },
  ]

  return (
    <div
      data-skin="coven"
      className="page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-lg)',
        fontFamily: BODY,
        color: CARD_TEXT,
        background: BODY_BG,
        backgroundImage: `radial-gradient(${DOT} 1.4px, transparent 1.4px)`,
        backgroundSize: '15px 15px',
      }}
    >
      <header>
        <div className="eyebrow" style={{ color: CARD_MUTED }}>{t('nav.home')}</div>
        <h1 style={{ fontFamily: SCRIPT, fontSize: 'var(--text-heading)', lineHeight: 0.9, color: TITLE_TEXT, margin: 0 }}>
          {t('fieldDesk.home.title')}
        </h1>
      </header>

      {/* ── Character window ── */}
      <Window title={t('fieldDesk.home.coven.charWindow')}>
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-md)' }}>
          <span className="eyebrow" style={{ color: CARD_MUTED }}>
            {t('fieldDesk.home.coven.charEyebrow')}
          </span>
          <Link
            to={`/characters/${character.id}/edit`}
            className="eyebrow"
            style={{ color: PINK, textDecoration: 'none' }}
          >
            {t('fieldDesk.home.edit')}
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="shrink-0"
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              // eslint-disable-next-line local/no-raw-style-values -- ornament: pink ring thickness drawn around a 56px avatar; the nearest rung (4px) thickens the band by a third.
              padding: 3,
              background: PINK,
            }}
          >
            {character.avatar_url ? (
              <img
                src={mediaUrl(character.avatar_url)}
                alt={character.display_name}
                className="w-full h-full rounded-full"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <span
                className="flex w-full h-full items-center justify-center rounded-full"
                style={{
                  background: 'radial-gradient(circle at 35% 28%, var(--faction-coven-title-from), var(--faction-coven))',
                  fontFamily: SCRIPT,
                  // eslint-disable-next-line local/no-raw-style-values -- ornament: avatar initial sized to its 56px medallion, not text
                  fontSize: 24,
                  color: ON_ACCENT,
                }}
              >
                {character.display_name[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              to={`/characters/${character.id}`}
              className="block truncate"
              style={{ fontFamily: SCRIPT, fontSize: 'var(--text-heading)', lineHeight: 0.95, color: TITLE_TEXT, textDecoration: 'none' }}
            >
              {character.display_name}
            </Link>
            <div
              className="truncate"
              style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--text-base)', letterSpacing: '0.12em', textTransform: 'uppercase', color: CARD_MUTED }}
            >
              {t('sidebar.characterCard.factionLevel', {
                faction: factionName(character.faction_slug),
                level: character.level,
              })}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div style={{ fontFamily: SCRIPT, fontSize: 'var(--text-heading)', lineHeight: 1, color: TITLE_TEXT }}>
              {character.score?.toLocaleString() ?? '0'}
            </div>
            <div className="eyebrow" style={{ color: CARD_MUTED }}>
              {t('fieldDesk.home.stats.points')}
            </div>
          </div>
        </div>

        <div className="flex gap-2" style={{ marginTop: 'var(--space-lg)' }}>
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center"
              style={{
                flex: '1 1 0',
                minWidth: 0,
                background: 'var(--faction-coven-scrap-mid)',
                border: `1px solid ${NOTEPAD_BORDER}`,
                borderRadius: 12,
                padding: 'var(--space-md) var(--space-sm)',
              }}
            >
              <div className="truncate" style={{ fontFamily: SCRIPT, fontSize: 'var(--text-title)', lineHeight: 1, color: TITLE_TEXT }}>
                {stat.value}
              </div>
              <div className="eyebrow" style={{ marginTop: 'var(--space-xs)', color: CARD_MUTED }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </Window>

      {/* ── Pending requests ── */}
      {pendingCount > 0 && (
        <Link
          to="/updates?filter=requests"
          className="flex items-center justify-between"
          style={{
            background: NOTEPAD_BG,
            border: `1.5px solid ${NOTEPAD_BORDER}`,
            borderRadius: 999,
            padding: 'var(--space-md) var(--space-lg)',
            fontSize: 'var(--text-content)',
            color: TITLE_TEXT,
            textDecoration: 'none',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <Sparkle size={12} color={PINK} />
            {t('fieldDesk.home.pending', { count: pendingCount })}
          </span>
          <span aria-hidden style={{ color: CARD_MUTED }}>›</span>
        </Link>
      )}

      {/* ── Quests window ── */}
      <Window title={t('fieldDesk.home.coven.questsWindow')}>
        <div className="flex items-center gap-2.5" style={{ marginBottom: 'var(--space-sm)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)', fontFamily: SCRIPT, fontSize: 'var(--text-content)', color: TITLE_TEXT }}>
            <Sparkle size={12} color={PINK} />
            {t('fieldDesk.home.coven.questsHeading')}
          </span>
          <span style={{ flex: 1, height: 2, background: `repeating-linear-gradient(90deg, ${PINK} 0 8px, transparent 8px 14px)` }} />
          <Link to="/tasks" className="eyebrow" style={{ color: PINK, textDecoration: 'none' }}>
            {t('fieldDesk.home.viewAll')}
          </Link>
        </div>

        {activeTasks.length === 0 ? (
          <p style={{ fontFamily: SCRIPT, fontSize: 'var(--text-content)', color: PINK, margin: 0 }}>
            {t('fieldDesk.home.questsEmpty')}
          </p>
        ) : (
          <div className="flex flex-col">
            {activeTasks.map((praxis, index) => (
              <Link
                key={praxis.id}
                to={`/praxes/${praxis.id}/edit`}
                className="flex items-center gap-3"
                style={{
                  padding: 'var(--space-md) 0',
                  borderTop: index === 0 ? undefined : `1px solid ${NOTEPAD_BORDER}`,
                  textDecoration: 'none',
                }}
              >
                <span className="shrink-0" style={{ width: 10, height: 10, borderRadius: 3, background: PINK }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ fontFamily: SCRIPT, fontSize: 'var(--text-content)', lineHeight: 1, color: TITLE_TEXT }}>
                    {praxis.task_title}
                  </div>
                  <div
                    className="truncate"
                    style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--text-sm)', letterSpacing: '0.1em', textTransform: 'uppercase', color: CARD_MUTED }}
                  >
                    {t('fieldDesk.home.taskMeta', {
                      faction: factionName(praxis.task_faction_slug),
                      points: praxis.task_point_value,
                    })}
                  </div>
                </div>
                <span
                  className="shrink-0 eyebrow"
                  style={{ color: PINK, padding: 'var(--space-xs) var(--space-sm)', border: `1.5px solid ${NOTEPAD_BORDER}`, borderRadius: 999 }}
                >
                  {t(`praxisType.${praxis.type}`)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Window>

      {/* ── Primary actions ── */}
      <div className="flex gap-2.5">
        <Link to="/tasks" style={pinkButton}>
          <Sparkle size={13} color={ON_ACCENT} />
          {t('fieldDesk.home.browseTasks')}
        </Link>
        {canProposeTask && (
          <Link to="/propose-task" style={ghostButton}>
            {/* eslint-disable-next-line local/no-raw-style-values -- ornament: "+" glyph used as an icon, sized to the button row */}
            <span aria-hidden style={{ fontSize: 15, lineHeight: 1 }}>+</span>
            {t('actions.proposeTask')}
          </Link>
        )}
      </div>
    </div>
  )
}
