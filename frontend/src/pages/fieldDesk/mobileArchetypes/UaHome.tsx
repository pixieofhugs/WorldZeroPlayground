import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import type { FieldDeskHomeState } from '../useFieldDeskHome'

/**
 * University of Asthmatics MOBILE FieldDesk home (#525) — the gilt salon on a
 * phone. The carried life and its in-progress commissions become parchment
 * plates set in a gold-leaf frame, headed by an engraved masthead. Same content
 * slots as the Default mobile home (character header, Points/Votes/Era stat
 * tiles, active-tasks list, primary actions) — only the dress changes. Grounds
 * on the `--faction-ua-*` / `--ua-*` tokens already in index.css (the set
 * UaFeedFrame / UaFactionBody use) and is always-light: UA never dims.
 * Presentation-only — all data arrives via {@link FieldDeskHomeState}.
 */

const PAPER = 'var(--faction-ua-card-bg)'
const PAPER_WARM = 'var(--ua-paper-warm)'
const WALL = 'var(--ua-wall)'
const INK = 'var(--faction-ua-card-text)'
const ACCENT = 'var(--faction-ua-card-accent)'
const SUB = 'var(--faction-ua-card-muted)'
const MUTED = 'var(--ua-muted)'
const GOLD = 'var(--ua-gold)'
const GOLD_PALE = 'var(--ua-gold-pale)'
const LINE = 'var(--ua-line)'
const GILT = 'var(--ua-gilt)'
const DISPLAY = 'var(--faction-ua-card-font)'
const ENGRAVED = 'var(--font-faction-engraved)'
const MONO = 'var(--font-body)'

const kicker: CSSProperties = {
  fontFamily: MONO,
  fontSize: 'var(--text-xs)',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: MUTED,
}

/** Parchment plate set in the salon's gold-leaf sandwich frame. */
function Plate({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: 8,
        background: GILT,
        boxShadow: '0 10px 24px rgba(60,40,10,.18), inset 0 0 0 1px rgba(255,255,255,0.45)',
      }}
    >
      <div style={{ padding: 3, background: `linear-gradient(135deg, ${GOLD}, ${GOLD_PALE})` }}>
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: PAPER,
            backgroundImage: 'radial-gradient(rgba(60,40,10,.03) 1px, transparent 1px)',
            backgroundSize: '5px 5px',
            border: `1px solid ${LINE}`,
            padding: 16,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export default function UaHome({ state }: { state: FieldDeskHomeState }) {
  const { t } = useTranslation('common')
  const { character, eraName, votesReceived, activeTasks, pendingCount, canProposeTask } = state

  const stats = [
    { label: t('fieldDesk.home.stats.points'), value: character.score?.toLocaleString() ?? '0' },
    { label: t('fieldDesk.home.stats.votes'), value: votesReceived.toLocaleString() },
    { label: t('fieldDesk.home.stats.era'), value: eraName || '—' },
  ]

  return (
    <div
      data-skin="ua"
      className="page"
      style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: MONO, color: INK, background: WALL }}
    >
      {/* Engraved masthead */}
      <header>
        <div style={kicker}>{t('nav.home')}</div>
        <h1 style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 'var(--text-heading)', lineHeight: 1, color: INK, margin: '2px 0 0' }}>
          {t('fieldDesk.home.ua.masthead')}
        </h1>
        <div style={{ height: 1, marginTop: 9, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
      </header>

      {/* ── Sitter plate ── */}
      <Plate>
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <span style={kicker}>{t('fieldDesk.home.ua.charEyebrow')}</span>
          <Link to={`/characters/${character.id}/edit`} style={{ ...kicker, color: ACCENT, textDecoration: 'none' }}>
            {t('fieldDesk.home.edit')}
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="shrink-0" style={{ width: 56, height: 56, borderRadius: '50%', padding: 3, background: `linear-gradient(135deg, ${GOLD}, ${GOLD_PALE})` }}>
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
                // ornament: avatar initial sized to its 56px medallion, not text
                style={{ background: PAPER_WARM, fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 24, color: ACCENT }}
              >
                {character.display_name[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              to={`/characters/${character.id}`}
              className="block truncate"
              style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 'var(--text-title)', lineHeight: 1, color: INK, textDecoration: 'none' }}
            >
              {character.display_name}
            </Link>
            <div className="truncate" style={{ marginTop: 5, fontFamily: ENGRAVED, fontSize: 'var(--text-sm)', letterSpacing: '0.12em', textTransform: 'uppercase', color: SUB }}>
              {t('sidebar.characterCard.factionLevel', {
                faction: factionName(character.faction_slug),
                level: character.level,
              })}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 'var(--text-title)', lineHeight: 1, color: INK }}>
              {character.score?.toLocaleString() ?? '0'}
            </div>
            <div style={{ ...kicker, marginTop: 2 }}>{t('fieldDesk.home.stats.points')}</div>
          </div>
        </div>

        <div className="flex gap-2" style={{ marginTop: 16 }}>
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center"
              style={{ flex: '1 1 0', minWidth: 0, background: PAPER_WARM, border: `1px solid ${LINE}`, padding: '11px 6px' }}
            >
              <div className="truncate" style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 'var(--text-content)', lineHeight: 1, color: INK }}>
                {stat.value}
              </div>
              <div style={{ ...kicker, marginTop: 6 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </Plate>

      {/* ── Pending requests ── */}
      {pendingCount > 0 && (
        <Link
          to="/updates?filter=requests"
          className="flex items-center justify-between"
          style={{ background: PAPER, border: `1px solid ${LINE}`, borderRadius: 999, padding: '10px 16px', fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 'var(--text-content)', color: INK, textDecoration: 'none' }}
        >
          <span>{t('fieldDesk.home.pending', { count: pendingCount })}</span>
          <span aria-hidden style={{ color: ACCENT }}>›</span>
        </Link>
      )}

      {/* ── Commissions at the easel ── */}
      <Plate>
        <div className="flex items-center gap-2.5" style={{ marginBottom: 10 }}>
          <span style={{ fontFamily: ENGRAVED, fontSize: 'var(--text-md)', letterSpacing: '0.1em', textTransform: 'uppercase', color: INK }}>
            {t('fieldDesk.home.ua.questsHeading')}
          </span>
          <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
          <Link to="/tasks" style={{ ...kicker, color: ACCENT, textDecoration: 'none' }}>
            {t('fieldDesk.home.viewAll')}
          </Link>
        </div>

        {activeTasks.length === 0 ? (
          <p style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 'var(--text-content)', color: SUB, margin: 0 }}>
            {t('fieldDesk.home.questsEmpty')}
          </p>
        ) : (
          <div className="flex flex-col">
            {activeTasks.map((praxis, index) => (
              <Link
                key={praxis.id}
                to={`/praxes/${praxis.id}/edit`}
                className="flex items-center gap-3"
                style={{ padding: '12px 0', borderTop: index === 0 ? undefined : `1px solid ${LINE}`, textDecoration: 'none' }}
              >
                <span className="shrink-0" style={{ width: 9, height: 9, borderRadius: '50%', background: ACCENT }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 'var(--text-content)', lineHeight: 1.15, color: INK }}>
                    {praxis.task_title}
                  </div>
                  <div className="truncate" style={{ marginTop: 3, fontFamily: ENGRAVED, fontSize: 'var(--text-xs)', letterSpacing: '0.1em', textTransform: 'uppercase', color: SUB }}>
                    {t('fieldDesk.home.taskMeta', {
                      faction: factionName(praxis.task_faction_slug),
                      points: praxis.task_point_value,
                    })}
                  </div>
                </div>
                <span
                  className="shrink-0"
                  style={{ fontFamily: MONO, fontSize: 'var(--text-xs)', letterSpacing: '0.1em', textTransform: 'uppercase', color: GOLD, padding: '4px 9px', border: `1px solid ${LINE}` }}
                >
                  {t(`praxisType.${praxis.type}`)}
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
          style={{ fontFamily: ENGRAVED, fontSize: 'var(--text-lg)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: 14, color: PAPER_WARM, background: ACCENT, border: `1px solid ${ACCENT}`, boxShadow: '0 6px 16px rgba(194,84,31,.28)', textDecoration: 'none' }}
        >
          {t('fieldDesk.home.browseTasks')}
        </Link>
        {canProposeTask && (
          <Link
            to="/propose-task"
            className="flex-1 flex items-center justify-center gap-2"
            style={{ fontFamily: ENGRAVED, fontSize: 'var(--text-lg)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: 14, color: INK, background: PAPER, border: `1px solid ${LINE}`, textDecoration: 'none' }}
          >
            {/* ornament: "+" glyph used as an icon, sized to the button row */}
            <span aria-hidden style={{ fontSize: 15, lineHeight: 1 }}>+</span>
            <span>{t('actions.proposeTask')}</span>
          </Link>
        )}
      </div>
    </div>
  )
}
