import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import { praxisModeLabel } from '../../../utils/praxis'
import { EphemeristsSigil } from '../../../components/sigil/EphemeristsSigil'
import {
  BRASS,
  CAPTION,
  CTA_BG,
  CTA_INK,
  DECO,
  FlutedRule,
  INK,
  INNER,
  LINE,
  MARGINALIA,
  NILE,
  OCHRE,
  PAGE,
  QUIET,
  READING,
  RULE,
  SHADOW,
  SMALL_CAPS,
  PLATE as SHEET,
} from '../../../components/factionMarks/ephemeristsPlate'
import type { FieldDeskHomeState } from '../useFieldDeskHome'
import { REQUESTS_QUEUE_LINK } from '../../updates/requestsQueueAnchor'

/**
 * The Ephemerists MOBILE FieldDesk home (#527, swept onto the Valley plate by
 * #1208) — the field journal on a phone. The carried life and its
 * surveys-underway become papyrus leaves bound in hairlines, headed by an
 * incised running-head over the design's fluted rule. Same content slots as the
 * Default mobile home (character header, Points/Votes/Era stat tiles,
 * active-tasks list, primary actions) — only the dress changes. Grounds on
 * `--faction-ephemerists-plate-*` and is theme-aware through the cascade: the
 * papyrus flips to the night plate in dark, no ternaries. Presentation-only —
 * all data arrives via {@link FieldDeskHomeState}.
 */

const kicker: CSSProperties = {
  ...SMALL_CAPS,
  fontSize: 'var(--text-xs)',
  letterSpacing: '0.22em',
  color: QUIET,
}

const brassRule = `linear-gradient(90deg, ${BRASS}, transparent)`

/** One leaf off the field journal — papyrus inside the plate's hairline. */
function Leaf({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        background: SHEET,
        border: `1px solid ${LINE}`,
        boxShadow: SHADOW,
        padding: 'var(--space-lg)',
      }}
    >
      {children}
    </div>
  )
}

export default function EphemeristsFieldDesk({ state }: { state: FieldDeskHomeState }) {
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
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', fontFamily: READING, color: INK, background: PAGE }}
    >
      {/* Cinzel running-head */}
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <EphemeristsSigil size={13} color={BRASS} />
          <span style={{ ...kicker, color: CAPTION }}>{t('nav.home')}</span>
        </div>
        <h1 style={{ fontFamily: DECO, fontSize: 'var(--text-title)', lineHeight: 1.05, letterSpacing: '0.04em', color: INK, margin: 'var(--space-xs) 0 0' }}>
          {t('fieldDesk.home.ephemerists.masthead')}
        </h1>
        <div style={{ marginTop: 'var(--space-sm)' }}>
          <FlutedRule />
        </div>
      </header>

      {/* ── Observer leaf ── */}
      <Leaf>
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
          <span style={{ ...kicker, color: CAPTION }}>{t('fieldDesk.home.ephemerists.charEyebrow')}</span>
          <Link to={`/characters/${character.id}/edit`} style={{ ...kicker, color: NILE, textDecoration: 'none' }}>
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
              // eslint-disable-next-line local/no-raw-style-values -- ornament: brass ring thickness drawn around a 56px avatar; the nearest rung (4px) doubles the band.
              padding: 2,
              background: BRASS,
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
                // eslint-disable-next-line local/no-raw-style-values -- ornament: avatar initial sized to its 56px gilt ring, not text
                style={{ background: INNER, fontFamily: DECO, fontSize: 24, color: INK }}
              >
                {character.display_name[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              to={`/characters/${character.id}`}
              className="block truncate"
              style={{ fontFamily: DECO, fontSize: 'var(--text-title)', lineHeight: 1, letterSpacing: '0.03em', color: INK, textDecoration: 'none' }}
            >
              {character.display_name}
            </Link>
            <div className="truncate" style={{ marginTop: 'var(--space-xs)', ...SMALL_CAPS, fontSize: 'var(--text-sm)', letterSpacing: '0.12em', color: QUIET }}>
              {t('sidebar.characterCard.factionLevel', {
                faction: factionName(character.faction_slug),
                level: character.level,
              })}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div style={{ fontFamily: DECO, fontSize: 'var(--text-title)', lineHeight: 1, color: INK }}>
              {character.score?.toLocaleString() ?? '0'}
            </div>
            <div style={{ ...kicker, marginTop: 'var(--space-xs)' }}>{t('fieldDesk.home.stats.points')}</div>
          </div>
        </div>

        <div className="flex gap-2" style={{ marginTop: 'var(--space-lg)' }}>
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center"
              style={{ flex: '1 1 0', minWidth: 0, background: INNER, border: `1px solid ${LINE}`, padding: 'var(--space-md) var(--space-sm)' }}
            >
              <div className="truncate" style={{ fontFamily: DECO, fontSize: 'var(--text-content)', lineHeight: 1, color: INK }}>
                {stat.value}
              </div>
              <div style={{ ...kicker, marginTop: 'var(--space-sm)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </Leaf>

      {/* ── Pending requests ── */}
      {pendingCount > 0 && (
        <Link
          to={REQUESTS_QUEUE_LINK}
          className="flex items-center justify-between"
          style={{ background: SHEET, border: `1px solid ${LINE}`, padding: 'var(--space-md) var(--space-lg)', fontFamily: MARGINALIA, fontStyle: 'italic', fontSize: 'var(--text-content)', color: INK, textDecoration: 'none' }}
        >
          <span>{t('fieldDesk.home.pending', { count: pendingCount })}</span>
          <span aria-hidden style={{ color: NILE }}>›</span>
        </Link>
      )}

      {/* ── Surveys underway ── */}
      <Leaf>
        <div className="flex items-center gap-2.5" style={{ marginBottom: 'var(--space-md)' }}>
          <span style={{ ...SMALL_CAPS, fontSize: 'var(--text-md)', letterSpacing: '0.18em', color: INK }}>
            {t('fieldDesk.home.ephemerists.questsHeading')}
          </span>
          <span style={{ flex: 1, height: 1, background: brassRule }} />
          <Link to="/tasks" style={{ ...kicker, color: NILE, textDecoration: 'none' }}>
            {t('fieldDesk.home.viewAll')}
          </Link>
        </div>

        {activeTasks.length === 0 ? (
          <p style={{ fontFamily: MARGINALIA, fontStyle: 'italic', fontSize: 'var(--text-content)', color: QUIET, margin: 0 }}>
            {t('fieldDesk.home.questsEmpty')}
          </p>
        ) : (
          <div className="flex flex-col">
            {activeTasks.map((praxis, index) => (
              <Link
                key={praxis.id}
                to={`/praxis/${praxis.id}/edit`}
                className="flex items-center gap-3"
                style={{ padding: 'var(--space-md) 0', borderTop: index === 0 ? undefined : `1px solid ${RULE}`, textDecoration: 'none' }}
              >
                {/* ornament: the register's lead dot, drawn square to the row's
                    cap height — illustration geometry, not layout spacing. */}
                <span className="shrink-0" style={{ width: 9, height: 9, background: OCHRE }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ fontFamily: DECO, fontSize: 'var(--text-content)', lineHeight: 1.15, color: INK }}>
                    {praxis.task_title}
                  </div>
                  <div className="truncate" style={{ marginTop: 'var(--space-xs)', ...SMALL_CAPS, fontSize: 'var(--text-xs)', letterSpacing: '0.1em', color: QUIET }}>
                    {t('fieldDesk.home.taskMeta', {
                      faction: factionName(praxis.task_faction_slug),
                      points: praxis.task_point_value,
                    })}
                  </div>
                </div>
                <span
                  className="shrink-0"
                  style={{ ...SMALL_CAPS, fontSize: 'var(--text-xs)', letterSpacing: '0.1em', color: NILE, padding: 'var(--space-xs) var(--space-sm)', border: `1px solid ${LINE}` }}
                >
                  {praxisModeLabel(praxis, t)}
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
          style={{ ...SMALL_CAPS, fontSize: 'var(--text-lg)', letterSpacing: '0.12em', padding: 'var(--space-lg)', color: CTA_INK, background: CTA_BG, border: `2px solid ${BRASS}`, textDecoration: 'none' }}
        >
          {t('fieldDesk.home.browseTasks')}
        </Link>
        {canProposeTask && (
          <Link
            to="/propose-task"
            className="flex-1 flex items-center justify-center gap-2"
            style={{ ...SMALL_CAPS, fontSize: 'var(--text-lg)', letterSpacing: '0.12em', padding: 'var(--space-lg)', color: INK, background: SHEET, border: `1px solid ${BRASS}`, textDecoration: 'none' }}
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
