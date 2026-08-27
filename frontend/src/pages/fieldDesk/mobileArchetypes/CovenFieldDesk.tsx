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

/**
 * Cozy Coven MOBILE FieldDesk home (#500, re-dressed by #1209) — the coven's
 * desk, by candlelight.
 *
 * The carried life and its in-progress quests each sit under a slip band on the
 * candlelit page. Same content slots as the Default mobile home — character
 * block, active-tasks list, primary actions — only the dress
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

/** The task-faction mark on a quest row (#1711) — a shade larger than the gilt
 *  sparkle it replaces, which was a filled shape where this is drawn line. */
const ROW_SIGIL = 14

/** The reading voice — every prose line on the page. */
const PROSE: CSSProperties = {
  fontFamily: READING,
  fontStyle: 'italic',
  lineHeight: 1.5,
  color: SOFT,
}

/**
 * A slip band over a candle-lit panel.
 *
 * The band used to close on a window title (`fieldDesk.home.coven.charWindow`
 * / `.questsWindow` — "you" and "quests"). #1909 CUT both: Coven was the only
 * faction with the slot, and the audit ruled the field desk generic. The sigil
 * and the slip stay — they are the band.
 */
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

/**
 * Characters / Edit as real controls (#1553) — a slip-sheet pill in the coven's
 * hand. They were bare caps with no box: a sub-20px hit target on a phone. 44
 * is the WCAG 2.5.5 target floor and is GEOMETRY, not spacing.
 */
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
  // INK, not DEEP (#2248). The pill's ground IS the slip sheet, whose darkest
  // stop `--faction-coven-slip-mid` is the one an ink owes AA against: DEEP
  // reads 3.33:1 there, which is exactly the figure `covenSlip`'s own docblock
  // records and exactly the substitution it prescribes — "reach for INK when
  // DEEP was doing a job", and a control is a job. INK measures 5.46:1.
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
          <Braid style={{ marginTop: 'var(--space-sm)' }} />
        </header>

        {/* ── Character plate ── */}
        <Plate>
          <div className="flex justify-end gap-2" style={{ marginBottom: 'var(--space-md)' }}>
            {/* Hidden when the roster has nothing to offer (#2111): one life and a
                shut second-character gate make this two taps to a dead end. */}
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
              {/* THE PAGE'S <h1> (#2580). The app-bar row above used to carry it --
                  a `HOME` kicker over a `FieldDesk` title, both naming the page the
                  bottom nav already marks as current. Both are gone, and rather than
                  leave the page with no level-1 heading (#1794's defect) the heading
                  names the page's real subject: the life being carried. Same ruling
                  the desktop FieldDesk took on 2026-08-15; no new string, the name is
                  data already here. The masthead band itself STAYS -- only the two
                  text elements went, so every kit keeps its own mark. */}
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
            <span style={{ fontFamily: READING, fontWeight: 600, fontSize: 'var(--text-heading)', lineHeight: 1, color: DEEP }}>
              {character.score.toLocaleString()}
            </span>
            <span className="truncate" style={trackMetaStyle}>
              {eraName ? t('sidebar.characterCard.eraPoints', { era: eraName, count: character.score }) : t('sidebar.characterCard.points', { count: character.score })}
            </span>
          </div>

          {/* The level track — the faction's own spectrum CLIPPED by the fill width,
              one full ramp read through a narrower window rather than a solid
              colour. Same mark as this skin's rule and its avatar ring, at a third
              scale. */}
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
        </Plate>

        {/* ── The pending row, in all three of its states (#1554) ── */}
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
                  {/* The lead mark is the TASK's faction, not the coven's own
                      sparkle in gold (#1711) — this row showed the same mark
                      whoever owned the task. The caption below names the
                      faction, so the mark is decorative. */}
                  <span className="shrink-0 flex" aria-hidden>
                    <FactionSigil slug={praxis.task_faction_slug} size={ROW_SIGIL} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate" style={{ fontFamily: HAND, fontSize: 'var(--text-content)', lineHeight: 'normal' /* the face's own content box, so nothing clips the tails (#2112) */, color: INK }}>
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

        {/* ── Primary actions: both land on an already-narrowed view (#1554) ── */}
        <div className="flex gap-2.5">
          <Link to={FIND_TASK_LINK} style={primaryButton}>
            <Spark size={13} color={CTA_INK} />
            {t('fieldDesk.home.findTask')}
          </Link>
          <Link to={CAST_VOTES_LINK} style={ghostButton}>
            {t('fieldDesk.home.castVotes')}
          </Link>
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
