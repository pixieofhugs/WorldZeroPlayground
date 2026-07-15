import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import { EphMark } from '../../../components/cards/ephemeristsAtoms'
import type { FieldDeskHomeState } from '../useFieldDeskHome'

/**
 * The Ephemerists MOBILE FieldDesk home (#527) — the vellum codex on a phone.
 * The carried life and its surveys-underway become ledger-ruled leaves bound in
 * gold-deep hairlines, headed by a Cinzel running-head. Same content slots as the
 * Default mobile home (character header, Points/Votes/Era stat tiles,
 * active-tasks list, primary actions) — only the dress changes. Grounds on the
 * `--eph-*` / `--faction-ephemerists-*` tokens already in index.css (the set the
 * desktop Ephemerists surfaces read) and is theme-aware through the cascade: the
 * vellum flips to tobacco in dark, no ternaries. Presentation-only — all data
 * arrives via {@link FieldDeskHomeState}.
 */

const VELLUM = 'var(--eph-vellum)'
const VELLUM_DEEP = 'var(--eph-vellum-deep)'
const TEXT = 'var(--eph-vellum-text)'
const MUTED = 'var(--eph-muted)'
const RUBRIC = 'var(--eph-rubric)'
const LAPIS = 'var(--eph-lapis)'
const GOLD = 'var(--eph-gold)'
const GOLD_DEEP = 'var(--eph-gold-deep)'
const PARCHMENT = 'var(--eph-parchment)'
const DISPLAY = 'var(--eph-display)'
const SERIF = 'var(--eph-serif)'
const SCRIPT = 'var(--eph-script)'

const kicker: CSSProperties = {
  fontFamily: DISPLAY,
  fontSize: 8,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: MUTED,
}

const goldRule = `linear-gradient(90deg, ${GOLD}, transparent)`

/** A ledger leaf bound in a gold-deep hairline on aged vellum. */
function Leaf({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        background: VELLUM,
        border: `1px solid ${GOLD_DEEP}`,
        boxShadow: '0 10px 24px rgba(42,29,18,0.14)',
        padding: 16,
      }}
    >
      {children}
    </div>
  )
}

export default function EphemeristsHome({ state }: { state: FieldDeskHomeState }) {
  const { t } = useTranslation('common')
  const { character, eraName, votesReceived, activeTasks, pendingCount, canProposeTask } = state

  const stats = [
    { label: t('fieldDesk.home.stats.points'), value: character.score?.toLocaleString() ?? '0' },
    { label: t('fieldDesk.home.stats.votes'), value: votesReceived.toLocaleString() },
    { label: t('fieldDesk.home.stats.era'), value: eraName || '—' },
  ]

  return (
    <div
      data-skin="ephemerists"
      className="page"
      style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: SERIF, color: TEXT, background: VELLUM_DEEP }}
    >
      {/* Cinzel running-head */}
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: RUBRIC }}>
          <EphMark size={13} color={LAPIS} />
          <span style={kicker}>{t('nav.home')}</span>
        </div>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 28, lineHeight: 1.05, color: TEXT, margin: '4px 0 0' }}>
          {t('fieldDesk.home.ephemerists.masthead')}
        </h1>
        <div style={{ height: 1, marginTop: 9, background: goldRule }} />
      </header>

      {/* ── Observer leaf ── */}
      <Leaf>
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <span style={{ ...kicker, color: RUBRIC }}>{t('fieldDesk.home.ephemerists.charEyebrow')}</span>
          <Link to={`/characters/${character.id}/edit`} style={{ ...kicker, color: LAPIS, textDecoration: 'none' }}>
            {t('fieldDesk.home.edit')}
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="shrink-0" style={{ width: 56, height: 56, borderRadius: '50%', padding: 2, background: GOLD_DEEP }}>
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
                style={{ background: VELLUM_DEEP, fontFamily: DISPLAY, fontWeight: 700, fontSize: 24, color: RUBRIC }}
              >
                {character.display_name[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              to={`/characters/${character.id}`}
              className="block truncate"
              style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 24, lineHeight: 1, color: TEXT, textDecoration: 'none' }}
            >
              {character.display_name}
            </Link>
            <div className="truncate" style={{ marginTop: 5, fontFamily: DISPLAY, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED }}>
              {t('sidebar.characterCard.factionLevel', {
                faction: factionName(character.faction_slug),
                level: character.level,
              })}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 24, lineHeight: 1, color: RUBRIC }}>
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
              style={{ flex: '1 1 0', minWidth: 0, background: VELLUM_DEEP, border: `1px solid ${GOLD_DEEP}`, padding: '11px 6px' }}
            >
              <div className="truncate" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 20, lineHeight: 1, color: TEXT }}>
                {stat.value}
              </div>
              <div style={{ ...kicker, marginTop: 6 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </Leaf>

      {/* ── Pending requests ── */}
      {pendingCount > 0 && (
        <Link
          to="/updates?filter=requests"
          className="flex items-center justify-between"
          style={{ background: VELLUM, border: `1px solid ${GOLD_DEEP}`, padding: '10px 16px', fontFamily: SCRIPT, fontStyle: 'italic', fontSize: 15, color: TEXT, textDecoration: 'none' }}
        >
          <span>{t('fieldDesk.home.pending', { count: pendingCount })}</span>
          <span aria-hidden style={{ color: RUBRIC }}>›</span>
        </Link>
      )}

      {/* ── Surveys underway ── */}
      <Leaf>
        <div className="flex items-center gap-2.5" style={{ marginBottom: 10 }}>
          <span style={{ fontFamily: DISPLAY, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: TEXT }}>
            {t('fieldDesk.home.ephemerists.questsHeading')}
          </span>
          <span style={{ flex: 1, height: 1, background: goldRule }} />
          <Link to="/tasks" style={{ ...kicker, color: LAPIS, textDecoration: 'none' }}>
            {t('fieldDesk.home.viewAll')}
          </Link>
        </div>

        {activeTasks.length === 0 ? (
          <p style={{ fontFamily: SCRIPT, fontStyle: 'italic', fontSize: 15, color: MUTED, margin: 0 }}>
            {t('fieldDesk.home.questsEmpty')}
          </p>
        ) : (
          <div className="flex flex-col">
            {activeTasks.map((praxis, index) => (
              <Link
                key={praxis.id}
                to={`/praxes/${praxis.id}/edit`}
                className="flex items-center gap-3"
                style={{ padding: '12px 0', borderTop: index === 0 ? undefined : `1px solid ${GOLD_DEEP}`, textDecoration: 'none' }}
              >
                <span className="shrink-0" style={{ width: 9, height: 9, borderRadius: '50%', background: RUBRIC }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, lineHeight: 1.15, color: TEXT }}>
                    {praxis.task_title}
                  </div>
                  <div className="truncate" style={{ marginTop: 3, fontFamily: DISPLAY, fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED }}>
                    {t('fieldDesk.home.taskMeta', {
                      faction: factionName(praxis.task_faction_slug),
                      points: praxis.task_point_value,
                    })}
                  </div>
                </div>
                <span
                  className="shrink-0"
                  style={{ fontFamily: DISPLAY, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: LAPIS, padding: '4px 9px', border: `1px solid ${GOLD_DEEP}` }}
                >
                  {t(`praxisType.${praxis.type}`)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Leaf>

      {/* ── Primary actions ── */}
      <div className="flex gap-2.5">
        <Link
          to="/tasks"
          className="flex-1 flex items-center justify-center"
          style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', padding: 14, color: PARCHMENT, background: RUBRIC, border: `1px solid ${GOLD}`, textDecoration: 'none' }}
        >
          {t('fieldDesk.home.browseTasks')}
        </Link>
        {canProposeTask && (
          <Link
            to="/propose-task"
            className="flex-1 flex items-center justify-center gap-2"
            style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', padding: 14, color: TEXT, background: VELLUM, border: `1px solid ${GOLD_DEEP}`, textDecoration: 'none' }}
          >
            <span aria-hidden style={{ fontSize: 15, lineHeight: 1 }}>+</span>
            <span>{t('actions.proposeTask')}</span>
          </Link>
        )}
      </div>
    </div>
  )
}
