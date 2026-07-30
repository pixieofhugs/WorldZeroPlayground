import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CovenSigil } from '../../../components/sigil/CovenSigil'
import {
  Braid,
  CAPTION,
  CARD,
  BORDER,
  CTA_FROM,
  CTA_INK,
  CTA_TO,
  DEEP,
  DISPLAY,
  GLOW,
  GOLD,
  HAND,
  HAIR,
  INK,
  READING,
  SHADOW,
  SigilMark,
  SLIP_SHEET,
  SOFT,
} from '../../../components/cards/covenSlip'
import { factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import { praxisModeLabel } from '../../../utils/praxis'
import type { FieldDeskHomeState } from '../useFieldDeskHome'

/**
 * Cozy Coven MOBILE FieldDesk home (#500, re-dressed by #1209) — the coven's
 * desk, by candlelight.
 *
 * The carried life and its in-progress quests each sit under a slip band on the
 * candlelit page. Same content slots as the Default mobile home — character
 * header, stat tiles, active-tasks list, primary actions — only the dress
 * changes.
 *
 * THE `wow.exe` WINDOWS ARE GONE. Traffic-light dots, the dotted board, the
 * inner notepad and the `--faction-coven-scrap-*` stat tiles were the lo-fi
 * metaphor the v2 task card retired (#1023). The `Window` helper survives as
 * `Plate`: same job, the slip's chrome.
 *
 * The quest rows are the design's COMMENT ROW — mark, name, meta, trailing chip
 * — which with the submission card is the only list shape the vocabulary draws.
 *
 * Presentation-only. No copy changed; every string is the `common` key it was.
 */

const CHROME = 'var(--font-faction-rounded)' // Quicksand

/** The reading voice — every prose line on the page. */
const PROSE: CSSProperties = {
  fontFamily: READING,
  fontStyle: 'italic',
  lineHeight: 1.5,
  color: SOFT,
}

/** A slip band over a candle-lit panel. */
function Plate({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        border: `2px solid ${BORDER}`,
        boxShadow: SHADOW,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: 'var(--space-sm) var(--space-md)',
          background: SLIP_SHEET,
          borderBottom: `2px solid ${BORDER}`,
        }}
      >
        <SigilMark size={22} />
        <span style={{ ...CAPTION, marginLeft: 'auto' }}>{title}</span>
      </div>
      <div style={{ background: CARD, padding: 'var(--space-lg)' }}>{children}</div>
    </section>
  )
}

const primaryButton: CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-sm)',
  fontFamily: CHROME,
  fontSize: 'var(--text-lg)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  fontWeight: 700,
  padding: 'var(--space-lg)',
  borderRadius: 14,
  color: CTA_INK,
  border: `1.5px solid ${CTA_TO}`,
  background: `linear-gradient(180deg, ${CTA_FROM}, ${CTA_TO})`,
  boxShadow: `0 8px 18px -8px ${GLOW}`,
  textDecoration: 'none',
}

const ghostButton: CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-sm)',
  fontFamily: CHROME,
  fontSize: 'var(--text-lg)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  padding: 'var(--space-lg)',
  borderRadius: 14,
  color: INK,
  border: `1.5px solid ${BORDER}`,
  background: CARD,
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
      className="page coven-candle-backdrop"
      style={{
        position: 'relative',
        fontFamily: CHROME,
        color: INK,
      }}
    >
      {/* The candlelight wash is the page ground — `.coven-candle-backdrop` owns
          the blooms, the drift and the light/dark flip, and its `::before` is
          positioned, so the content sits above it explicitly (#911). */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        <header>
          <div style={CAPTION}>{t('nav.home')}</div>
          <h1
            style={{
              fontFamily: HAND,
              // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-lettered Caveat — the desk's own hand, not typeset copy.
              fontSize: 34,
              fontWeight: 700,
              lineHeight: 0.9,
              color: INK,
              margin: 'var(--space-xs) 0 0',
            }}
          >
            {t('fieldDesk.home.title')}
          </h1>
          <Braid style={{ marginTop: 'var(--space-sm)' }} />
        </header>

        {/* ── Character plate ── */}
        <Plate title={t('fieldDesk.home.coven.charWindow')}>
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-md)' }}>
            <span style={CAPTION}>{t('fieldDesk.home.coven.charEyebrow')}</span>
            <Link to={`/characters/${character.id}/edit`} style={{ ...CAPTION, color: DEEP, textDecoration: 'none' }}>
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
                // eslint-disable-next-line local/no-raw-style-values -- ornament: ring thickness drawn around a 56px avatar; the nearest rung (4px) thickens the band by a third.
                padding: 2,
                background: `linear-gradient(150deg, var(--faction-coven-slip-pk), ${DEEP})`,
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
                    background: CARD,
                    fontFamily: READING,
                    fontWeight: 600,
                    // eslint-disable-next-line local/no-raw-style-values -- ornament: the monogram sized to its 56px disc, not to the type ramp
                    fontSize: 24,
                    color: DEEP,
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
                style={{ fontFamily: HAND, fontSize: 'var(--text-heading)', lineHeight: 0.95, color: INK, textDecoration: 'none' }}
              >
                {character.display_name}
              </Link>
              <div className="truncate" style={{ ...CAPTION, marginTop: 'var(--space-xs)' }}>
                {t('sidebar.characterCard.factionLevel', {
                  faction: factionName(character.faction_slug),
                  level: character.level,
                })}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div style={{ fontFamily: READING, fontWeight: 600, fontSize: 'var(--text-heading)', lineHeight: 1, color: DEEP }}>
                {character.score?.toLocaleString() ?? '0'}
              </div>
              <div style={CAPTION}>{t('fieldDesk.home.stats.points')}</div>
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
                  boxSizing: 'border-box',
                  background: SLIP_SHEET,
                  border: `1.5px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: 'var(--space-md) var(--space-sm)',
                }}
              >
                <div className="truncate" style={{ fontFamily: READING, fontWeight: 600, fontSize: 'var(--text-title)', lineHeight: 1, color: INK }}>
                  {stat.value}
                </div>
                <div style={{ ...CAPTION, marginTop: 'var(--space-xs)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </Plate>

        {/* ── Pending requests ── */}
        {pendingCount > 0 && (
          <Link
            to="/updates?filter=requests"
            className="flex items-center justify-between"
            style={{
              background: CARD,
              border: `1.5px solid ${BORDER}`,
              borderRadius: 999,
              padding: 'var(--space-md) var(--space-lg)',
              fontFamily: READING,
              fontSize: 'var(--text-content)',
              color: INK,
              textDecoration: 'none',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <CovenSigil size={12} color={GOLD} />
              {t('fieldDesk.home.pending', { count: pendingCount })}
            </span>
            <span aria-hidden style={{ color: SOFT }}>›</span>
          </Link>
        )}

        {/* ── Quests plate ── */}
        <Plate title={t('fieldDesk.home.coven.questsWindow')}>
          <div className="flex items-center" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
            <span
              style={{
                fontFamily: DISPLAY,
                fontWeight: 600,
                fontSize: 'var(--text-title)',
                lineHeight: 1.06,
                letterSpacing: '0.02em',
                color: INK,
              }}
            >
              {t('fieldDesk.home.coven.questsHeading')}
            </span>
            <Braid style={{ flex: 1 }} />
            <Link to="/tasks" style={{ ...CAPTION, color: DEEP, textDecoration: 'none', flex: 'none' }}>
              {t('fieldDesk.home.viewAll')}
            </Link>
          </div>

          {activeTasks.length === 0 ? (
            <p className="content-text" style={{ ...PROSE, margin: 0 }}>
              {t('fieldDesk.home.questsEmpty')}
            </p>
          ) : (
            <div className="flex flex-col">
              {activeTasks.map((praxis, index) => (
                <Link
                  key={praxis.id}
                  to={`/praxis/${praxis.id}/edit`}
                  className="flex items-center gap-3"
                  style={{
                    padding: 'var(--space-md) 0',
                    borderTop: index === 0 ? undefined : `1px solid ${HAIR}`,
                    textDecoration: 'none',
                  }}
                >
                  <CovenSigil size={12} color={GOLD} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate" style={{ fontFamily: HAND, fontSize: 'var(--text-content)', lineHeight: 1, color: INK }}>
                      {praxis.task_title}
                    </div>
                    <div className="truncate" style={{ ...CAPTION, marginTop: 'var(--space-xs)' }}>
                      {t('fieldDesk.home.taskMeta', {
                        faction: factionName(praxis.task_faction_slug),
                        points: praxis.task_point_value,
                      })}
                    </div>
                  </div>
                  <span
                    className="shrink-0"
                    style={{ ...CAPTION, padding: 'var(--space-xs) var(--space-sm)', border: `1.5px solid ${BORDER}`, borderRadius: 999 }}
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
          <Link to="/tasks" style={primaryButton}>
            <CovenSigil size={13} color={CTA_INK} />
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
    </div>
  )
}
