import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import AlbescentSigil from '../../../components/cards/AlbescentSigil'
import type { FieldDeskHomeState } from '../useFieldDeskHome'

/**
 * Albescent MOBILE FieldDesk home (#528) — the Record's desk on a phone. The
 * carried life and its in-hand work become plain cotton sheets: hairline
 * borders, the surveyor's Mark, Cormorant Garamond italic, one hue of ink and no
 * colour. Same content slots as the Default mobile home (character header,
 * Points/Votes/Era tiles, active-tasks list, primary actions) — only the dress
 * changes. Grounds on the `--faction-albescent-*` tokens already in index.css;
 * always-light (Albescent never dims). Presentation-only — all data arrives via
 * {@link FieldDeskHomeState}.
 */

const INK = 'var(--faction-albescent-card-text)'
const SHEET = 'var(--faction-albescent-card-bg)'
const PAGE = 'var(--faction-albescent-page)'
const FONT = 'var(--faction-albescent-card-font)' // Cormorant Garamond
const MONO = 'var(--faction-albescent-mono)' // Courier Prime
/** A near-black ink wash at the given opacity — the whole palette is one hue. */
const ink = (pct: number) => `color-mix(in srgb, ${INK} ${pct}%, transparent)`

const kicker: CSSProperties = {
  fontFamily: MONO,
  fontSize: 'var(--text-xs)',
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  color: ink(30),
}

/** A plain cotton sheet — hairline border, the faction's only container idiom. */
function Sheet({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: SHEET,
        border: `1px solid ${ink(10)}`,
        boxShadow: '0 2px 18px rgba(0,0,0,0.045), 0 1px 3px rgba(0,0,0,0.04)',
        padding: 'var(--space-lg)',
      }}
    >
      {children}
    </div>
  )
}

export default function AlbescentHome({ state }: { state: FieldDeskHomeState }) {
  const { t } = useTranslation('common')
  const { character, eraName, votesReceived, activeTasks, pendingCount, canProposeTask } = state

  const stats = [
    { label: t('fieldDesk.home.stats.points'), value: character.score?.toLocaleString() ?? '0' },
    { label: t('fieldDesk.home.stats.votes'), value: votesReceived.toLocaleString() },
    { label: t('fieldDesk.home.stats.era'), value: eraName || '—' },
  ]

  return (
    <div
      data-skin="albescent"
      className="page"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', fontFamily: MONO, color: INK, background: PAGE }}
    >
      {/* Masthead — the Mark and a hairline */}
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
          <AlbescentSigil size={26} />
          <div style={kicker}>{t('nav.home')}</div>
        </div>
        <h1 style={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 300, fontSize: 'var(--text-heading)', lineHeight: 1, color: INK, margin: 0 }}>
          {t('fieldDesk.home.albescent.masthead')}
        </h1>
        <div style={{ height: 1, marginTop: 'var(--space-md)', background: ink(10) }} />
      </header>

      {/* ── The keeper's sheet ── */}
      <Sheet>
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
          <span style={kicker}>{t('fieldDesk.home.albescent.charEyebrow')}</span>
          <Link to={`/characters/${character.id}/edit`} style={{ ...kicker, color: ink(50), textDecoration: 'none', borderBottom: `1px solid ${ink(20)}` }}>
            {t('fieldDesk.home.edit')}
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="shrink-0 flex items-center justify-center rounded-full"
            style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', border: `1px solid ${ink(14)}`, background: ink(4) }}
          >
            {character.avatar_url ? (
              <img
                src={mediaUrl(character.avatar_url)}
                alt={character.display_name}
                className="w-full h-full"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              // eslint-disable-next-line local/no-raw-style-values -- ornament: avatar initial sized to its 52px ring, not text
              <span style={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 300, fontSize: 22, color: ink(55) }}>
                {character.display_name[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              to={`/characters/${character.id}`}
              className="block truncate"
              style={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 300, fontSize: 'var(--text-title)', lineHeight: 1.05, color: INK, textDecoration: 'none' }}
            >
              {character.display_name}
            </Link>
            <div className="truncate" style={{ ...kicker, marginTop: 'var(--space-xs)', letterSpacing: '0.14em' }}>
              {t('sidebar.characterCard.factionLevel', {
                faction: factionName(character.faction_slug),
                level: character.level,
              })}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div style={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 300, fontSize: 'var(--text-title)', lineHeight: 1, color: ink(60) }}>
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
              style={{ flex: '1 1 0', minWidth: 0, border: `1px solid ${ink(9)}`, padding: 'var(--space-md) var(--space-sm)' }}
            >
              <div className="truncate" style={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 300, fontSize: 'var(--text-content)', lineHeight: 1, color: INK }}>
                {stat.value}
              </div>
              <div style={{ ...kicker, marginTop: 'var(--space-sm)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </Sheet>

      {/* ── Pending requests ── */}
      {pendingCount > 0 && (
        <Link
          to="/updates?filter=requests"
          className="flex items-center justify-between"
          style={{ background: SHEET, border: `1px solid ${ink(10)}`, padding: 'var(--space-md) var(--space-lg)', fontFamily: FONT, fontStyle: 'italic', fontSize: 'var(--text-content)', color: INK, textDecoration: 'none' }}
        >
          <span>{t('fieldDesk.home.pending', { count: pendingCount })}</span>
          <span aria-hidden style={{ color: ink(40) }}>→</span>
        </Link>
      )}

      {/* ── Work in hand ── */}
      <Sheet>
        <div className="flex items-center gap-2.5" style={{ marginBottom: 'var(--space-md)' }}>
          <span style={{ fontFamily: MONO, fontSize: 'var(--text-sm)', letterSpacing: '0.2em', textTransform: 'uppercase', color: ink(40) }}>
            {t('fieldDesk.home.albescent.questsHeading')}
          </span>
          <span style={{ flex: 1, height: 1, background: ink(8) }} />
          <Link to="/tasks" style={{ ...kicker, color: ink(50), textDecoration: 'none', borderBottom: `1px solid ${ink(20)}` }}>
            {t('fieldDesk.home.viewAll')}
          </Link>
        </div>

        {activeTasks.length === 0 ? (
          <p style={{ fontFamily: FONT, fontStyle: 'italic', fontSize: 'var(--text-content)', color: ink(45), margin: 0 }}>
            {t('fieldDesk.home.questsEmpty')}
          </p>
        ) : (
          <div className="flex flex-col">
            {activeTasks.map((praxis, index) => (
              <Link
                key={praxis.id}
                to={`/praxes/${praxis.id}/edit`}
                className="flex items-center gap-3"
                style={{ padding: 'var(--space-md) 0', borderTop: index === 0 ? undefined : `1px solid ${ink(8)}`, textDecoration: 'none' }}
              >
                <AlbescentSigil size={14} opacity={0.7} />
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 300, fontSize: 'var(--text-content)', lineHeight: 1.2, color: INK }}>
                    {praxis.task_title}
                  </div>
                  <div className="truncate" style={{ ...kicker, marginTop: 'var(--space-xs)', letterSpacing: '0.14em' }}>
                    {t('fieldDesk.home.taskMeta', {
                      faction: factionName(praxis.task_faction_slug),
                      points: praxis.task_point_value,
                    })}
                  </div>
                </div>
                <span
                  className="shrink-0"
                  style={{ fontFamily: MONO, fontSize: 'var(--text-xs)', letterSpacing: '0.14em', textTransform: 'uppercase', color: ink(35), padding: 'var(--space-xs) var(--space-sm)', border: `1px solid ${ink(12)}` }}
                >
                  {t(`praxisType.${praxis.type}`)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Sheet>

      {/* ── Primary actions ── */}
      <div className="flex gap-2.5">
        <Link
          to="/tasks"
          className="flex-1 flex items-center justify-center"
          style={{ fontFamily: MONO, fontSize: 'var(--text-base)', letterSpacing: '0.16em', textTransform: 'uppercase', padding: 'var(--space-lg)', color: PAGE, background: INK, border: `1px solid ${INK}`, textDecoration: 'none' }}
        >
          {t('fieldDesk.home.browseTasks')}
        </Link>
        {canProposeTask && (
          <Link
            to="/propose-task"
            className="flex-1 flex items-center justify-center gap-2"
            style={{ fontFamily: MONO, fontSize: 'var(--text-base)', letterSpacing: '0.16em', textTransform: 'uppercase', padding: 'var(--space-lg)', color: ink(55), background: 'transparent', border: `1px solid ${ink(16)}`, textDecoration: 'none' }}
          >
            {/* eslint-disable-next-line local/no-raw-style-values -- ornament: "+" glyph used as an icon, sized to the button row */}
            <span aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>+</span>
            <span>{t('actions.proposeTask')}</span>
          </Link>
        )}
      </div>
    </div>
  )
}
