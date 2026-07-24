import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import UaMandala from '../../../components/cards/UaMandala'
import { UaSigil } from '../../../components/cards/UaSigil'
import { factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import { praxisModeLabel } from '../../../utils/praxis'
import type { FieldDeskHomeState } from '../useFieldDeskHome'

/**
 * University of Asthmatics MOBILE FieldDesk home (#525/#852) — "One mark today.
 * Begin."
 *
 * The gilt salon on a phone is gone with #788: no gold-leaf sandwich plates, no
 * Cinzel, no parchment dot-screen. The home screen is the practice's own page —
 * mesa sand under two sun-bleached sheets, the ensō beside the day's line, and
 * the mandala at `texture` behind the masthead, which is the page backdrop case
 * the primitive allows. The lists below it are dense and ask for nothing.
 *
 * Same content slots as the Default mobile home (character header, Points/Votes/
 * Era tiles, active-tasks list, primary actions) — only the dress changes
 * (ADR-0016), and all data still arrives via {@link FieldDeskHomeState}.
 *
 * Every colour is a `--faction-ua-*` token with both themes, so the screen dims
 * through the `[data-theme="dark"]` cascade. UA dims now.
 */

const PAGE = 'var(--faction-ua-page)'
const PAGE_TEXT = 'var(--faction-ua-page-text)'
const SHEET = 'var(--faction-ua-card-bg)'
const PANEL = 'var(--faction-ua-panel)'
const INK = 'var(--faction-ua-card-text)'
const MUTED = 'var(--faction-ua-card-muted)'
const ACCENT = 'var(--faction-ua-card-accent)'
const RULE = 'var(--faction-ua-rule)'
const FILL = 'var(--faction-ua)'
const ON_FILL = 'var(--faction-ua-on-fill)'
const DISPLAY = 'var(--faction-ua-card-font)'
const SERIF = 'var(--faction-ua-body-font)'

/** The label voice: EB Garamond, tracked small caps. */
const smallCaps: CSSProperties = {
  fontFamily: SERIF,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: MUTED,
}

/** A sheet: one surface, one hairline. What is left after the gilt frame. */
function Sheet({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: SHEET, border: `1px solid ${RULE}`, borderRadius: 6, padding: 'var(--space-lg)' }}>
      {children}
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
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-lg)',
        fontFamily: SERIF,
        color: PAGE_TEXT,
        background: PAGE,
      }}
    >
      {/* The day's line */}
      <header style={{ position: 'relative', overflow: 'hidden' }}>
        <UaMandala
          size={200}
          strength="texture"
          style={{ position: 'absolute', right: -64, top: -56, pointerEvents: 'none' }}
        />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <UaSigil width={34} height={34} />
          <div style={{ minWidth: 0 }}>
            <div style={smallCaps}>{t('nav.home')}</div>
            <h1
              style={{
                fontFamily: DISPLAY,
                fontWeight: 600,
                fontSize: 'var(--text-heading)',
                lineHeight: 1.05,
                color: INK,
                margin: 'var(--space-xs) 0 0',
              }}
            >
              {t('fieldDesk.home.ua.masthead')}
            </h1>
          </div>
        </div>
      </header>

      {/* ── The hand ── */}
      <Sheet>
        <div className="flex items-center justify-between flex-wrap" style={{ gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
          <span style={smallCaps}>{t('fieldDesk.home.ua.charEyebrow')}</span>
          <Link to={`/characters/${character.id}/edit`} style={{ ...smallCaps, color: ACCENT, textDecoration: 'none' }}>
            {t('fieldDesk.home.edit')}
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="shrink-0"
            style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: PANEL, border: `1px solid ${RULE}` }}
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
                // eslint-disable-next-line local/no-raw-style-values -- ornament: avatar initial sized to its 56px medallion, not text
                style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 24, color: ACCENT }}
              >
                {character.display_name[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              to={`/characters/${character.id}`}
              className="block truncate"
              style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'var(--text-title)', lineHeight: 1, color: INK, textDecoration: 'none' }}
            >
              {character.display_name}
            </Link>
            <div className="truncate" style={{ ...smallCaps, marginTop: 'var(--space-xs)' }}>
              {t('sidebar.characterCard.factionLevel', {
                faction: factionName(character.faction_slug),
                level: character.level,
              })}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'var(--text-title)', lineHeight: 1, color: INK }}>
              {character.score?.toLocaleString() ?? '0'}
            </div>
            <div style={{ ...smallCaps, marginTop: 'var(--space-xs)' }}>{t('fieldDesk.home.stats.points')}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" style={{ marginTop: 'var(--space-lg)' }}>
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center"
              style={{
                flex: '1 1 0',
                minWidth: 0,
                background: PANEL,
                border: `1px solid ${RULE}`,
                borderRadius: 5,
                padding: 'var(--space-md) var(--space-sm)',
              }}
            >
              <div className="truncate" style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'var(--text-content)', lineHeight: 1, color: INK }}>
                {stat.value}
              </div>
              <div className="truncate" style={{ ...smallCaps, marginTop: 'var(--space-sm)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </Sheet>

      {/* ── Pending requests ── */}
      {pendingCount > 0 && (
        <Link
          to="/updates?filter=requests"
          className="flex items-center justify-between"
          style={{
            background: SHEET,
            border: `1px solid ${RULE}`,
            borderRadius: 999,
            padding: 'var(--space-md) var(--space-lg)',
            fontFamily: SERIF,
            fontSize: 'var(--text-content)',
            color: INK,
            textDecoration: 'none',
          }}
        >
          <span>{t('fieldDesk.home.pending', { count: pendingCount })}</span>
          <span aria-hidden style={{ color: ACCENT }}>
            ›
          </span>
        </Link>
      )}

      {/* ── What is out on the table ── */}
      <Sheet>
        <div className="flex items-center gap-2.5" style={{ marginBottom: 'var(--space-md)' }}>
          <span style={{ ...smallCaps, color: INK }}>{t('fieldDesk.home.ua.questsHeading')}</span>
          <span aria-hidden style={{ flex: 1, minWidth: 'var(--space-xl)', height: 1, background: RULE }} />
          <Link to="/tasks" style={{ ...smallCaps, color: ACCENT, textDecoration: 'none' }}>
            {t('fieldDesk.home.viewAll')}
          </Link>
        </div>

        {activeTasks.length === 0 ? (
          <p className="content-text" style={{ fontFamily: SERIF, color: MUTED, margin: 0 }}>
            {t('fieldDesk.home.questsEmpty')}
          </p>
        ) : (
          <div className="flex flex-col">
            {activeTasks.map((praxis, index) => (
              <Link
                key={praxis.id}
                to={`/praxes/${praxis.id}/edit`}
                className="flex items-center gap-3"
                style={{ padding: 'var(--space-md) 0', borderTop: index === 0 ? undefined : `1px solid var(--faction-ua-hair)`, textDecoration: 'none' }}
              >
                <span className="shrink-0" style={{ width: 7, height: 7, borderRadius: '50%', background: FILL }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'var(--text-content)', lineHeight: 1.15, color: INK }}>
                    {praxis.task_title}
                  </div>
                  <div className="truncate" style={{ ...smallCaps, marginTop: 'var(--space-xs)' }}>
                    {t('fieldDesk.home.taskMeta', {
                      faction: factionName(praxis.task_faction_slug),
                      points: praxis.task_point_value,
                    })}
                  </div>
                </div>
                <span
                  className="shrink-0"
                  style={{ ...smallCaps, color: ACCENT, padding: 'var(--space-xs) var(--space-sm)', border: `1px solid ${RULE}` }}
                >
                  {praxisModeLabel(praxis, t)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Sheet>

      {/* ── Begin ── */}
      <div className="flex flex-wrap gap-2.5">
        <Link
          to="/tasks"
          className="flex items-center justify-center"
          style={{
            flex: '1 1 0',
            minWidth: 0,
            fontFamily: SERIF,
            fontSize: 'var(--text-xl)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: 'var(--space-lg)',
            color: ON_FILL,
            background: FILL,
            border: `1px solid ${FILL}`,
            borderRadius: 3,
            textDecoration: 'none',
          }}
        >
          {t('fieldDesk.home.browseTasks')}
        </Link>
        {canProposeTask && (
          <Link
            to="/propose-task"
            className="flex items-center justify-center gap-2"
            style={{
              flex: '1 1 0',
              minWidth: 0,
              fontFamily: SERIF,
              fontSize: 'var(--text-xl)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: 'var(--space-lg)',
              color: INK,
              background: SHEET,
              border: `1px solid ${RULE}`,
              borderRadius: 3,
              textDecoration: 'none',
            }}
          >
            {/* eslint-disable-next-line local/no-raw-style-values -- ornament: "+" glyph used as an icon, sized to the button row */}
            <span aria-hidden style={{ fontSize: 15, lineHeight: 1 }}>
              +
            </span>
            <span>{t('actions.proposeTask')}</span>
          </Link>
        )}
      </div>
    </div>
  )
}
