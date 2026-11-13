import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  factionCssVar,
  factionName,
} from '../../../utils/factions'
import { factionRoleVars } from '../../../utils/factionRoles'
import { mediaUrl } from '../../../utils/media'
import { formatPoints } from '../../../utils/points'
import { praxisModeLabel } from '../../../utils/praxis'
import CharacterSwitcherSheet from '../../../components/CharacterSwitcherSheet'
import FactionSigil from '../../../components/sigil/FactionSigil'
import type { FieldDeskHomeState } from '../useFieldDeskHome'
import PendingRowPill from '../PendingRowPill'
import { CAST_VOTES_LINK, FIND_TASK_LINK } from '../homeDestinations'
import LevelTrackMeta from '../../../components/LevelTrackMeta'

/**
 * Default (na) mobile FieldDesk home (#500): the carried life at a glance,
 * single-column. Every faction falls through here until it registers its own.
 * Presentation-only over {@link FieldDeskHomeState}.
 */

/** The task-faction mark on an in-progress row (#1711), at cap height. */
const ROW_SIGIL = 14

/** Characters / Edit pills (#1553). 44 is the WCAG 2.5.5 target floor. */
const actionPillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  boxSizing: 'border-box',
  padding: '0 var(--space-lg)',
  borderRadius: 999,
  border: '1px solid var(--color-border-strong)',
  background: 'var(--color-bg-surface-alt)',
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-md)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--color-text-primary)',
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'opacity 120ms ease',
}
/** The baseline row under the track. */
const trackMetaStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-base)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
}
const pendingPillStyle: CSSProperties = {
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 999,
  padding: 'var(--space-md) var(--space-lg)',
  color: 'var(--color-text-primary)',
  textDecoration: 'none',
}
const primaryActionStyle: CSSProperties = {
  padding: 'var(--space-lg)',
  borderRadius: 12,
  fontSize: 'var(--text-lg)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  fontWeight: 700,
  color: 'var(--color-bg-page)',
  background: 'var(--color-text-primary)',
  border: '1px solid var(--color-text-primary)',
  textDecoration: 'none',
}
const secondaryActionStyle: CSSProperties = {
  ...primaryActionStyle,
  fontWeight: undefined,
  color: 'var(--color-text-primary)',
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border-strong)',
}

export default function DefaultFieldDesk({
  state,
  identityOrnament,
}: {
  state: FieldDeskHomeState
  /** One inert node inside the identity card, so it clips to it (#2519). */
  identityOrnament?: ReactNode
}) {
  const { t } = useTranslation('common')
  const { character, eraName, levelTrack, activeTasks, pendingRow, offersACharacterChoice } =
    state
  const [switcherOpen, setSwitcherOpen] = useState(false)

  return (
    <div
      data-skin="default"
      className="page"
      style={{
        // Pinned to na: this desk stands on slugless app chrome (#2672, #2361).
        ...factionRoleVars("na", 'na-field-desk'),
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-lg)',
      }}
    >
      {/* Identity block */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-lg)',
        }}
      >
        {identityOrnament}

        {/* Hairline, avatar ring and track: one mark at three scales (#1553).
            `.spectrum-rule` is the dresser seam: hidden under `.alb-desk`
            (#2519). */}
        <span
          className="spectrum-rule"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            opacity: 0.9,
          }}
        />

        <div className="flex justify-end gap-2 mb-4" style={{ marginTop: 'var(--space-xs)' }}>
          {/* Hidden when the roster offers no choice (#2111). */}
          {offersACharacterChoice && (
            <button
              type="button"
              onClick={() => setSwitcherOpen(true)}
              className="hover:opacity-80 active:opacity-60"
              style={actionPillStyle}
            >
              {t('sidebar.characterCard.characters')}
            </button>
          )}
          <Link
            to={`/characters/${character.id}/edit`}
            className="hover:opacity-80 active:opacity-60"
            style={actionPillStyle}
          >
            {t('sidebar.characterCard.edit')}
          </Link>
        </div>

        {/* Name over level; no faction word (#1553). */}
        <div className="flex items-center gap-3.5">
          <div
            className="shrink-0 rounded-full"
            style={{
              width: 56,
              height: 56,
              // eslint-disable-next-line local/no-raw-style-values -- ornament: spectrum ring thickness drawn around a 56px avatar; the nearest rung (4px) thickens the band by a third.
              padding: 3,
              background: 'var(--faction-default-rainbow-conic)',
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
              <div
                className="w-full h-full rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${factionCssVar(character.faction_slug, 'light')}, ${factionCssVar(character.faction_slug)})`,
                }}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            {/* The page's <h1> names the carried life (#2580, #1794). */}
            <h1 className="m-0">
              <Link
                to={`/characters/${character.id}`}
                className="font-display italic block truncate content-title"
                style={{ lineHeight: 1.05, color: 'var(--color-text-primary)', textDecoration: 'none' }}
              >
                {character.display_name}
              </Link>
            </h1>
            <div
              className="truncate"
              style={{
                marginTop: 'var(--space-xs)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-base)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--color-text-secondary)',
              }}
            >
              {t('sidebar.characterCard.level', { level: character.level })}
            </div>
          </div>
        </div>

        {/* The one points figure. */}
        <div className="flex items-baseline gap-2" style={{ marginTop: 'var(--space-lg)' }}>
          <span className="font-display italic" style={{ fontSize: 'var(--text-heading)', lineHeight: 1, color: 'var(--color-text-primary)' }}>
            {character.score.toLocaleString()}
          </span>
          <span className="truncate" style={trackMetaStyle}>
            {eraName ? t('sidebar.characterCard.eraPoints', { era: eraName, count: character.score }) : t('sidebar.characterCard.points', { count: character.score })}
          </span>
        </div>

        {/* Level track: the full spectrum clipped by the fill width. */}
        <div
          className="overflow-hidden"
          style={{ height: 6, borderRadius: 999, background: 'var(--color-bg-surface-alt)', marginTop: 'var(--space-md)' }}
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
              background: 'var(--faction-default-rainbow)',
              transition: 'width 300ms',
            }}
          />
        </div>

        <LevelTrackMeta
          track={levelTrack}
          allTimeScore={character.all_time_score}
          style={trackMetaStyle}
        />
      </section>

      {/* Pending row (#1554) */}
      {pendingRow && (
        <PendingRowPill
          row={pendingRow}
          className="font-body flex items-center justify-between content-text"
          style={pendingPillStyle}
          chevron={<span aria-hidden style={{ color: 'var(--color-text-tertiary)' }}>›</span>}
        />
      )}

      {/* In-progress tasks */}
      <section
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-lg)',
        }}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <span className="label-heading">
            {t('fieldDesk.home.questsHeading')}
          </span>
          <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--color-border-strong), transparent)' }} />
          <Link
            to="/tasks"
            className="label-caption"
            style={{ color: 'var(--na-field-desk-quiet)', textDecoration: 'none' }}
          >
            {t('fieldDesk.home.viewAll')}
          </Link>
        </div>

        {activeTasks.length === 0 ? (
          <p className="font-body content-text" style={{ color: 'var(--color-text-tertiary)' }}>
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
                  borderTop: index === 0 ? undefined : '1px solid var(--color-border)',
                  textDecoration: 'none',
                }}
              >
                {/* The task's faction (#1711); decorative, meta line names it. */}
                <span className="shrink-0 flex" aria-hidden>
                  <FactionSigil slug={praxis.task_faction_slug} size={ROW_SIGIL} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-display truncate content-text" style={{ lineHeight: 'normal' /* no clipped descenders (#2112) */, color: 'var(--color-text-primary)' }}>
                    {praxis.task_title}
                  </div>
                  <div
                    className="truncate"
                    style={{
                      marginTop: 'var(--space-xs)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-md)',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {t('fieldDesk.home.taskMeta', {
                      faction: factionName(praxis.task_faction_slug),
                      points: formatPoints(praxis.score),
                    })}
                  </div>
                </div>
                <span
                  className="shrink-0 label-caption"
                  style={{
                    color: 'var(--na-field-desk-quiet)',
                    padding: 'var(--space-xs) var(--space-sm)',
                    border: '1px solid var(--color-border-strong)',
                    borderRadius: 999,
                  }}
                >
                  {praxisModeLabel(praxis, t)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Primary actions (#1554) */}
      <div className="flex gap-2.5">
        <Link
          to={FIND_TASK_LINK}
          className="font-body flex-1 flex items-center justify-center"
          style={primaryActionStyle}
        >
          {t('fieldDesk.home.findTask')}
        </Link>
        {/* Absent, not disabled, below the era's vote level (#3133). */}
        {state.canVote && (
          <Link
            to={CAST_VOTES_LINK}
            className="font-body flex-1 flex items-center justify-center"
            style={secondaryActionStyle}
          >
            {t('fieldDesk.home.castVotes')}
          </Link>
        )}
      </div>

      {/* Active-character switcher — bottom sheet over Home (#516). */}
      <CharacterSwitcherSheet
        open={switcherOpen}
        activeCharacterId={character.id}
        onClose={() => setSwitcherOpen(false)}
      />
    </div>
  )
}
