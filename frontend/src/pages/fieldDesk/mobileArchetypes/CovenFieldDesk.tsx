import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CharacterSwitcherSheet from '../../../components/CharacterSwitcherSheet'
import FactionSigil from '../../../components/sigil/FactionSigil'
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
  SLIP_SHEET,
  SOFT,
  Spark,
} from '../../../components/factionMarks/covenSlip'
import { CovenSigil } from '../../../components/sigil/CovenSigil'
import { factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import { formatPoints } from '../../../utils/points'
import { praxisModeLabel } from '../../../utils/praxis'
import type { FieldDeskHomeState } from '../useFieldDeskHome'
import PendingRowPill from '../PendingRowPill'
import { CAST_VOTES_LINK, FIND_TASK_LINK } from '../homeDestinations'
import LevelTrackMeta from '../../../components/LevelTrackMeta'
import { factionBodyVars } from '../../../utils/factionBodyFace'

/**
 * Cozy Coven mobile FieldDesk home (#500, #1209): the Default slots under slip
 * bands on the candlelit page. Quest rows use the design's comment-row shape.
 */

const CHROME = 'var(--font-faction-script)' // Caveat

/** The task-faction mark on a quest row (#1711). */
const ROW_SIGIL = 14

/** The reading voice — every prose line on the page. */
const PROSE: CSSProperties = {
  fontFamily: READING,
  fontStyle: 'italic',
  lineHeight: 1.5,
  color: SOFT,
}

/** A slip band over a candle-lit panel. */
function Plate({ children }: { children: ReactNode }) {
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
        <CovenSigil size={22} color={DEEP} />
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

/** Characters / Edit pills (#1553). 44 is the WCAG 2.5.5 target floor. */
const actionPillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  boxSizing: 'border-box',
  padding: '0 var(--space-lg)',
  borderRadius: 999,
  border: `1.5px solid ${BORDER}`,
  background: SLIP_SHEET,
  fontFamily: CHROME,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  // INK, not DEEP (#2248): DEEP is 3.33:1 on the slip sheet, INK 5.46:1.
  color: INK,
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'opacity 120ms ease',
}

/** The baseline row under the track — the plate's caption voice. */
const trackMetaStyle: CSSProperties = { ...CAPTION }

/** The candle's own spectrum: the ring's gradient, laid flat (#1553). */
const TRACK_FILL = `linear-gradient(90deg, var(--faction-coven-slip-pk), ${DEEP})`

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
  const { character, eraName, levelTrack, activeTasks, pendingRow, offersACharacterChoice } =
    state
  const [switcherOpen, setSwitcherOpen] = useState(false)

  return (
    <div
      data-skin="coven"
      className="page coven-candle-backdrop"
      style={{ ...factionBodyVars("coven"),
        position: 'relative',
        fontFamily: CHROME,
        color: INK,
      }}
    >
      {/* `.coven-candle-backdrop`'s positioned `::before` needs content
          lifted above it (#911). */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        <header>
          <Braid style={{ marginTop: 'var(--space-sm)' }} />
        </header>

        {/* ── Character plate ── */}
        <Plate>
          <div className="flex justify-end gap-2" style={{ marginBottom: 'var(--space-md)' }}>
            {/* Hidden when the roster offers no choice (#2111). */}
            {offersACharacterChoice && (
              <button
                type="button"
                onClick={() => setSwitcherOpen(true)}
                style={actionPillStyle}
                className="hover:opacity-80 active:opacity-60"
              >
                {t('sidebar.characterCard.characters')}
              </button>
            )}
            <Link
              to={`/characters/${character.id}/edit`}
              style={actionPillStyle}
              className="hover:opacity-80 active:opacity-60"
            >
              {t('sidebar.characterCard.edit')}
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
              {/* The page's <h1> names the carried life (#2580, #1794). */}
              <h1 className="m-0">
                <Link
                  to={`/characters/${character.id}`}
                  className="block truncate"
                  style={{ fontFamily: HAND, fontSize: 'var(--text-heading)', lineHeight: 0.95, color: INK, textDecoration: 'none' }}
                >
                  {character.display_name}
                </Link>
              </h1>
              <div className="truncate" style={{ ...CAPTION, marginTop: 'var(--space-xs)' }}>
                {t('sidebar.characterCard.level', { level: character.level })}
              </div>
            </div>
          </div>

          {/* The one points figure, in the display face (#1553). */}
          <div className="flex items-baseline gap-2" style={{ marginTop: 'var(--space-lg)' }}>
            <span style={{ fontFamily: READING, fontSize: 'var(--text-heading)', lineHeight: 1, color: DEEP }}>
              {character.score.toLocaleString()}
            </span>
            <span className="truncate" style={trackMetaStyle}>
              {eraName ? t('sidebar.characterCard.eraPoints', { era: eraName, count: character.score }) : t('sidebar.characterCard.points', { count: character.score })}
            </span>
          </div>

          {/* Level track: the full spectrum clipped by the fill width. */}
          <div
            className="overflow-hidden"
            style={{ height: 6, borderRadius: 999, background: SLIP_SHEET, marginTop: 'var(--space-md)' }}
            {...(levelTrack
              ? {
                  role: 'progressbar',
                  'aria-valuemin': 0,
                  'aria-valuemax': 100,
                  'aria-valuenow': Math.round(levelTrack.fillPercent),
                  'aria-label': t('sidebar.characterCard.trackLabel', {
                    score: levelTrack.pointsIntoLevel.toLocaleString(),
                    target: levelTrack.levelSpan.toLocaleString(),
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

          <LevelTrackMeta
            track={levelTrack}
            allTimeScore={character.all_time_score}
            style={trackMetaStyle}
          />
        </Plate>

        {/* Pending row (#1554) */}
        {pendingRow && (
          <PendingRowPill
            row={pendingRow}
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
            glyph={<Spark size={12} color={GOLD} />}
            chevron={<span aria-hidden style={{ color: SOFT }}>›</span>}
          />
        )}

        {/* ── Quests plate ── */}
        <Plate>
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
              {t('fieldDesk.home.questsHeading')}
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
                  {/* The TASK's faction (#1711); decorative, caption names it. */}
                  <span className="shrink-0 flex" aria-hidden>
                    <FactionSigil slug={praxis.task_faction_slug} size={ROW_SIGIL} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate" style={{ fontFamily: HAND, fontSize: 'var(--text-content)', lineHeight: 'normal' /* no clipped descenders (#2112) */, color: INK }}>
                      {praxis.task_title}
                    </div>
                    <div className="truncate" style={{ ...CAPTION, marginTop: 'var(--space-xs)' }}>
                      {t('fieldDesk.home.taskMeta', {
                        faction: factionName(praxis.task_faction_slug),
                        points: formatPoints(praxis.score),
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

        {/* Primary actions (#1554) */}
        <div className="flex gap-2.5">
          <Link to={FIND_TASK_LINK} style={primaryButton}>
            <Spark size={13} color={CTA_INK} />
            {t('fieldDesk.home.findTask')}
          </Link>
          {/* Absent, not disabled, below the era's vote level (#3133). */}
          {state.canVote && (
            <Link to={CAST_VOTES_LINK} style={ghostButton}>
              {t('fieldDesk.home.castVotes')}
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
    </div>
  )
}
