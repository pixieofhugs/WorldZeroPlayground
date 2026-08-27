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

/**
 * Everymen MOBILE FieldDesk home (#529) — the union broadsheet on a phone. The
 * carried life becomes the day's front page: a red masthead billboard with the
 * cog seal and knockout Bebas nameplate, the union band run as a level track,
 * and the in-progress work filed as newsprint dispatches. Same content slots as
 * the Default mobile home (the identity block — name, level, era points and
 * the level track — active-tasks list, primary actions) — only the dress
 * changes. Grounds on the
 * `--everymen-*` tokens already in index.css (the set EverymenTaskDetail /
 * EverymenFactionBody use), so it flips with `[data-theme]` without mutating the
 * document theme. Presentation-only — all data arrives via
 * {@link FieldDeskHomeState}.
 */

const INK = 'var(--everymen-ink)'
/**
 * Text on the paper. FLIPS with the stock — deliberately not `INK` (#2133).
 *
 * `--everymen-ink` is a near-black in BOTH themes, because the stocks it was
 * minted for are theme-invariant: the cream board and the gold. This desk has
 * neither. Every ground under its type is `PAPER` or `PAPER_DEEP`, and both
 * flip — so the frozen ink measured 13.19:1 by day and 1.16:1 at night, on the
 * character name, the section heads, the task rows and the two footer actions.
 * The two tokens are the same hex in light, so the repaint moves nothing there.
 * `INK` keeps every border, band and shadow it draws.
 */
const PAPER_TEXT = 'var(--everymen-paper-text)'
const CREAM = 'var(--everymen-cream)'
const RED = 'var(--everymen-red)'
const GOLD = 'var(--everymen-gold)'
const MUTED = 'var(--everymen-muted)'
const PAPER = 'var(--everymen-paper)'
const PAPER_DEEP = 'var(--everymen-paper-deep)'
/* Red as TEXT is a different job from red as a fill or a rule, and this page
   prints it on both of the family's tans (#1766). `RED` is 4.49:1 on the paper
   and 3.75:1 on the deep stock — under AA on each — so small type takes the
   sibling minted for the stock it actually lands on, and RED keeps every band,
   frame, rule and dingbat it has. Display-sized figures stay on RED too: at
   26px and 32px they owe the large-text 3:1 and clear it. */
const PAPER_ACCENT = 'var(--everymen-paper-accent)'
const DEEP_ACCENT = 'var(--everymen-deep-accent)'
const ACCENT_FONT = 'var(--font-accent)'
const BODY_FONT = 'var(--font-body)'

/** The task-faction mark on a dispatch row (#1711) — the square red slug it
 *  replaces was 10px, and the mark carries more line, so it takes 14. */
const ROW_SIGIL = 14

const kicker: CSSProperties = {
  fontFamily: BODY_FONT,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: MUTED,
}

/**
 * Characters / Edit as real controls (#1553) — a stamped union chit. They were
 * bare caps with no box: a sub-20px hit target on a phone. 44 is the WCAG 2.5.5
 * target floor and is GEOMETRY, not spacing.
 *
 * The chit fills with the DEEP stock, which is what made its label the tightest
 * red-on-tan pairing in the file — 3.75:1 (#1766), so it takes
 * `--everymen-deep-accent`. The size is NOT touched: `--text-lg` is the label
 * ramp's own 12px step, not a raw literal under the content floor, and whether
 * button chrome moves up a step is the ruling #1783 is asking for. Deciding it
 * here would fork that.
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

/** The baseline row under the track — the broadsheet's kicker voice. */
const trackMetaStyle: CSSProperties = {
  fontFamily: BODY_FONT,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: MUTED,
}

/** The union's own band — the section rule's red/gold run, at track scale. */
const TRACK_FILL = `repeating-linear-gradient(90deg, ${RED} 0 12px, ${GOLD} 12px 20px)`

/** Cream newsprint plate framed in union ink. */
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
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', fontFamily: BODY_FONT, color: PAPER_TEXT, background: PAPER }}
    >
      {/* Masthead billboard */}
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
          {/* "The Union Desk" (`fieldDesk.home.everymen.masthead`) was stamped
              on this band. It is the only desk with a second title slot — the
              h1 below already reads the shared `fieldDesk.home.title` — so
              #1911's collapse leaves nothing to put here: the shared string
              would have restated the heading four lines down. */}
        </div>
        <div style={{ height: 4, background: GOLD }} />
      </header>

      {/* ── The worker on the roll ── */}
      <Plate>
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

        {/* The one points figure, in the display face (#1553). */}
        <div className="flex items-baseline gap-2" style={{ marginTop: 'var(--space-lg)' }}>
          <span style={{ fontFamily: ACCENT_FONT, fontSize: 'var(--text-heading)', lineHeight: 0.9, color: RED }}>
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

      {/* ── The pending row, in all three of its states (#1554) ── */}
      {pendingRow && (
        <PendingRowPill
          row={pendingRow}
          className="flex items-center justify-between"
          style={{ background: PAPER, border: `1.5px solid ${INK}`, padding: 'var(--space-md) var(--space-lg)', fontFamily: ACCENT_FONT, fontSize: 'var(--text-content)', letterSpacing: '0.04em', color: PAPER_TEXT, textDecoration: 'none' }}
          chevron={<span aria-hidden style={{ color: RED }}>›</span>}
        />
      )}

      {/* ── On the job ── */}
      <Plate>
        <SectionHead
          title={t('fieldDesk.home.questsHeading')}
          trailing={
            // 11px on the Plate's PAPER, so #1341's paper-stock sibling and not
            // the bare red, which is 4.49 / 4.16 there.
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
                {/* The TASK's faction, not the shop's own red (#1711). The kicker
                    line below says the faction in words, so the mark is decorative. */}
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

      {/* ── Primary actions: both land on an already-narrowed view (#1554) ── */}
      <div className="flex gap-2.5">
        <Link
          to={FIND_TASK_LINK}
          className="flex-1 flex items-center justify-center"
          style={{ fontFamily: ACCENT_FONT, fontSize: 'var(--text-xl)', letterSpacing: '0.08em', padding: 'var(--space-lg)', color: CREAM, background: RED, border: `2px solid ${INK}`, textDecoration: 'none' }}
        >
          {t('fieldDesk.home.findTask')}
        </Link>
        <Link
          to={CAST_VOTES_LINK}
          className="flex-1 flex items-center justify-center"
          style={{ fontFamily: ACCENT_FONT, fontSize: 'var(--text-xl)', letterSpacing: '0.08em', padding: 'var(--space-lg)', color: PAPER_TEXT, background: PAPER_DEEP, border: `2px solid ${INK}`, textDecoration: 'none' }}
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
