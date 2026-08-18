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

/**
 * S.N.I.D.E. MOBILE FieldDesk home (#530) — the operative's file on a phone.
 * The carried life and its open jobs become dark ransom cards slapped down on
 * a near-black desk: Bebas mastheads over an acid rule, halftone dot screens, hard
 * offset shadows, a hot-pink primary. Same content slots as the Default mobile
 * home (the identity block — name, level, era points and the level track —
 * active-tasks list, primary actions) — only the paste-up changes. Grounds on the `--faction-snide-*`
 * tokens already in index.css; native-dark (dark ink cards on the flyposted
 * wall). Presentation-only — all data arrives via {@link FieldDeskHomeState}.
 */

const WALL = 'var(--faction-snide-wall)'
const WALL_TEXT = 'var(--faction-snide-wall-text)'
const INK = 'var(--faction-snide-card-bg)'
const TEXT = 'var(--faction-snide-card-text)'
const MUTED = 'var(--faction-snide-card-muted)'
const ACID = 'var(--faction-snide-card-accent)'
const ACCENT_WALL = 'var(--faction-snide)'
const PINK = 'var(--faction-snide-pink)'
const LINE = 'var(--faction-snide-border)'
const COND = 'var(--faction-snide-font-cond)'
const IMPACT = 'var(--faction-snide-font-impact)'
const BLACK = 'var(--faction-snide-font-black)'
const TYPE = 'var(--faction-snide-font-type)'
const MARKER = 'var(--faction-snide-font-marker)'

/** The task-faction mark on a cut-out row (#1711) — a touch under the other
 *  skins' 14, because this row's rule is tight and the type is condensed. */
const ROW_SIGIL = 13

const HALFTONE = 'radial-gradient(rgba(182,255,46,0.09) 32%, transparent 34%)'
/** The flyposter's flat offset register (#1609) — zero blur, and its strength is
 *  this file's drawing, so only the ink is a token. This one was invisible to the
 *  raw-colour ratchet: a module constant is Gap D wearing paint. */
const CARD_SHADOW = '5px 6px 0 color-mix(in srgb, var(--color-print-offset) 50%, transparent)'

const kicker: CSSProperties = {
  fontFamily: TYPE,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: MUTED,
}

/**
 * Characters / Edit as real controls (#1553) — a cut-out chip stuck to the
 * file. They were bare caps with no box: a sub-20px hit target on a phone. 44
 * is the WCAG 2.5.5 target floor and is GEOMETRY, not spacing.
 */
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

/** The baseline row under the track — the file's typewriter voice. */
const trackMetaStyle: CSSProperties = {
  fontFamily: TYPE,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: MUTED,
}

/** The operative's own ramp: hot pink burning up into acid (#1553). */
const TRACK_FILL = `linear-gradient(90deg, ${PINK}, ${ACID})`

/** Dark ransom card — halftoned, hard-shadowed, slightly askew. */
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
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', fontFamily: TYPE, color: WALL_TEXT, background: WALL }}
    >
      {/* Masthead — Bebas over an acid rule */}
      <header>
        <div style={kicker}>{t('nav.home')}</div>
        <h1 style={{ fontFamily: COND, fontSize: 'var(--text-display)', letterSpacing: '0.03em', lineHeight: 0.95, color: WALL_TEXT, margin: 'var(--space-xs) 0 0' }}>
          {t('fieldDesk.home.title')}
        </h1>
        <div style={{ height: 2, marginTop: 'var(--space-sm)', background: ACCENT_WALL }} />
      </header>

      {/* ── Operative file ── */}
      <RansomCard tilt={-1}>
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
            <Link
              to={`/characters/${character.id}`}
              className="block truncate"
              style={{ fontFamily: COND, fontSize: 'var(--text-title)', letterSpacing: '0.03em', lineHeight: 1, color: TEXT, textDecoration: 'none' }}
            >
              {character.display_name}
            </Link>
            <div className="truncate" style={{ marginTop: 'var(--space-xs)', fontFamily: TYPE, fontSize: 'var(--text-md)', letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED }}>
              {t('sidebar.characterCard.level', { level: character.level })}
            </div>
          </div>
        </div>

        {/* The one points figure, in the display face (#1553). */}
        <div className="flex items-baseline gap-2" style={{ marginTop: 'var(--space-lg)' }}>
          <span style={{ fontFamily: IMPACT, fontSize: 'var(--text-heading)', lineHeight: 1, color: ACID }}>
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
          // The unfilled track is a percentage of the ink already on the desk
          // (#1609), not a fixed white — the desk ground flips #14110b ->
          // #0c0a07, and a 4% white wash was the one value that could not
          // follow it.
          style={{ height: 6, borderRadius: 999, background: 'color-mix(in srgb, var(--faction-snide-card-text) 4%, transparent)', marginTop: 'var(--space-md)' }}
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
      </RansomCard>

      {/* ── The pending row, in all three of its states (#1554) ── */}
      {pendingRow && (
        <PendingRowPill
          row={pendingRow}
          className="flex items-center justify-between"
          style={{ background: INK, color: TEXT, border: `1px solid ${LINE}`, padding: 'var(--space-md) var(--space-lg)', fontFamily: COND, fontSize: 'var(--text-content)', letterSpacing: '0.03em', textDecoration: 'none' }}
          chevron={<span aria-hidden style={{ color: ACID }}>›</span>}
        />
      )}

      {/* ── Jobs in play ── */}
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
                {/* The TASK's faction, not the zine's own acid (#1711). The kicker
                    under the title names it in words, so the mark is decorative. */}
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

      {/* ── Primary actions: both land on an already-narrowed view (#1554) ── */}
      <div className="flex gap-2.5">
        <Link
          to={FIND_TASK_LINK}
          className="flex-1 flex items-center justify-center"
          // `--faction-snide-paper` on the zine pink measures 3.10:1 — below
          // AA, and this is the desk's PRIMARY action (#1609). Every other
          // surface that fills with this pink already inks it dark: the seal's
          // clip chip, the comment voice, the score stamp's multiplier and the
          // task card's CTA. `-on-accent` is the measured 5.38:1.
          // The boxShadow is a flat offset print register, not lift (#1609): the
          // ink is `--color-print-offset`, the 40% is this mark's own strength.
          style={{ fontFamily: BLACK, fontSize: 'var(--text-lg)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: 'var(--space-lg)', color: 'var(--faction-snide-on-accent)', background: PINK, boxShadow: '2px 3px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)', textDecoration: 'none' }}
        >
          {t('fieldDesk.home.findTask')}
        </Link>
        <Link
          to={CAST_VOTES_LINK}
          className="flex-1 flex items-center justify-center"
          style={{ fontFamily: COND, fontSize: 'var(--text-xl)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: 'var(--space-lg)', color: TEXT, background: INK, border: `1px solid ${ACID}`, textDecoration: 'none' }}
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
