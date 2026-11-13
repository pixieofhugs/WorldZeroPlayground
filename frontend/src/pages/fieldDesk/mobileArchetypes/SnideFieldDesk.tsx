import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CharacterSwitcherSheet from '../../../components/CharacterSwitcherSheet'
import FactionSigil from '../../../components/sigil/FactionSigil'
import { factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import { formatPoints } from '../../../utils/points'
import { praxisModeLabel } from '../../../utils/praxis'
import type { FieldDeskHomeState } from '../useFieldDeskHome'
import PendingRowPill from '../PendingRowPill'
import { CAST_VOTES_LINK, FIND_TASK_LINK } from '../homeDestinations'
import { WALL } from '../../../components/factionMarks/snideAtoms'
import { factionRoleVars } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'
import LevelTrackMeta from '../../../components/LevelTrackMeta'

/**
 * S.N.I.D.E. MOBILE FieldDesk home (#530). Same slots as the Default mobile home;
 * presentation-only, data via {@link FieldDeskHomeState}.
 *
 * Two grounds decide the ink family (#2287): the credential panel is on the
 * flipping {@link WALL} (`-note-*` inks); the jobs card is a black clipping ON it
 * (invariant `-card-*`, #2066). Drawn fills (avatar tile, chips) keep pigments.
 */

/** Flat wall ramp start, so the panel's full {@link WALL} reads as pasted ON it. */
const DESK = 'var(--faction-snide-wall)'
const WALL_TEXT = 'var(--faction-snide-wall-text)'
const INK = 'var(--snd-desk-paper)'
const TEXT = 'var(--snd-desk-ink)'
const MUTED = 'var(--snd-desk-quiet)'
const ACID = 'var(--snd-desk-accent)'
const ACCENT_WALL = 'var(--snd-desk-fill)'
const PINK = 'var(--faction-snide-pink)'
const LINE = 'var(--faction-snide-border)'
const COND = 'var(--faction-snide-font-marker)'
const IMPACT = 'var(--faction-snide-font-black)'
const BLACK = 'var(--faction-snide-font-black)'
const TYPE = 'var(--faction-snide-font-type)'
const MARKER = 'var(--faction-snide-font-marker)'

/* Panel inks flip with the wall (#2287); `-card-*` inks vanish on it by day. */
const NOTE_INK = 'var(--faction-snide-note-ink)'
const NOTE_MUTED = 'var(--faction-snide-note-muted)'
/* Acid never touches paper (#2173): acid type/track sits on a black PLATE
   (a censor bar by day, dissolves into the night wall; intended). */
const ACID_PIGMENT = 'var(--faction-snide-acid)'
const PLATE = 'var(--faction-snide-ink)'

/** Row task-faction mark (#1711); 13 for the tight condensed row. */
const ROW_SIGIL = 13

/** Kept raw (#2139): RansomCard's ink is theme-invariant, so 9% acid is right in
 *  both themes. On a flipping ground this becomes a defect. */
const HALFTONE = 'radial-gradient(rgba(182,255,46,0.09) 32%, transparent 34%)'
/** Flat offset register, zero blur, uniform 40% (#1609, #2302). */
const CARD_SHADOW = '5px 6px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)'

/** No colour: its mounts stand on different grounds (wall vs jobs slab). */
const kicker: CSSProperties = {
  fontFamily: TYPE,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
}

/** Characters / Edit pills (#1553). 44 = WCAG 2.5.5 target floor (geometry). */
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

/** Inks on the wall: every mount is in the credential panel (#2287). */
const trackMetaStyle: CSSProperties = {
  fontFamily: TYPE,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: NOTE_MUTED,
}

const TRACK_FILL = `linear-gradient(90deg, ${PINK}, ${ACID})`

/**
 * Credential panel on the shared {@link WALL} (#2287). Edge + shadow are
 * load-bearing (§6, #2065): they keep it an object on the wall-coloured desk.
 */
function WallPanel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        background: WALL,
        color: NOTE_INK,
        border: '1px solid var(--faction-snide-note-wall-edge)',
        boxShadow: 'var(--faction-snide-note-wall-shadow)',
        padding: 'var(--space-lg)',
        transform: 'rotate(-1deg)',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  )
}

/** The jobs slab: a black clipping pasted ON the wall (#2066). */
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
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}

export default function SnideFieldDesk({ state }: { state: FieldDeskHomeState }) {
  const { t } = useTranslation('common')
  const { character, eraName, levelTrack, activeTasks, pendingRow, offersACharacterChoice } =
    state
  const [switcherOpen, setSwitcherOpen] = useState(false)

  return (
    <div
      data-skin="snide"
      className="page"
      style={{
        ...factionBodyVars("snide"), ...factionRoleVars('snide', 'snd-desk'),
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-lg)',
        fontFamily: TYPE,
        color: WALL_TEXT,
        background: DESK,
      }}
    >
      <header>
        <div style={{ height: 2, marginTop: 'var(--space-sm)', background: ACCENT_WALL }} />
      </header>

      <WallPanel>
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
            {/* The page's <h1> is the carried life's name (#2580). */}
            <h1 className="m-0">
              <Link
                to={`/characters/${character.id}`}
                className="block truncate"
                style={{ fontFamily: COND, fontSize: 'var(--text-title)', letterSpacing: '0.03em', lineHeight: 1, color: NOTE_INK, textDecoration: 'none' }}
              >
                {character.display_name}
              </Link>
            </h1>
            <div className="truncate" style={{ marginTop: 'var(--space-xs)', fontFamily: TYPE, fontSize: 'var(--text-md)', letterSpacing: '0.12em', textTransform: 'uppercase', color: NOTE_MUTED }}>
              {t('sidebar.characterCard.level', { level: character.level })}
            </div>
          </div>
        </div>

        {/* On the PLATE acid-as-type owes the wall (#2173). */}
        <div className="flex items-baseline gap-2" style={{ marginTop: 'var(--space-lg)' }}>
          <span style={{ fontFamily: IMPACT, fontSize: 'var(--text-heading)', lineHeight: 1, color: ACID_PIGMENT, background: PLATE, padding: '0 var(--space-xs)' }}>
            {character.score.toLocaleString()}
          </span>
          <span className="truncate" style={trackMetaStyle}>
            {eraName ? t('sidebar.characterCard.eraPoints', { era: eraName, count: character.score }) : t('sidebar.characterCard.points', { count: character.score })}
          </span>
        </div>

        {/* Level track: the spectrum clipped by fill width, not a solid colour. */}
        <div
          className="overflow-hidden"
          // Groove is the PLATE (#2287): the acid end vanishes on the day wall.
          style={{ height: 6, borderRadius: 999, background: PLATE, marginTop: 'var(--space-md)' }}
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
      </WallPanel>

      {pendingRow && (
        <PendingRowPill
          row={pendingRow}
          className="flex items-center justify-between"
          style={{ background: INK, color: TEXT, border: `1px solid ${LINE}`, padding: 'var(--space-md) var(--space-lg)', fontFamily: COND, fontSize: 'var(--text-content)', letterSpacing: '0.03em', textDecoration: 'none' }}
          chevron={<span aria-hidden style={{ color: ACID }}>›</span>}
        />
      )}

      <RansomCard tilt={0.7}>
        <div className="flex items-center gap-2.5" style={{ marginBottom: 'var(--space-md)' }}>
          <span style={{ fontFamily: COND, fontSize: 'var(--text-xl)', letterSpacing: '0.06em', textTransform: 'uppercase', color: ACID }}>
            {t('fieldDesk.home.questsHeading')}
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
                {/* Task's faction mark (#1711); decorative, the meta line names it. */}
                <span className="shrink-0 flex" aria-hidden>
                  <FactionSigil slug={praxis.task_faction_slug} size={ROW_SIGIL} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ fontFamily: COND, fontSize: 'var(--text-content)', letterSpacing: '0.02em', lineHeight: 'normal' /* the face's own content box, so nothing clips the tails (#2112) */, color: TEXT }}>
                    {praxis.task_title}
                  </div>
                  <div className="truncate" style={{ marginTop: 'var(--space-xs)', fontFamily: TYPE, fontSize: 'var(--text-md)', letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED }}>
                    {t('fieldDesk.home.taskMeta', {
                      faction: factionName(praxis.task_faction_slug),
                      points: formatPoints(praxis.score),
                    })}
                  </div>
                </div>
                <span
                  className="shrink-0"
                  style={{ fontFamily: TYPE, fontSize: 'var(--text-md)', letterSpacing: '0.1em', textTransform: 'uppercase', color: ACID, padding: 'var(--space-xs) var(--space-sm)', border: `1px solid ${LINE}` }}
                >
                  {praxisModeLabel(praxis, t)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </RansomCard>

      <div className="flex gap-2.5">
        <Link
          to={FIND_TASK_LINK}
          className="flex-1 flex items-center justify-center"
          // `-on-accent` ink: paper on this pink is under AA (#1609). Shadow is the
          // flat 40% offset register (#2302), not lift.
          style={{ fontFamily: BLACK, fontSize: 'var(--text-lg)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: 'var(--space-lg)', color: 'var(--faction-snide-on-accent)', background: PINK, boxShadow: '2px 3px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)', textDecoration: 'none' }}
        >
          {t('fieldDesk.home.findTask')}
        </Link>
        {/* Absent, not disabled, below the era's vote level (#3133). */}
        {state.canVote && (
          <Link
            to={CAST_VOTES_LINK}
            className="flex-1 flex items-center justify-center"
            style={{ fontFamily: COND, fontSize: 'var(--text-xl)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: 'var(--space-lg)', color: TEXT, background: INK, border: `1px solid ${ACID}`, textDecoration: 'none' }}
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
