import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CharacterSwitcherSheet from '../../../components/CharacterSwitcherSheet'
import { factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import { praxisModeLabel } from '../../../utils/praxis'
import type { FieldDeskHomeState } from '../useFieldDeskHome'
import { REQUESTS_QUEUE_LINK } from '../../updates/requestsQueueAnchor'

/**
 * S.N.I.D.E. MOBILE FieldDesk home (#530) — the operative's file on a phone.
 * The carried life and its open jobs become dark ransom cards taped down on a
 * near-black desk: Bebas mastheads over an acid rule, halftone dot screens, hard
 * offset shadows, a hot-pink primary. Same content slots as the Default mobile
 * home (the identity block — name, level, era points and the level track —
 * active-tasks list, primary actions) — only the paste-up changes. Grounds on the `--faction-snide-*`
 * tokens already in index.css; native-dark (dark ink cards on the flyposted
 * wall). Presentation-only — all data arrives via {@link FieldDeskHomeState}.
 */

const WALL = 'var(--faction-snide-wall)'
const WALL_TEXT = 'var(--faction-snide-wall-text)'
const INK = 'var(--faction-snide-card-bg)'
const TEXT = 'var(--faction-snide-card-text)'
const MUTED = 'var(--faction-snide-card-muted)'
const ACID = 'var(--faction-snide-card-accent)'
const ACCENT_WALL = 'var(--faction-snide)'
const PINK = 'var(--faction-snide-pink)'
const TAPE = 'var(--faction-snide-tape)'
const LINE = 'var(--faction-snide-border)'
const COND = 'var(--faction-snide-font-cond)'
const IMPACT = 'var(--faction-snide-font-impact)'
const BLACK = 'var(--faction-snide-font-black)'
const TYPE = 'var(--faction-snide-font-type)'
const MARKER = 'var(--faction-snide-font-marker)'

const HALFTONE = 'radial-gradient(rgba(182,255,46,0.09) 32%, transparent 34%)'
const CARD_SHADOW = '5px 6px 0 rgba(0,0,0,.5)'

const kicker: CSSProperties = {
  fontFamily: TYPE,
  fontSize: 'var(--text-xs)',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: MUTED,
}

/**
 * Characters / Edit as real controls (#1553) — a cut-out chip taped to the
 * file. They were bare caps with no box: a sub-20px hit target on a phone. 44
 * is the WCAG 2.5.5 target floor and is GEOMETRY, not spacing.
 */
const actionPillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  boxSizing: 'border-box',
  padding: '0 var(--space-lg)',
  borderRadius: 999,
  border: `1px solid ${ACID}`,
  background: INK,
  fontFamily: COND,
  fontSize: 'var(--text-lg)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: ACID,
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'opacity 120ms ease',
}

/** The baseline row under the track — the file's typewriter voice. */
const trackMetaStyle: CSSProperties = {
  fontFamily: TYPE,
  fontSize: 'var(--text-xs)',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: MUTED,
}

/** The operative's own ramp: hot pink burning up into acid (#1553). */
const TRACK_FILL = `linear-gradient(90deg, ${PINK}, ${ACID})`

/** Dark ransom card — taped, halftoned, hard-shadowed, slightly askew. */
function RansomCard({ children, tilt = -1 }: { children: ReactNode; tilt?: number }) {
  return (
    <div
      style={{
        position: 'relative',
        background: INK,
        color: TEXT,
        border: `1px solid ${LINE}`,
        boxShadow: CARD_SHADOW,
        padding: 'var(--space-lg)',
        transform: `rotate(${tilt}deg)`,
        overflow: 'hidden',
      }}
    >
      <span
        aria-hidden
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: HALFTONE, backgroundSize: '5px 5px' }}
      />
      <span
        aria-hidden
        style={{ position: 'absolute', top: -10, left: 22, width: 60, height: 22, background: TAPE, transform: 'rotate(-4deg)', opacity: 0.92 }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}

export default function SnideFieldDesk({ state }: { state: FieldDeskHomeState }) {
  const { t } = useTranslation('common')
  const { character, eraName, levelTrack, activeTasks, pendingCount, canProposeTask } = state
  const [switcherOpen, setSwitcherOpen] = useState(false)

  return (
    <div
      data-skin="snide"
      className="page"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', fontFamily: TYPE, color: WALL_TEXT, background: WALL }}
    >
      {/* Masthead — Bebas over an acid rule */}
      <header>
        <div style={kicker}>{t('nav.home')}</div>
        <h1 style={{ fontFamily: COND, fontSize: 'var(--text-display)', letterSpacing: '0.03em', lineHeight: 0.95, color: WALL_TEXT, margin: 'var(--space-xs) 0 0' }}>
          {t('fieldDesk.home.snide.masthead')}
        </h1>
        <div style={{ height: 2, marginTop: 'var(--space-sm)', background: ACCENT_WALL }} />
      </header>

      {/* ── Operative file ── */}
      <RansomCard tilt={-1}>
        <div className="flex justify-end gap-2" style={{ marginBottom: 'var(--space-lg)' }}>
          <button
            type="button"
            onClick={() => setSwitcherOpen(true)}
            style={actionPillStyle}
            className="hover:opacity-80 active:opacity-60"
          >
            {t('sidebar.characterCard.characters')}
          </button>
          <Link
            to={`/characters/${character.id}/edit`}
            style={{ ...actionPillStyle, borderColor: PINK, color: PINK }}
            className="hover:opacity-80 active:opacity-60"
          >
            {t('sidebar.characterCard.edit')}
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="shrink-0" style={{ width: 56, height: 56, background: ACID, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {character.avatar_url ? (
              <img src={mediaUrl(character.avatar_url)} alt={character.display_name} className="w-full h-full" style={{ objectFit: 'cover' }} />
            ) : (
              // eslint-disable-next-line local/no-raw-style-values -- ornament: avatar initial sized to its 56px acid tile, not text
              <span style={{ fontFamily: IMPACT, fontSize: 26, color: INK }}>{character.display_name[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              to={`/characters/${character.id}`}
              className="block truncate"
              style={{ fontFamily: COND, fontSize: 'var(--text-title)', letterSpacing: '0.03em', lineHeight: 1, color: TEXT, textDecoration: 'none' }}
            >
              {character.display_name}
            </Link>
            <div className="truncate" style={{ marginTop: 'var(--space-xs)', fontFamily: TYPE, fontSize: 'var(--text-sm)', letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED }}>
              {t('sidebar.characterCard.level', { level: character.level })}
            </div>
          </div>
        </div>

        {/* The one points figure, in the display face (#1553). */}
        <div className="flex items-baseline gap-2" style={{ marginTop: 'var(--space-lg)' }}>
          <span style={{ fontFamily: IMPACT, fontSize: 'var(--text-heading)', lineHeight: 1, color: ACID }}>
            {character.score.toLocaleString()}
          </span>
          <span className="truncate" style={trackMetaStyle}>
            {eraName ? t('sidebar.characterCard.eraPoints', { era: eraName }) : t('sidebar.characterCard.points')}
          </span>
        </div>

        {/* The level track — the faction's own spectrum CLIPPED by the fill width,
            one full ramp read through a narrower window rather than a solid
            colour. Same mark as this skin's rule and its avatar ring, at a third
            scale. */}
        <div
          className="overflow-hidden"
          style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.04)', marginTop: 'var(--space-md)' }}
          {...(levelTrack
            ? {
                role: 'progressbar',
                'aria-valuemin': 0,
                'aria-valuemax': 100,
                'aria-valuenow': Math.round(levelTrack.fillPercent),
                'aria-label': t('sidebar.characterCard.trackLabel', {
                  score: character.score.toLocaleString(),
                  target: levelTrack.nextThreshold.toLocaleString(),
                  level: levelTrack.nextLevel ?? character.level,
                }),
              }
            : null)}
        >
          <div
            style={{
              height: '100%',
              width: `${levelTrack?.fillPercent ?? 0}%`,
              borderRadius: 999,
              background: TRACK_FILL,
              transition: 'width 300ms',
            }}
          />
        </div>

        <div className="flex items-center gap-2" style={{ marginTop: 'var(--space-sm)' }}>
          {levelTrack && (
            <span style={trackMetaStyle}>
              {levelTrack.nextLevel === null
                ? t('sidebar.characterCard.topLevel')
                : t('sidebar.characterCard.toNextLevel', {
                    points: levelTrack.pointsToNext.toLocaleString(),
                    level: levelTrack.nextLevel,
                  })}
            </span>
          )}
          <span style={{ ...trackMetaStyle, marginLeft: 'auto' }}>
            {t('sidebar.characterCard.allTime', { points: character.all_time_score.toLocaleString() })}
          </span>
        </div>
      </RansomCard>

      {/* ── Pending requests ── */}
      {pendingCount > 0 && (
        <Link
          to={REQUESTS_QUEUE_LINK}
          className="flex items-center justify-between"
          style={{ background: INK, color: TEXT, border: `1px solid ${LINE}`, padding: 'var(--space-md) var(--space-lg)', fontFamily: COND, fontSize: 'var(--text-content)', letterSpacing: '0.03em', textDecoration: 'none' }}
        >
          <span>{t('fieldDesk.home.pending', { count: pendingCount })}</span>
          <span aria-hidden style={{ color: ACID }}>›</span>
        </Link>
      )}

      {/* ── Jobs in play ── */}
      <RansomCard tilt={0.7}>
        <div className="flex items-center gap-2.5" style={{ marginBottom: 'var(--space-md)' }}>
          <span style={{ fontFamily: COND, fontSize: 'var(--text-xl)', letterSpacing: '0.06em', textTransform: 'uppercase', color: ACID }}>
            {t('fieldDesk.home.snide.questsHeading')}
          </span>
          <span style={{ flex: 1, height: 1, background: LINE }} />
          <Link to="/tasks" style={{ ...kicker, color: PINK, textDecoration: 'none' }}>
            {t('fieldDesk.home.viewAll')}
          </Link>
        </div>

        {activeTasks.length === 0 ? (
          <p style={{ fontFamily: MARKER, fontSize: 'var(--text-content)', color: MUTED, margin: 0, transform: 'rotate(-1deg)' }}>
            {t('fieldDesk.home.questsEmpty')}
          </p>
        ) : (
          <div className="flex flex-col">
            {activeTasks.map((praxis, index) => (
              <Link
                key={praxis.id}
                to={`/praxis/${praxis.id}/edit`}
                className="flex items-center gap-3"
                style={{ padding: 'var(--space-md) 0', borderTop: index === 0 ? undefined : `1px solid ${LINE}`, textDecoration: 'none' }}
              >
                <span className="shrink-0" style={{ width: 9, height: 9, background: ACID }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ fontFamily: COND, fontSize: 'var(--text-content)', letterSpacing: '0.02em', lineHeight: 1.15, color: TEXT }}>
                    {praxis.task_title}
                  </div>
                  <div className="truncate" style={{ marginTop: 'var(--space-xs)', fontFamily: TYPE, fontSize: 'var(--text-xs)', letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED }}>
                    {t('fieldDesk.home.taskMeta', {
                      faction: factionName(praxis.task_faction_slug),
                      points: praxis.task_point_value,
                    })}
                  </div>
                </div>
                <span
                  className="shrink-0"
                  style={{ fontFamily: TYPE, fontSize: 'var(--text-xs)', letterSpacing: '0.1em', textTransform: 'uppercase', color: ACID, padding: 'var(--space-xs) var(--space-sm)', border: `1px solid ${LINE}` }}
                >
                  {praxisModeLabel(praxis, t)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </RansomCard>

      {/* ── Primary actions ── */}
      <div className="flex gap-2.5">
        <Link
          to="/tasks"
          className="flex-1 flex items-center justify-center"
          style={{ fontFamily: BLACK, fontSize: 'var(--text-lg)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: 'var(--space-lg)', color: 'var(--faction-snide-paper)', background: PINK, boxShadow: '2px 3px 0 rgba(0,0,0,.4)', textDecoration: 'none' }}
        >
          {t('fieldDesk.home.browseTasks')}
        </Link>
        {canProposeTask && (
          <Link
            to="/propose-task"
            className="flex-1 flex items-center justify-center gap-2"
            style={{ fontFamily: COND, fontSize: 'var(--text-xl)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: 'var(--space-lg)', color: TEXT, background: INK, border: `1px solid ${ACID}`, textDecoration: 'none' }}
          >
            {/* eslint-disable-next-line local/no-raw-style-values -- ornament: "+" glyph used as an icon, sized to the button row */}
            <span aria-hidden style={{ fontSize: 15, lineHeight: 1, color: ACID }}>+</span>
            <span>{t('actions.proposeTask')}</span>
          </Link>
        )}
      </div>

      {/* The switcher the "Characters" pill opens (#516). */}
      <CharacterSwitcherSheet
        open={switcherOpen}
        activeCharacterId={character.id}
        onClose={() => setSwitcherOpen(false)}
      />
    </div>
  )
}
