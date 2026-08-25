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

/**
 * Default (na) MOBILE FieldDesk home — the account's carried life at a glance,
 * one-hand and single-column (#500). Character header (avatar in the all-paths
 * rainbow ring + name + level, then the era points figure over a rainbow
 * level track), the pending row, the in-progress task list, and the two
 * primary actions — both of which land on an already-narrowed view. Every faction falls
 * through here until it registers a bespoke mobile home skin (mirrors the
 * taskDetail mobile Default). Presentation-only: all data arrives via
 * {@link FieldDeskHomeState}; copy resolves from the `common` catalog.
 *
 * Layout is flex/relative — no fixed-px grid drives the page structure
 * (SPEC-faction-ui-profile §1a).
 */

/** The task-faction mark on an in-progress row (#1711), sized to the row's own
 *  cap height — it stands where the lead dot stood, not where an emblem would. */
const ROW_SIGIL = 14

// Static style objects, hoisted to module scope (#586) — no closure deps.
/**
 * Characters / Edit as real controls (#1553). They were bare ~11px caps with no
 * box — a sub-20px hit target on a phone, which is the accessibility half of
 * the identity redesign. 44 is the WCAG 2.5.5 target floor and is GEOMETRY, not
 * spacing: deliberately not on the --space-* ramp.
 */
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
  // --text-md, not .eyebrow's --text-sm: a 44px pill wants a label a thumb can
  // aim at, and this is the size the bare caps it replaces already read at.
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
  /**
   * One inert node, mounted inside the IDENTITY CARD (#2519, epic #2496). The
   * epic's named slot — `AlbescentProfileBody` uses the same word for the same
   * job — and it exists because a dresser's spectrum edge has to clip to this
   * card's own rounded box, which a span wrapped around the whole page cannot
   * do. na hands nothing and renders no ornament markup at all.
   */
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
        // The role map (#2672), pinned to na: this desk stands on the app's own
        // `--color-bg-*` chrome, which takes no slug, and an ink may not leave a
        // ground that cannot follow it (#2361, #2669).
        ...factionRoleVars("na", 'na-field-desk'),
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-lg)',
      }}
    >
      {/* ── Identity block ── */}
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

        {/* The signature hairline — the hairline, the avatar ring and the level
            track are one mark at three scales (#1553).

            The RAMP is `.spectrum-rule` since #2505, the eighteenth mount of
            #2497's linear cut and the same one-word move those seventeen made:
            the class carries `--faction-default-rainbow` and nothing else, so
            the paint is byte-identical and the geometry stays inline where it
            belongs. It is here rather than in #2497 because that issue converted
            the ten `Default*` files Albescent already wore, and this was not one
            of them until now. The class is the dresser seam #2497's own
            docblock names, and what it carries now is a `display: none`: under
            `.alb-desk` this bar comes OFF, because the identity card grows a
            travelling spectrum edge of its own and one carrier per object is
            the design canvas's rule (#2519). For na it is unchanged, and it is
            still the mark #1553 drew. */}
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

        {/* Actions on their own row, right-aligned, real targets. */}
        <div className="flex justify-end gap-2 mb-4" style={{ marginTop: 'var(--space-xs)' }}>
          {/* Hidden when the roster has nothing to offer (#2111): one life and a
              shut second-character gate make this two taps to a dead end. */}
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

        {/* Name over level. No faction word — the rainbow ring and the page
            already say unaffiliated — and no second points figure. */}
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

        {/* The one points figure, in the display face. */}
        <div className="flex items-baseline gap-2" style={{ marginTop: 'var(--space-lg)' }}>
          <span className="font-display italic" style={{ fontSize: 'var(--text-heading)', lineHeight: 1, color: 'var(--color-text-primary)' }}>
            {character.score.toLocaleString()}
          </span>
          <span className="truncate" style={trackMetaStyle}>
            {eraName ? t('sidebar.characterCard.eraPoints', { era: eraName, count: character.score }) : t('sidebar.characterCard.points', { count: character.score })}
          </span>
        </div>

        {/* The level track: the spectrum CLIPPED by the fill width — one full
            ramp read through a narrower window, not a solid colour. */}
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
      </section>

      {/* ── The pending row: requests, other news, or a dead-ended "all caught
          up" that keeps the pill and drops the chevron (#1554). ── */}
      {pendingRow && (
        <PendingRowPill
          row={pendingRow}
          className="font-body flex items-center justify-between content-text"
          style={pendingPillStyle}
          chevron={<span aria-hidden style={{ color: 'var(--color-text-tertiary)' }}>›</span>}
        />
      )}

      {/* ── In-progress tasks ── */}
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
            style={{ color: 'var(--na-field-desk-quiet, var(--faction-default-card-muted))', textDecoration: 'none' }}
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
                {/* The task's faction, drawn as its own mark rather than as a
                    colour swatch (#1711). Decorative: the meta line below names
                    the faction in words. */}
                <span className="shrink-0 flex" aria-hidden>
                  <FactionSigil slug={praxis.task_faction_slug} size={ROW_SIGIL} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-display truncate content-text" style={{ lineHeight: 'normal' /* the face's own content box, so nothing clips the tails (#2112) */, color: 'var(--color-text-primary)' }}>
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
                    color: 'var(--na-field-desk-quiet, var(--faction-default-card-muted))',
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

      {/* ── Primary actions: both land on an already-narrowed view (#1554) ── */}
      <div className="flex gap-2.5">
        <Link
          to={FIND_TASK_LINK}
          className="font-body flex-1 flex items-center justify-center"
          style={primaryActionStyle}
        >
          {t('fieldDesk.home.findTask')}
        </Link>
        <Link
          to={CAST_VOTES_LINK}
          className="font-body flex-1 flex items-center justify-center"
          style={secondaryActionStyle}
        >
          {t('fieldDesk.home.castVotes')}
        </Link>
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
