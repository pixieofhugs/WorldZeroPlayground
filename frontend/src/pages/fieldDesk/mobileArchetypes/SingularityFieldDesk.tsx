import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CharacterSwitcherSheet from '../../../components/CharacterSwitcherSheet'
import FactionSigil from '../../../components/sigil/FactionSigil'
import { factionName } from '../../../utils/factions'
import { factionRoleVars } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'
import { mediaUrl } from '../../../utils/media'
import { formatPoints } from '../../../utils/points'
import { praxisModeLabel } from '../../../utils/praxis'
import type { FieldDeskHomeState } from '../useFieldDeskHome'
import PendingRowPill from '../PendingRowPill'
import { CAST_VOTES_LINK, FIND_TASK_LINK } from '../homeDestinations'
import LevelTrackMeta from '../../../components/LevelTrackMeta'

/**
 * Singularity MOBILE FieldDesk home (#526): the dark terminal. Same slots as the
 * Default mobile home. ALWAYS DARK: tokens read the same in both themes; never
 * mutates data-theme. Presentation-only, data via {@link FieldDeskHomeState}.
 */

// Roles (#2675) on the `sheet` ground; `chrome` is the rail's.
const VOID = 'var(--sg-desk-paper)'
const PHOSPHOR = 'var(--sg-desk-accent)'
const SIGNAL = 'var(--sg-desk-quiet)'
const BORDER_HARD = 'var(--faction-singularity-border-hard)'
// Credits accent, a gold scalar. Own token, not na's gold (#1766): that one is
// tuned for a white plate, this ground is near-black in both themes.
const AMBER = 'var(--faction-singularity-amber)'
const FONT = 'var(--font-faction-terminal)'

const phosphor = (pct: number): string => `color-mix(in srgb, ${PHOSPHOR} ${pct}%, transparent)`
const signal = (pct: number): string => `color-mix(in srgb, ${SIGNAL} ${pct}%, transparent)`

const kicker: CSSProperties = {
  fontFamily: FONT,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: signal(60),
}

/** Characters / Edit pills (#1553). 44 = WCAG 2.5.5 target floor (geometry). */
const actionPillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  boxSizing: 'border-box',
  padding: '0 var(--space-lg)',
  borderRadius: 999,
  border: `1px solid ${BORDER_HARD}`,
  background: signal(10),
  fontFamily: FONT,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: PHOSPHOR,
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'opacity 120ms ease',
}

const trackMetaStyle: CSSProperties = {
  fontFamily: FONT,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: signal(60),
}

const TRACK_FILL = `linear-gradient(90deg, ${signal(85)}, ${PHOSPHOR})`

/** Row task-faction mark (#1711). */
const ROW_SIGIL = 13

function Panel({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: VOID, border: `1px solid ${signal(42)}`, padding: 'var(--space-lg)' }}>
      {/* Scanline overlay */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `repeating-linear-gradient(to bottom, transparent, transparent 2px, ${phosphor(1.2)} 2px, ${phosphor(1.2)} 4px)`,
        }}
      />
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  )
}

export default function SingularityFieldDesk({ state }: { state: FieldDeskHomeState }) {
  const { t } = useTranslation('common')
  const { character, eraName, levelTrack, activeTasks, pendingRow, offersACharacterChoice } =
    state
  const [switcherOpen, setSwitcherOpen] = useState(false)

  return (
    <div
      data-skin="singularity"
      className="page"
      style={{ ...factionBodyVars("singularity"), ...factionRoleVars('singularity', 'sg-desk'), display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', fontFamily: FONT, color: PHOSPHOR, background: VOID }}
    >
      <header>
        <div style={{ height: 1, marginTop: 'var(--space-md)', background: `linear-gradient(90deg, ${BORDER_HARD}, transparent)` }} />
      </header>

      <Panel>
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
            style={{ width: 52, height: 52, borderRadius: '50%', border: `1px solid ${BORDER_HARD}`, background: signal(14), overflow: 'hidden' }}
          >
            {character.avatar_url ? (
              <img
                src={mediaUrl(character.avatar_url)}
                alt={character.display_name}
                className="w-full h-full"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <span
                className="flex w-full h-full items-center justify-center"
                // eslint-disable-next-line local/no-raw-style-values -- ornament: avatar initial sized to its 52px node ring, not text
                style={{ fontFamily: FONT, fontSize: 20, color: SIGNAL }}
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
                style={{ fontFamily: FONT, fontSize: 'var(--text-content)', lineHeight: 1.05, color: PHOSPHOR, letterSpacing: '0.03em', textDecoration: 'none' }}
              >
                {character.display_name}
              </Link>
            </h1>
            <div className="truncate" style={{ marginTop: 'var(--space-xs)', fontFamily: FONT, fontSize: 'var(--text-md)', letterSpacing: '0.1em', textTransform: 'uppercase', color: signal(60) }}>
              {t('sidebar.characterCard.level', { level: character.level })}
            </div>
          </div>
        </div>

        <div className="flex items-baseline gap-2" style={{ marginTop: 'var(--space-lg)' }}>
          <span style={{ fontFamily: FONT, fontSize: 'var(--text-heading)', lineHeight: 1, color: PHOSPHOR }}>
            {character.score.toLocaleString()}
          </span>
          <span className="truncate" style={trackMetaStyle}>
            {eraName ? t('sidebar.characterCard.eraPoints', { era: eraName, count: character.score }) : t('sidebar.characterCard.points', { count: character.score })}
          </span>
        </div>

        {/* Level track: the spectrum clipped by fill width, not a solid colour. */}
        <div
          className="overflow-hidden"
          style={{ height: 6, borderRadius: 999, background: signal(8), marginTop: 'var(--space-md)' }}
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
      </Panel>

      {pendingRow && (
        <PendingRowPill
          row={pendingRow}
          className="flex items-center justify-between"
          style={{ background: VOID, border: `1px solid ${signal(42)}`, padding: 'var(--space-md) var(--space-lg)', fontFamily: FONT, fontSize: 'var(--text-content)', color: PHOSPHOR, textDecoration: 'none' }}
          chevron={<span aria-hidden style={{ color: SIGNAL }}>›</span>}
        />
      )}

      <Panel>
        <div className="flex items-center gap-2.5" style={{ marginBottom: 'var(--space-md)' }}>
          <span style={{ fontFamily: FONT, fontSize: 'var(--text-md)', letterSpacing: '0.1em', textTransform: 'uppercase', color: PHOSPHOR }}>
            {t('fieldDesk.home.questsHeading')}
          </span>
          <span style={{ flex: 1, height: 1, background: signal(30) }} />
          <Link to="/tasks" style={{ ...kicker, color: SIGNAL, textDecoration: 'none' }}>
            {t('fieldDesk.home.viewAll')}
          </Link>
        </div>

        {activeTasks.length === 0 ? (
          <p style={{ fontFamily: FONT, fontSize: 'var(--text-content)', color: phosphor(45), margin: 0 }}>
            {t('fieldDesk.home.questsEmpty')}
          </p>
        ) : (
          <div className="flex flex-col">
            {activeTasks.map((praxis, index) => (
              <Link
                key={praxis.id}
                to={`/praxis/${praxis.id}/edit`}
                className="flex items-center gap-3"
                style={{ padding: 'var(--space-md) 0', borderTop: index === 0 ? undefined : `1px solid ${signal(14)}`, textDecoration: 'none' }}
              >
                {/* Task's faction mark (#1711); decorative, the meta line names it. */}
                <span className="shrink-0 flex" aria-hidden>
                  <FactionSigil slug={praxis.task_faction_slug} size={ROW_SIGIL} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ fontFamily: FONT, fontSize: 'var(--text-content)', lineHeight: 'normal' /* the face's own content box, so nothing clips the tails (#2112) */, color: PHOSPHOR }}>
                    {praxis.task_title}
                  </div>
                  <div className="truncate" style={{ marginTop: 'var(--space-xs)', fontFamily: FONT, fontSize: 'var(--text-md)', letterSpacing: '0.1em', textTransform: 'uppercase', color: signal(55) }}>
                    {t('fieldDesk.home.taskMeta', {
                      faction: factionName(praxis.task_faction_slug),
                      points: formatPoints(praxis.score),
                    })}
                  </div>
                </div>
                <span
                  className="shrink-0"
                  style={{ fontFamily: FONT, fontSize: 'var(--text-md)', letterSpacing: '0.1em', textTransform: 'uppercase', color: AMBER, padding: 'var(--space-xs) var(--space-sm)', border: `1px solid ${signal(30)}` }}
                >
                  {praxisModeLabel(praxis, t)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      <div className="flex gap-2.5">
        <Link
          to={FIND_TASK_LINK}
          className="flex-1 flex items-center justify-center"
          style={{ fontFamily: FONT, fontSize: 'var(--text-lg)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: 'var(--space-lg)', color: VOID, background: PHOSPHOR, border: `1px solid ${PHOSPHOR}`, boxShadow: `0 0 16px ${phosphor(30)}`, textDecoration: 'none' }}
        >
          {t('fieldDesk.home.findTask')}
        </Link>
        {/* Absent, not disabled, below the era's vote level (#3133). */}
        {state.canVote && (
          <Link
            to={CAST_VOTES_LINK}
            className="flex-1 flex items-center justify-center"
            style={{ fontFamily: FONT, fontSize: 'var(--text-lg)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: 'var(--space-lg)', color: PHOSPHOR, background: 'transparent', border: `1px solid ${signal(40)}`, textDecoration: 'none' }}
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
