import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CharacterSwitcherSheet from '../../../components/CharacterSwitcherSheet'
import FactionSigil from '../../../components/sigil/FactionSigil'
import { EverymenCog } from '../../../components/factionMarks/everymenCogs'
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
 * Everymen MOBILE FieldDesk home (#529): the union broadsheet. Same slots as the
 * Default mobile home; presentation-only, data via {@link FieldDeskHomeState}.
 */

const INK = 'var(--everymen-ink)'
/**
 * Text on the paper; flips with the stock, unlike `INK` (#2133). `INK` is
 * near-black in both themes (1.16:1 on the night paper), so it keeps only
 * borders, bands and shadows.
 */
const PAPER_TEXT = 'var(--everymen-paper-text)'
const CREAM = 'var(--everymen-cream)'
const RED = 'var(--everymen-red)'
const GOLD = 'var(--everymen-gold)'
const MUTED = 'var(--everymen-muted)'
const PAPER = 'var(--everymen-paper)'
const PAPER_DEEP = 'var(--everymen-paper-deep)'
/* Small red TEXT takes the accent minted for its stock (#1766): `RED` is under
   AA on both tans. RED stays for fills, rules and display-size figures (3:1). */
const PAPER_ACCENT = 'var(--everymen-paper-accent)'
const DEEP_ACCENT = 'var(--everymen-deep-accent)'
const ACCENT_FONT = 'var(--font-accent)'
const BODY_FONT = 'var(--faction-everymen-body-font)'

/** Row task-faction mark (#1711). */
const ROW_SIGIL = 14

const kicker: CSSProperties = {
  fontFamily: BODY_FONT,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: MUTED,
}

/**
 * Characters / Edit pills (#1553). 44 = WCAG 2.5.5 target floor (geometry).
 * Label on the deep stock takes `--everymen-deep-accent` (#1766); button-chrome
 * size is pending #1783, so `--text-lg` stays.
 */
const actionPillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  boxSizing: 'border-box',
  padding: '0 var(--space-lg)',
  borderRadius: 999,
  border: `2px solid ${INK}`,
  background: PAPER_DEEP,
  fontFamily: ACCENT_FONT,
  fontSize: 'var(--text-lg)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: DEEP_ACCENT,
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'opacity 120ms ease',
}

const trackMetaStyle: CSSProperties = {
  fontFamily: BODY_FONT,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: MUTED,
}

const TRACK_FILL = `repeating-linear-gradient(90deg, ${RED} 0 12px, ${GOLD} 12px 20px)`

function Plate({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: PAPER,
        backgroundImage: 'radial-gradient(color-mix(in srgb, var(--everymen-ink) 6%, transparent) 0.6px, transparent 0.9px)',
        backgroundSize: '5px 5px',
        border: `2px solid ${INK}`,
        padding: 'var(--space-lg)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function SectionHead({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
      <span style={{ fontFamily: ACCENT_FONT, fontSize: 'var(--text-content)', letterSpacing: '0.06em', color: PAPER_TEXT, whiteSpace: 'nowrap' }}>
        {title}
      </span>
      <span style={{ flex: 1, height: 3, background: `repeating-linear-gradient(90deg, ${RED} 0 12px, ${GOLD} 12px 20px)` }} />
      {trailing}
    </div>
  )
}

export default function EverymenFieldDesk({ state }: { state: FieldDeskHomeState }) {
  const { t } = useTranslation('common')
  const { character, eraName, levelTrack, activeTasks, pendingRow, offersACharacterChoice } =
    state
  const [switcherOpen, setSwitcherOpen] = useState(false)

  return (
    <div
      data-skin="everymen"
      className="page"
      style={{ ...factionBodyVars("everymen"), display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', fontFamily: BODY_FONT, color: PAPER_TEXT, background: PAPER }}
    >
      <header style={{ border: `3px solid ${INK}`, background: RED, color: CREAM, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            background: INK,
            color: GOLD,
            padding: 'var(--space-sm) var(--space-lg)',
          }}
        >
          <EverymenCog size={16} fill={GOLD} hub={INK} />
        </div>
        <div style={{ height: 4, background: GOLD }} />
      </header>

      <Plate>
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
              // eslint-disable-next-line local/no-raw-style-values -- ornament: gold ring thickness inside the 2px ink border of a 56px avatar; the nearest rung (4px) thickens the band by a third.
              padding: 3,
              background: GOLD,
              border: `2px solid ${INK}`,
            }}
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
                // eslint-disable-next-line local/no-raw-style-values -- ornament: avatar initial sized to its 56px gold plate, not text
                style={{ background: PAPER_DEEP, fontFamily: ACCENT_FONT, fontSize: 26, color: RED }}
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
                style={{ fontFamily: ACCENT_FONT, fontSize: 'var(--text-title)', lineHeight: 0.95, color: PAPER_TEXT, textDecoration: 'none' }}
              >
                {character.display_name}
              </Link>
            </h1>
            <div className="truncate" style={{ ...kicker, marginTop: 'var(--space-xs)' }}>
              {t('sidebar.characterCard.level', { level: character.level })}
            </div>
          </div>
        </div>

        <div className="flex items-baseline gap-2" style={{ marginTop: 'var(--space-lg)' }}>
          <span style={{ fontFamily: ACCENT_FONT, fontSize: 'var(--text-heading)', lineHeight: 0.9, color: RED }}>
            {character.score.toLocaleString()}
          </span>
          <span className="truncate" style={trackMetaStyle}>
            {eraName ? t('sidebar.characterCard.eraPoints', { era: eraName, count: character.score }) : t('sidebar.characterCard.points', { count: character.score })}
          </span>
        </div>

        {/* Level track: the spectrum clipped by fill width, not a solid colour. */}
        <div
          className="overflow-hidden"
          style={{ height: 6, borderRadius: 999, background: PAPER_DEEP, marginTop: 'var(--space-md)' }}
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

      {pendingRow && (
        <PendingRowPill
          row={pendingRow}
          className="flex items-center justify-between"
          style={{ background: PAPER, border: `1.5px solid ${INK}`, padding: 'var(--space-md) var(--space-lg)', fontFamily: ACCENT_FONT, fontSize: 'var(--text-content)', letterSpacing: '0.04em', color: PAPER_TEXT, textDecoration: 'none' }}
          chevron={<span aria-hidden style={{ color: RED }}>›</span>}
        />
      )}

      <Plate>
        <SectionHead
          title={t('fieldDesk.home.questsHeading')}
          trailing={
            // Small type on PAPER: the paper-stock accent, not bare red (#1341).
            <Link to="/tasks" style={{ ...kicker, color: PAPER_ACCENT, textDecoration: 'none' }}>
              {t('fieldDesk.home.viewAll')}
            </Link>
          }
        />

        {activeTasks.length === 0 ? (
          <p style={{ fontFamily: BODY_FONT, fontSize: 'var(--text-content)', color: MUTED, margin: 0 }}>
            {t('fieldDesk.home.questsEmpty')}
          </p>
        ) : (
          <div className="flex flex-col">
            {activeTasks.map((praxis, index) => (
              <Link
                key={praxis.id}
                to={`/praxis/${praxis.id}/edit`}
                className="flex items-center gap-3"
                style={{ padding: 'var(--space-md) 0', borderTop: index === 0 ? undefined : `1px solid color-mix(in srgb, var(--everymen-ink) 20%, transparent)`, textDecoration: 'none' }}
              >
                {/* Task's faction mark (#1711); decorative, the meta line names it. */}
                <span className="shrink-0 flex" aria-hidden>
                  <FactionSigil slug={praxis.task_faction_slug} size={ROW_SIGIL} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ fontFamily: ACCENT_FONT, fontSize: 'var(--text-content)', lineHeight: 'normal' /* the face's own content box, so nothing clips the tails (#2112) */, color: PAPER_TEXT }}>
                    {praxis.task_title}
                  </div>
                  <div className="truncate" style={{ ...kicker, marginTop: 'var(--space-xs)' }}>
                    {t('fieldDesk.home.taskMeta', {
                      faction: factionName(praxis.task_faction_slug),
                      points: formatPoints(praxis.score),
                    })}
                  </div>
                </div>
                <span
                  className="shrink-0"
                  style={{ fontFamily: BODY_FONT, fontSize: 'var(--text-md)', letterSpacing: '0.1em', textTransform: 'uppercase', color: CREAM, background: INK, padding: 'var(--space-xs) var(--space-sm)' }}
                >
                  {praxisModeLabel(praxis, t)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Plate>

      <div className="flex gap-2.5">
        <Link
          to={FIND_TASK_LINK}
          className="flex-1 flex items-center justify-center"
          style={{ fontFamily: ACCENT_FONT, fontSize: 'var(--text-xl)', letterSpacing: '0.08em', padding: 'var(--space-lg)', color: CREAM, background: RED, border: `2px solid ${INK}`, textDecoration: 'none' }}
        >
          {t('fieldDesk.home.findTask')}
        </Link>
        {/* Absent, not disabled, below the era's vote level (#3133). */}
        {state.canVote && (
          <Link
            to={CAST_VOTES_LINK}
            className="flex-1 flex items-center justify-center"
            style={{ fontFamily: ACCENT_FONT, fontSize: 'var(--text-xl)', letterSpacing: '0.08em', padding: 'var(--space-lg)', color: PAPER_TEXT, background: PAPER_DEEP, border: `2px solid ${INK}`, textDecoration: 'none' }}
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
