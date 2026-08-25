import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CharacterSwitcherSheet from '../../../components/CharacterSwitcherSheet'
import UaMandala from '../../../components/factionMarks/UaMandala'
import { UaSigil } from '../../../components/sigil/UaSigil'
import FactionSigil from '../../../components/sigil/FactionSigil'
import { factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import { formatPoints } from '../../../utils/points'
import { praxisModeLabel } from '../../../utils/praxis'
import type { FieldDeskHomeState } from '../useFieldDeskHome'
import PendingRowPill from '../PendingRowPill'
import { CAST_VOTES_LINK, FIND_TASK_LINK } from '../homeDestinations'
import { factionRoleVars } from '../../../utils/factionRoles'

/**
 * University of Asthmatics MOBILE FieldDesk home (#525/#852) — "One mark today.
 * Begin."
 *
 * The gilt salon on a phone is gone with #788: no gold-leaf sandwich plates, no
 * Cinzel, no parchment dot-screen. The home screen is the practice's own page —
 * mesa sand under two sun-bleached sheets, the ensō beside the day's line, and
 * the mandala at `texture` behind the masthead, which is the page backdrop case
 * the primitive allows. The lists below it are dense and ask for nothing.
 *
 * Same content slots as the Default mobile home (the identity block — name,
 * level, era points and the level track — active-tasks list, primary actions)
 * — only the dress changes
 * (ADR-0016), and all data still arrives via {@link FieldDeskHomeState}.
 *
 * Every colour is a `--faction-ua-*` token with both themes, so the screen dims
 * through the `[data-theme="dark"]` cascade. UA dims now.
 */

const PAGE = 'var(--faction-ua-page)'
const PAGE_TEXT = 'var(--faction-ua-page-text)'
const SHEET = 'var(--leaf-mobile-field-desk-paper, var(--faction-ua-card-bg))'
const PANEL = 'var(--faction-ua-panel)'
const INK = 'var(--leaf-mobile-field-desk-ink, var(--faction-ua-card-text))'
const MUTED = 'var(--leaf-mobile-field-desk-quiet, var(--faction-ua-card-muted))'
const ACCENT = 'var(--leaf-mobile-field-desk-accent, var(--faction-ua-card-accent))'
const RULE = 'var(--faction-ua-rule)'
const FILL = 'var(--leaf-mobile-field-desk-fill, var(--faction-ua))'
const ON_FILL = 'var(--leaf-mobile-field-desk-on-fill, var(--faction-ua-on-fill))'
const DISPLAY = 'var(--leaf-mobile-field-desk-face, var(--faction-ua-card-font))'
const SERIF = 'var(--faction-ua-body-font)'

/** The label voice: EB Garamond, tracked small caps. */
const smallCaps: CSSProperties = {
  fontFamily: SERIF,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: MUTED,
}

/**
 * Characters / Edit as real controls (#1553) — a hairline chip on the sheet.
 * They were bare caps with no box: a sub-20px hit target on a phone. 44 is the
 * WCAG 2.5.5 target floor and is GEOMETRY, not spacing.
 */
const actionPillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  boxSizing: 'border-box',
  padding: '0 var(--space-lg)',
  borderRadius: 999,
  border: `1px solid ${RULE}`,
  background: PANEL,
  fontFamily: SERIF,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: ACCENT,
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'opacity 120ms ease',
}

/** The baseline row under the track — the practice's small-caps voice. */
const trackMetaStyle: CSSProperties = { ...smallCaps }

/** The practice's own ramp: the sienna fill drawn out to its accent (#1553). */
const TRACK_FILL = `linear-gradient(90deg, ${FILL}, ${ACCENT})`

/** The task-faction mark on a practice row (#1711). The dot it replaces was
 *  7px; a drawn mark needs more room, but this sheet is the quietest of the
 *  eight, so it takes the smallest of the row sizes. */
const ROW_SIGIL = 13

/** A sheet: one surface, one hairline. What is left after the gilt frame. */
function Sheet({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: SHEET, border: `1px solid ${RULE}`, borderRadius: 6, padding: 'var(--space-lg)' }}>
      {children}
    </div>
  )
}

export default function UaFieldDesk({ state }: { state: FieldDeskHomeState }) {
  const { t } = useTranslation('common')
  const { character, eraName, levelTrack, activeTasks, pendingRow, offersACharacterChoice } =
    state
  const [switcherOpen, setSwitcherOpen] = useState(false)

  return (
    <div
      data-skin="ua"
      className="page"
      style={{
        /* The nine roles under this surface's prefix (#2659/#2673). The seven
           module constants above read them; all of them are mounted inside this
           root, which is the whole screen. `sheet` and not `chrome`: this is a
           page the faction dresses, not the app's own furniture. */
        ...factionRoleVars('ua', 'leaf-mobile-field-desk'),
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-lg)',
        fontFamily: SERIF,
        color: PAGE_TEXT,
        background: PAGE,
      }}
    >
      {/* The day's line */}
      <header style={{ position: 'relative', overflow: 'hidden' }}>
        <UaMandala
          size={200}
          strength="texture"
          style={{ position: 'absolute', right: -64, top: -56, pointerEvents: 'none' }}
        />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <UaSigil width={34} height={34} />
        </div>
      </header>

      {/* ── The hand ── */}
      <Sheet>
        <div className="flex justify-end flex-wrap" style={{ gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
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
            style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: PANEL, border: `1px solid ${RULE}` }}
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
                // eslint-disable-next-line local/no-raw-style-values -- ornament: avatar initial sized to its 56px medallion, not text
                style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 24, color: ACCENT }}
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
                style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'var(--text-title)', lineHeight: 1, color: INK, textDecoration: 'none' }}
              >
                {character.display_name}
              </Link>
            </h1>
            <div className="truncate" style={{ ...smallCaps, marginTop: 'var(--space-xs)' }}>
              {t('sidebar.characterCard.level', { level: character.level })}
            </div>
          </div>
        </div>

        {/* The one points figure, in the display face (#1553). */}
        <div className="flex items-baseline gap-2" style={{ marginTop: 'var(--space-lg)' }}>
          <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'var(--text-heading)', lineHeight: 1, color: INK }}>
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
          style={{ height: 6, borderRadius: 999, background: PANEL, marginTop: 'var(--space-md)' }}
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
      </Sheet>

      {/* ── The pending row, in all three of its states (#1554) ── */}
      {pendingRow && (
        <PendingRowPill
          row={pendingRow}
          className="flex items-center justify-between"
          style={{
            background: SHEET,
            border: `1px solid ${RULE}`,
            borderRadius: 999,
            padding: 'var(--space-md) var(--space-lg)',
            fontFamily: SERIF,
            fontSize: 'var(--text-content)',
            color: INK,
            textDecoration: 'none',
          }}
          chevron={
            <span aria-hidden style={{ color: ACCENT }}>
              ›
            </span>
          }
        />
      )}

      {/* ── What is out on the table ── */}
      <Sheet>
        <div className="flex items-center gap-2.5" style={{ marginBottom: 'var(--space-md)' }}>
          <span style={{ ...smallCaps, color: INK }}>{t('fieldDesk.home.questsHeading')}</span>
          <span aria-hidden style={{ flex: 1, minWidth: 'var(--space-xl)', height: 1, background: RULE }} />
          <Link to="/tasks" style={{ ...smallCaps, color: ACCENT, textDecoration: 'none' }}>
            {t('fieldDesk.home.viewAll')}
          </Link>
        </div>

        {activeTasks.length === 0 ? (
          <p className="content-text" style={{ fontFamily: SERIF, color: MUTED, margin: 0 }}>
            {t('fieldDesk.home.questsEmpty')}
          </p>
        ) : (
          <div className="flex flex-col">
            {activeTasks.map((praxis, index) => (
              <Link
                key={praxis.id}
                to={`/praxis/${praxis.id}/edit`}
                className="flex items-center gap-3"
                style={{ padding: 'var(--space-md) 0', borderTop: index === 0 ? undefined : `1px solid var(--faction-ua-hair)`, textDecoration: 'none' }}
              >
                {/* The TASK's faction, not the sheet's own fill (#1711). The
                    small-caps line under the title names it, so the mark is
                    decorative. */}
                <span className="shrink-0 flex" aria-hidden>
                  <FactionSigil slug={praxis.task_faction_slug} size={ROW_SIGIL} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'var(--text-content)', lineHeight: 'normal' /* the face's own content box, so nothing clips the tails (#2112) */, color: INK }}>
                    {praxis.task_title}
                  </div>
                  <div className="truncate" style={{ ...smallCaps, marginTop: 'var(--space-xs)' }}>
                    {t('fieldDesk.home.taskMeta', {
                      faction: factionName(praxis.task_faction_slug),
                      points: formatPoints(praxis.score),
                    })}
                  </div>
                </div>
                <span
                  className="shrink-0"
                  style={{ ...smallCaps, color: ACCENT, padding: 'var(--space-xs) var(--space-sm)', border: `1px solid ${RULE}` }}
                >
                  {praxisModeLabel(praxis, t)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Sheet>

      {/* ── Begin ── */}
      <div className="flex flex-wrap gap-2.5">
        <Link
          to={FIND_TASK_LINK}
          className="flex items-center justify-center"
          style={{
            flex: '1 1 0',
            minWidth: 0,
            fontFamily: SERIF,
            fontSize: 'var(--text-xl)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: 'var(--space-lg)',
            color: ON_FILL,
            background: FILL,
            border: `1px solid ${FILL}`,
            borderRadius: 3,
            textDecoration: 'none',
          }}
        >
          {t('fieldDesk.home.findTask')}
        </Link>
        <Link
          to={CAST_VOTES_LINK}
          className="flex items-center justify-center"
          style={{
            flex: '1 1 0',
            minWidth: 0,
            fontFamily: SERIF,
            fontSize: 'var(--text-xl)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: 'var(--space-lg)',
            color: INK,
            background: SHEET,
            border: `1px solid ${RULE}`,
            borderRadius: 3,
            textDecoration: 'none',
          }}
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
