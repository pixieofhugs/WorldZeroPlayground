import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CharacterSwitcherSheet from '../../../components/CharacterSwitcherSheet'
import { factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import { formatPoints } from '../../../utils/points'
import { praxisModeLabel } from '../../../utils/praxis'
import { EphemeristsSigil } from '../../../components/sigil/EphemeristsSigil'
import FactionSigil from '../../../components/sigil/FactionSigil'
import {
  BRASS,
  BRASS_LIGHT,
  DECO,
  INK,
  INNER,
  LINE,
  MARGINALIA,
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
import PendingRowPill from '../PendingRowPill'
import { CAST_VOTES_LINK, FIND_TASK_LINK } from '../homeDestinations'
import LevelTrackMeta from '../../../components/LevelTrackMeta'
import { factionBodyVars } from '../../../utils/factionBodyFace'

/**
 * Ephemerists MOBILE FieldDesk home (#527): papyrus leaves on the Valley plate.
 * Same slots as the Default mobile home; presentation-only, data via
 * {@link FieldDeskHomeState}.
 */

const kicker: CSSProperties = {
  ...SMALL_CAPS,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.22em',
  color: QUIET,
}

const brassRule = `linear-gradient(90deg, ${BRASS}, transparent)`

/** Characters / Edit pills (#1553). 44 = WCAG 2.5.5 target floor (geometry). */
const actionPillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  boxSizing: 'border-box',
  padding: '0 var(--space-lg)',
  border: `1px solid ${LINE}`,
  background: INNER,
  ...SMALL_CAPS,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.16em',
  color: BRASS_LIGHT,
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'opacity 120ms ease',
}

const trackMetaStyle: CSSProperties = {
  ...SMALL_CAPS,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.12em',
  color: QUIET,
}

const TRACK_FILL = `linear-gradient(90deg, ${OCHRE}, ${BRASS}, ${BRASS_LIGHT})`

/** Row task-faction mark (#1711); under 20px, so the kite draws its reduced cut. */
const ROW_SIGIL = 14

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
  const { character, eraName, levelTrack, activeTasks, pendingRow, offersACharacterChoice } =
    state
  const [switcherOpen, setSwitcherOpen] = useState(false)

  return (
    <div
      data-skin="ephemerists"
      className="page"
      style={{ ...factionBodyVars("ephemerists"), display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', fontFamily: READING, color: INK, background: PAGE }}
    >
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <EphemeristsSigil size={13} color={BRASS} />
        </div>
      </header>

      <Leaf>
        <div className="flex justify-end gap-2" style={{ marginBottom: 'var(--space-lg)' }}>
          {/* Hidden when there is no other life to switch to (#2111). */}
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
            {/* The page's <h1> is the carried life's name (#2580). */}
            <h1 className="m-0">
              <Link
                to={`/characters/${character.id}`}
                className="block truncate"
                style={{ fontFamily: DECO, fontSize: 'var(--text-title)', lineHeight: 1, letterSpacing: '0.03em', color: INK, textDecoration: 'none' }}
              >
                {character.display_name}
              </Link>
            </h1>
            <div className="truncate" style={{ marginTop: 'var(--space-xs)', ...trackMetaStyle }}>
              {t('sidebar.characterCard.level', { level: character.level })}
            </div>
          </div>
        </div>

        <div className="flex items-baseline gap-2" style={{ marginTop: 'var(--space-lg)' }}>
          <span style={{ fontFamily: DECO, fontSize: 'var(--text-heading)', lineHeight: 1, color: INK }}>
            {character.score.toLocaleString()}
          </span>
          <span className="truncate" style={trackMetaStyle}>
            {eraName ? t('sidebar.characterCard.eraPoints', { era: eraName, count: character.score }) : t('sidebar.characterCard.points', { count: character.score })}
          </span>
        </div>

        {/* Level track: the spectrum clipped by fill width, not a solid colour. */}
        <div
          className="overflow-hidden"
          style={{ height: 6, borderRadius: 999, background: INNER, marginTop: 'var(--space-md)' }}
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
      </Leaf>

      {pendingRow && (
        <PendingRowPill
          row={pendingRow}
          className="flex items-center justify-between"
          style={{ background: SHEET, border: `1px solid ${LINE}`, padding: 'var(--space-md) var(--space-lg)', fontFamily: MARGINALIA, fontSize: 'var(--text-content)', color: INK, textDecoration: 'none' }}
          chevron={<span aria-hidden style={{ color: BRASS_LIGHT }}>›</span>}
        />
      )}

      <Leaf>
        <div className="flex items-center gap-2.5" style={{ marginBottom: 'var(--space-md)' }}>
          <span style={{ ...SMALL_CAPS, fontSize: 'var(--text-md)', letterSpacing: '0.18em', color: INK }}>
            {t('fieldDesk.home.questsHeading')}
          </span>
          <span style={{ flex: 1, height: 1, background: brassRule }} />
          <Link to="/tasks" style={{ ...kicker, color: BRASS_LIGHT, textDecoration: 'none' }}>
            {t('fieldDesk.home.viewAll')}
          </Link>
        </div>

        {activeTasks.length === 0 ? (
          <p style={{ fontFamily: MARGINALIA, fontSize: 'var(--text-content)', color: QUIET, margin: 0 }}>
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
                {/* Task's faction mark (#1711); decorative, the meta line names it. */}
                <span className="shrink-0 flex" aria-hidden>
                  <FactionSigil slug={praxis.task_faction_slug} size={ROW_SIGIL} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ fontFamily: DECO, fontSize: 'var(--text-content)', lineHeight: 'normal' /* the face's own content box, so nothing clips the tails (#2112) */, color: INK }}>
                    {praxis.task_title}
                  </div>
                  <div className="truncate" style={{ marginTop: 'var(--space-xs)', ...SMALL_CAPS, fontSize: 'var(--text-md)', letterSpacing: '0.1em', color: QUIET }}>
                    {t('fieldDesk.home.taskMeta', {
                      faction: factionName(praxis.task_faction_slug),
                      points: formatPoints(praxis.score),
                    })}
                  </div>
                </div>
                <span
                  className="shrink-0"
                  style={{ ...SMALL_CAPS, fontSize: 'var(--text-md)', letterSpacing: '0.1em', color: BRASS_LIGHT, padding: 'var(--space-xs) var(--space-sm)', border: `1px solid ${LINE}` }}
                >
                  {praxisModeLabel(praxis, t)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Leaf>

      <div className="flex gap-2.5">
        {/* `.eph-cta` owns the paint (#2146); utilities here are layout only. */}
        <Link
          to={FIND_TASK_LINK}
          className="flex-1 flex items-center justify-center eph-cta"
          style={{ ...SMALL_CAPS, fontSize: 'var(--text-lg)', letterSpacing: '0.12em', padding: 'var(--space-lg)', textDecoration: 'none' }}
        >
          {t('fieldDesk.home.findTask')}
        </Link>
        {/* Absent, not disabled, below the era's vote level (#3133). */}
        {state.canVote && (
          <Link
            to={CAST_VOTES_LINK}
            className="flex-1 flex items-center justify-center"
            style={{ ...SMALL_CAPS, fontSize: 'var(--text-lg)', letterSpacing: '0.12em', padding: 'var(--space-lg)', color: INK, background: SHEET, border: `1px solid ${BRASS}`, textDecoration: 'none' }}
          >
            {t('fieldDesk.home.castVotes')}
          </Link>
        )}
      </div>

      <CharacterSwitcherSheet
        open={switcherOpen}
        activeCharacterId={character.id}
        onClose={() => setSwitcherOpen(false)}
      />
    </div>
  )
}
