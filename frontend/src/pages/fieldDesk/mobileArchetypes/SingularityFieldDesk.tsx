import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CharacterSwitcherSheet from '../../../components/CharacterSwitcherSheet'
import FactionSigil from '../../../components/sigil/FactionSigil'
import { factionName } from '../../../utils/factions'
import { factionRoleVars } from '../../../utils/factionRoles'
import { mediaUrl } from '../../../utils/media'
import { formatPoints } from '../../../utils/points'
import { praxisModeLabel } from '../../../utils/praxis'
import type { FieldDeskHomeState } from '../useFieldDeskHome'
import PendingRowPill from '../PendingRowPill'
import { CAST_VOTES_LINK, FIND_TASK_LINK } from '../homeDestinations'

/**
 * Singularity MOBILE FieldDesk home (#526) — the dark terminal on a phone. The
 * carried life and its running functions become bracketed readout panels on a
 * void field: a prompt-headed masthead, corner-bracketed node panel with signal
 * stat cells, an active-functions list, and prompt-styled actions. Same content
 * slots as the Default mobile home (the identity block — name, level, era
 * points and the level track — active-tasks list, primary actions) — only the
 * dress changes.
 *
 * Singularity is ALWAYS DARK: every colour resolves to a --faction-singularity-*
 * token that reads identically in both themes, so the skin paints its own void
 * container and never mutates data-theme. Presentation-only — all data arrives
 * via {@link FieldDeskHomeState}.
 */

// Three ROLES (#2675), declared as `--sg-desk-*` on the void container below
// and read here behind today's tokens. The desk is the one surface in this kit
// that is arguably app furniture rather than a sheet, but it takes the `sheet`
// ground all the same: `chrome` is the rail's, and this faction supplies no
// override on either — see the PR, where the question is raised rather than
// assumed.
const VOID = 'var(--sg-desk-paper)'
const PHOSPHOR = 'var(--sg-desk-accent)'
const SIGNAL = 'var(--sg-desk-quiet)'
const BORDER_HARD = 'var(--faction-singularity-border-hard)'
// The credits accent: a GOLD SCALAR, not a rainbow. It read the retired brand
// palette's first stop until #1220 (ADR-0066) pointed it at na's
// --faction-default-gold, and #1766 gave it the --faction-singularity-* token
// this comment always said it would eventually want. Nothing renders
// differently — the new token carries exactly what the alias resolved to in
// each cascade (6.63:1 by day, 10.59:1 by night, on the terminal black). What
// forced the split is that na's gold is a caption ink on a WHITE score plate
// and this ground is near-black in BOTH themes, so no one value serves both.
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

/**
 * Characters / Edit as real controls (#1553) — a bracketed readout key. They
 * were bare caps with no box: a sub-20px hit target on a phone. 44 is the WCAG
 * 2.5.5 target floor and is GEOMETRY, not spacing.
 */
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

/** The baseline row under the track — the terminal's signal voice. */
const trackMetaStyle: CSSProperties = {
  fontFamily: FONT,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: signal(60),
}

/** The node's own ramp: signal blue climbing into phosphor (#1553). */
const TRACK_FILL = `linear-gradient(90deg, ${signal(85)}, ${PHOSPHOR})`

/** The task-faction mark on a readout row (#1711) — the caret it replaces was
 *  set at 13px, and the mark holds the same line. */
const ROW_SIGIL = 13

/** Void readout panel with a signal-blue hairline and corner brackets. */
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
      style={{ ...factionRoleVars('singularity', 'sg-desk'), display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', fontFamily: FONT, color: PHOSPHOR, background: VOID }}
    >
      {/* Prompt masthead */}
      <header>
        <div style={{ height: 1, marginTop: 'var(--space-md)', background: `linear-gradient(90deg, ${BORDER_HARD}, transparent)` }} />
      </header>

      {/* ── Node panel ── */}
      <Panel>
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

        {/* The one points figure, in the display face (#1553). */}
        <div className="flex items-baseline gap-2" style={{ marginTop: 'var(--space-lg)' }}>
          <span style={{ fontFamily: FONT, fontSize: 'var(--text-heading)', lineHeight: 1, color: PHOSPHOR }}>
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
      </Panel>

      {/* ── The pending row, in all three of its states (#1554) ── */}
      {pendingRow && (
        <PendingRowPill
          row={pendingRow}
          className="flex items-center justify-between"
          style={{ background: VOID, border: `1px solid ${signal(42)}`, padding: 'var(--space-md) var(--space-lg)', fontFamily: FONT, fontSize: 'var(--text-content)', color: PHOSPHOR, textDecoration: 'none' }}
          chevron={<span aria-hidden style={{ color: SIGNAL }}>›</span>}
        />
      )}

      {/* ── Running functions ── */}
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
                {/* The row's lead slot carries the TASK's faction (#1711). It
                    held a prompt caret in the terminal's own phosphor, the same
                    glyph for every task alike; the slot takes one mark, so the
                    faction's is the one that says something. The terminal reads
                    on regardless — SingularitySigil IS a prompt caret with its
                    cursor block, so a singularity task's row is unchanged. The
                    line under the title names the faction: decorative. */}
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

      {/* ── Primary actions: both land on an already-narrowed view (#1554) ── */}
      <div className="flex gap-2.5">
        <Link
          to={FIND_TASK_LINK}
          className="flex-1 flex items-center justify-center"
          style={{ fontFamily: FONT, fontSize: 'var(--text-lg)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: 'var(--space-lg)', color: VOID, background: PHOSPHOR, border: `1px solid ${PHOSPHOR}`, boxShadow: `0 0 16px ${phosphor(30)}`, textDecoration: 'none' }}
        >
          {t('fieldDesk.home.findTask')}
        </Link>
        <Link
          to={CAST_VOTES_LINK}
          className="flex-1 flex items-center justify-center"
          style={{ fontFamily: FONT, fontSize: 'var(--text-lg)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: 'var(--space-lg)', color: PHOSPHOR, background: 'transparent', border: `1px solid ${signal(40)}`, textDecoration: 'none' }}
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
