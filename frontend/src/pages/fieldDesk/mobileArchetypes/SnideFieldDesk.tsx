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
import LevelTrackMeta from '../../../components/LevelTrackMeta'

/**
 * S.N.I.D.E. MOBILE FieldDesk home (#530) — the operative's file on a phone.
 * The desk is the flyposted wall; the masthead is CUT from ransom scraps and the
 * open jobs are a black clipping slapped down on it, with halftone dot screens,
 * hard offset shadows and a hot-pink primary. Same content slots as the Default
 * mobile home (the identity block — name, level, era points and the level track —
 * active-tasks list, primary actions) — only the paste-up changes. Grounds on the
 * `--faction-snide-*` tokens already in index.css. Presentation-only — all data
 * arrives via {@link FieldDeskHomeState}.
 *
 * TWO GROUNDS, AND WHICH ONE A MARK IS ON DECIDES ITS INK FAMILY (#2287). The
 * credential panel wears the shared {@link WALL} — the kit's current S.N.I.D.E.
 * look, which this surface never got — and everything READ on it takes the
 * flipping `-note-*` inks. The jobs card stays the black clipping pasted ON that
 * wall and keeps the invariant `-card-*` family (#2066). A DRAWN fill is neither:
 * the acid avatar tile and the black action chips inside the panel are objects
 * stuck to the wall, not type on it, so they keep their own pigments.
 */

/** The desk itself: the wall's flat ramp START, so the credential panel's full
 *  five-layer {@link WALL} still reads as something pasted ON it. */
const DESK = 'var(--faction-snide-wall)'
const WALL_TEXT = 'var(--faction-snide-wall-text)'
const INK = 'var(--snd-desk-paper)'
const TEXT = 'var(--snd-desk-ink)'
const MUTED = 'var(--snd-desk-quiet)'
const ACID = 'var(--snd-desk-accent)'
const ACCENT_WALL = 'var(--snd-desk-fill)'
const PINK = 'var(--faction-snide-pink)'
const LINE = 'var(--faction-snide-border)'
const COND = 'var(--faction-snide-font-cond)'
const IMPACT = 'var(--faction-snide-font-impact)'
const BLACK = 'var(--faction-snide-font-black)'
const TYPE = 'var(--faction-snide-font-type)'
const MARKER = 'var(--faction-snide-font-marker)'

/* THE PANEL'S OWN INK FAMILY (#2287). The credential panel stands on the wall
   now, and the wall FLIPS -- xerox stock by day, pitch black by night -- so it
   takes the `-note-*` inks that flip with it, never the `-card-*` ones, which
   are pinned near-black in both themes for the slabs pasted ON the wall (#2066;
   `factionMarks/snideAtoms` states the rule). All three that moved were
   invisible by day on the new ground: `-card-text` 1.05:1, `-card-muted`
   1.24:1, acid-as-type 1.03:1. Measured on all four of the wall's readings,
   `-note-ink` runs 11.87-15.95 light / 13.28-18.04 dark and `-note-muted`
   5.02-6.75 / 9.38-12.75. */
const NOTE_INK = 'var(--faction-snide-note-ink)'
const NOTE_MUTED = 'var(--faction-snide-note-muted)'
/* ACID NEVER TOUCHES PAPER (#2173), so where acid is TYPE or a filled TRACK on
   this panel it carries a photocopier-black plate, which on the light wall reads
   as a censor bar and by night dissolves into the wall -- the ruled asymmetry,
   not a bug. The faction PIGMENT rather than `-card-accent`: the card family is
   not what this surface is dressed in. Acid on the plate is 15.55:1 in both
   cascades; where the plate dissolves, acid on the dark wall is 16.33:1. */
const ACID_PIGMENT = 'var(--faction-snide-acid)'
const PLATE = 'var(--faction-snide-ink)'

/** The task-faction mark on a cut-out row (#1711) — a touch under the other
 *  skins' 14, because this row's rule is tight and the type is condensed. */
const ROW_SIGIL = 13

/** The ransom card's dot field. A DECIDED KEEP (#2139 ②), and the reason is the
 *  ground: the only surface that mounts it is {@link RansomCard}, filled with
 *  `--faction-snide-ink`, which has ONE value in index.css. So acid at 9% is
 *  theme-correct in both cascades — 1.22:1 against that ink either way, which is
 *  the dot screen doing its job — the medallion's case in #2343 and not the
 *  hero's, where an acid alpha over a ground that had started flipping painted
 *  nothing. It is invisible to the colour arm because a module constant reaches
 *  the style object as an `Identifier` (Gap D wearing paint), and #2139 ruled
 *  that local const-tracking is not worth the rule's complexity for a handful of
 *  sites. Move this onto a flipping ground and it becomes a defect again. */
const HALFTONE = 'radial-gradient(rgba(182,255,46,0.09) 32%, transparent 34%)'
/** The flyposter's flat offset register (#1609) — zero blur, at the uniform 40%
 *  every register prints at (#2302; this card printed at 50%). Only the 5/6px
 *  offset is this file's drawing now. This one was invisible to the raw-colour
 *  ratchet: a module constant is Gap D wearing paint. */
const CARD_SHADOW = '5px 6px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)'

/** The eyebrow voice. NO INK: its two mounts stand on different grounds -- the
 *  masthead's on the wall, the "view all" link's on the black jobs slab -- and
 *  the slab's `-card-muted` measured 1.24:1 on the light wall. */
const kicker: CSSProperties = {
  fontFamily: TYPE,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
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

/** The baseline row under the track — the file's typewriter voice. Every mount
 *  is inside the credential panel, so it inks on the wall (#2287). */
const trackMetaStyle: CSSProperties = {
  fontFamily: TYPE,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: NOTE_MUTED,
}

/** The operative's own ramp: hot pink burning up into acid (#1553). */
const TRACK_FILL = `linear-gradient(90deg, ${PINK}, ${ACID})`

/**
 * THE CREDENTIAL PANEL, ON THE FLYPOSTED WALL (#2287).
 *
 * Owner ruling: this surface never got the kit's current S.N.I.D.E. look. It was
 * a dark panel dusted with a green halftone of its own; it takes the same ground
 * the task card, the composer and the praxis card wear, from the same {@link
 * WALL} export. The halftone is GONE rather than layered under it.
 *
 * THE EDGE AND THE SHADOW ARE LOAD-BEARING (§6, #2065), and doubly so here: the
 * desk behind it is the flat `-wall` ramp start, so `-note-wall-edge` and
 * `-note-wall-shadow` — the pair the task card already mounts — are what keep a
 * wall-grounded panel an object on a wall-grounded page. They are not the
 * flyposter's `CARD_SHADOW`, which is the black jobs slab's register.
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

/** Dark ransom card — halftoned, hard-shadowed, slightly askew. Still the JOBS
 *  slab's archetype: a black clipping pasted ON the wall (#2066). */
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
        ...factionRoleVars('snide', 'snd-desk'),
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-lg)',
        fontFamily: TYPE,
        color: WALL_TEXT,
        background: DESK,
      }}
    >
      {/* Masthead — the ransom cut over an acid rule */}
      <header>
        <div style={{ height: 2, marginTop: 'var(--space-sm)', background: ACCENT_WALL }} />
      </header>

      {/* ── Operative file ── */}
      <WallPanel>
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

        {/* The one points figure, in the display face (#1553), on the censor
            plate acid-as-type owes the wall (#2173). */}
        <div className="flex items-baseline gap-2" style={{ marginTop: 'var(--space-lg)' }}>
          <span style={{ fontFamily: IMPACT, fontSize: 'var(--text-heading)', lineHeight: 1, color: ACID_PIGMENT, background: PLATE, padding: '0 var(--space-xs)' }}>
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
          // THE GROOVE IS THE PLATE (#2287). A 4% wash of the card's paper ink
          // was legible only because the track lay on a black card; on the wall
          // it is nothing by day, and the fill's acid end would have read
          // 1.03:1 against the paper — the #2173 pairing exactly, in a drawn
          // mark rather than a word. A solid photocopier-black slot is the same
          // repair the points figure takes: the acid end reads 15.55:1 in it and
          // the pink end 5.38:1, and where the slot dissolves at night the fill
          // is read against the wall instead, at 16.33:1 and 5.65:1.
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
          // ink is `--color-print-offset`, and the 40% is the one strength every
          // register prints at (#2302), not this mark's own.
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
