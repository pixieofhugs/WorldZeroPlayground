import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import { praxisModeLabel } from '../../../utils/praxis'
import type { FieldDeskHomeState } from '../useFieldDeskHome'

/**
 * S.N.I.D.E. MOBILE FieldDesk home (#530) — the operative's file on a phone.
 * The carried life and its open jobs become dark ransom cards taped down on a
 * near-black desk: Bebas mastheads over an acid rule, halftone dot screens, hard
 * offset shadows, a hot-pink primary. Same content slots as the Default mobile
 * home (character header, Points/Votes/Era tiles, active-tasks list, primary
 * actions) — only the paste-up changes. Grounds on the `--faction-snide-*`
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

export default function SnideHome({ state }: { state: FieldDeskHomeState }) {
  const { t } = useTranslation('common')
  const { character, eraName, votesReceived, activeTasks, pendingCount, canProposeTask } = state

  const stats = [
    { label: t('fieldDesk.home.stats.points'), value: character.score?.toLocaleString() ?? '0' },
    { label: t('fieldDesk.home.stats.votes'), value: votesReceived.toLocaleString() },
    { label: t('fieldDesk.home.stats.era'), value: eraName || '—' },
  ]

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
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
          <span style={{ ...kicker, color: ACID }}>{t('fieldDesk.home.snide.charEyebrow')}</span>
          <Link to={`/characters/${character.id}/edit`} style={{ ...kicker, color: PINK, textDecoration: 'none' }}>
            {t('fieldDesk.home.edit')}
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
              {t('sidebar.characterCard.factionLevel', {
                faction: factionName(character.faction_slug),
                level: character.level,
              })}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div style={{ fontFamily: IMPACT, fontSize: 'var(--text-title)', lineHeight: 1, color: ACID }}>
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
              style={{ flex: '1 1 0', minWidth: 0, background: 'rgba(255,255,255,0.04)', border: `1px solid ${LINE}`, padding: 'var(--space-md) var(--space-sm)' }}
            >
              <div className="truncate" style={{ fontFamily: IMPACT, fontSize: 'var(--text-content)', lineHeight: 1, color: TEXT }}>
                {stat.value}
              </div>
              <div style={{ ...kicker, marginTop: 'var(--space-sm)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </RansomCard>

      {/* ── Pending requests ── */}
      {pendingCount > 0 && (
        <Link
          to="/updates?filter=requests"
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
    </div>
  )
}
