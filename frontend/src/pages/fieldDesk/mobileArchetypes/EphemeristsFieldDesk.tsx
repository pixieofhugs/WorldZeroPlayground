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

/**
 * The Ephemerists MOBILE FieldDesk home (#527, swept onto the Valley plate by
 * #1208) — the field journal on a phone. The carried life and its
 * surveys-underway become papyrus leaves bound in hairlines, headed by an
 * incised running-head over the design's fluted rule. Same content slots as the
 * Default mobile home (the identity block — name, level, era points and the
 * level track — active-tasks list, primary actions) — only the dress changes. Grounds on
 * `--faction-ephemerists-plate-*` and is theme-aware through the cascade: the
 * papyrus flips to the night plate in dark, no ternaries. Presentation-only —
 * all data arrives via {@link FieldDeskHomeState}.
 */

const kicker: CSSProperties = {
  ...SMALL_CAPS,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.22em',
  color: QUIET,
}

const brassRule = `linear-gradient(90deg, ${BRASS}, transparent)`

/**
 * Characters / Edit as real controls (#1553) — an incised tablet in the plate's
 * hairline. They were bare caps with no box: a sub-20px hit target on a phone.
 * 44 is the WCAG 2.5.5 target floor and is GEOMETRY, not spacing.
 */
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

/** The baseline row under the track — the leaf's marginalia voice. */
const trackMetaStyle: CSSProperties = {
  ...SMALL_CAPS,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.12em',
  color: QUIET,
}

/** The valley's own spectrum: ochre through brass into the Nile (#1553). */
const TRACK_FILL = `linear-gradient(90deg, ${OCHRE}, ${BRASS}, ${BRASS_LIGHT})`

/** The task-faction mark on a register row (#1711), at the row's cap height.
 *  Below the kite's own 20px threshold, so an ephemerists task draws the mark's
 *  reduced cut here — which is exactly what that cut is for. */
const ROW_SIGIL = 14

/** One leaf off the field journal — papyrus inside the plate's hairline. */
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
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', fontFamily: READING, color: INK, background: PAGE }}
    >
      {/* Cinzel running-head */}
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <EphemeristsSigil size={13} color={BRASS} />
        </div>
        {/* A rune band closed the running head until #2210 retired the old
            glyph vocabulary kit-wide. The desk mounts no masthead, so nothing
            takes its place — the column's own `--space-lg` gap parts the head
            from the first leaf. */}
      </header>

      {/* ── Observer leaf ── */}
      <Leaf>
        <div className="flex justify-end gap-2" style={{ marginBottom: 'var(--space-lg)' }}>
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

        {/* The one points figure, in the display face (#1553). */}
        <div className="flex items-baseline gap-2" style={{ marginTop: 'var(--space-lg)' }}>
          <span style={{ fontFamily: DECO, fontSize: 'var(--text-heading)', lineHeight: 1, color: INK }}>
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
      </Leaf>

      {/* ── The pending row, in all three of its states (#1554) ── */}
      {pendingRow && (
        <PendingRowPill
          row={pendingRow}
          className="flex items-center justify-between"
          style={{ background: SHEET, border: `1px solid ${LINE}`, padding: 'var(--space-md) var(--space-lg)', fontFamily: MARGINALIA, fontStyle: 'italic', fontSize: 'var(--text-content)', color: INK, textDecoration: 'none' }}
          chevron={<span aria-hidden style={{ color: BRASS_LIGHT }}>›</span>}
        />
      )}

      {/* ── Surveys underway ── */}
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
          <p style={{ fontFamily: MARGINALIA, fontStyle: 'italic', fontSize: 'var(--text-content)', color: QUIET, margin: 0 }}>
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
                {/* The register's lead mark is the TASK's faction now, not the
                    valley's ochre (#1711). The small-caps line under the title
                    names the faction, so the mark is decorative. */}
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

      {/* ── Primary actions: both land on an already-narrowed view (#1554) ── */}
      <div className="flex gap-2.5">
        {/* THE ONE PLATE CTA (#2146). #2067's note that this surface "does not
            paint it with the plate CTA" was already out of date — it does, and
            it restated the enclosure at the width the light half happens to
            want. `.eph-cta` carries all three; the Tailwind utilities beside it
            set only layout, so nothing here competes with the paint. */}
        <Link
          to={FIND_TASK_LINK}
          className="flex-1 flex items-center justify-center eph-cta"
          style={{ ...SMALL_CAPS, fontSize: 'var(--text-lg)', letterSpacing: '0.12em', padding: 'var(--space-lg)', textDecoration: 'none' }}
        >
          {t('fieldDesk.home.findTask')}
        </Link>
        <Link
          to={CAST_VOTES_LINK}
          className="flex-1 flex items-center justify-center"
          style={{ ...SMALL_CAPS, fontSize: 'var(--text-lg)', letterSpacing: '0.12em', padding: 'var(--space-lg)', color: INK, background: SHEET, border: `1px solid ${BRASS}`, textDecoration: 'none' }}
        >
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
  )
}
