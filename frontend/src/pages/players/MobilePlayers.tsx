import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../components/avatar/FactionAvatar'
import FactionSigil from '../../components/sigil/FactionSigil'
import LevelGem from '../../components/ui/LevelGem'
import { REDACTED, factionCssVar, factionName, isFactionRedacted, isKnownFaction } from '../../utils/factions'
import PlayersFilterBar from './PlayersFilterBar'
import ScoreToggle from './ScoreToggle'
import SectionHeading from './SectionHeading'
import {
  PLAYERS_FILTERS_DEFAULT,
  PODIUM_SIZE,
  ROSTER_PAGE_STEP,
  factionHref,
  factionStandings,
  rosterView,
  selectRoster,
  type LatestPraxisMap,
  type PlayersFilters,
  type PlayersViewProps,
  type RankedPlayer,
} from './playersData'

/** Row geometry, straight from the design. Ornament dimensions, not spacing. */
const PODIUM_COLUMNS = '34px 1fr auto'
const RACE_COLUMNS = '20px 1fr auto'
const ROSTER_COLUMNS = '26px 1fr 44px auto'
/** Lanes the race shows before the "N more factions" affordance. */
const RACE_PREVIEW = 4
const ELLIPSIS_GLYPH = '⋮'

/**
 * The Players page on the phone (#1855) — the same three sections, structurally
 * different, which is why this is a component rather than a breakpoint:
 *
 *   - the podium is three stacked ROWS, not three cards, and carries the task
 *     title but no timestamp;
 *   - the race has no bars, no percentages and no rank column — four lanes and
 *     a "N more factions" affordance;
 *   - the roster drops the column header and the faction line under each name.
 *
 * `FilterBar` is the exception and is shared: it is chrome, it folds itself
 * down on the phone, and it sits outside this seam.
 *
 * Everything the two form factors agree on — ranking, faction sums, the one
 * filter condition, the pin and its gap row — lives in `playersData`, so a rule
 * cannot drift between them.
 */
export default function MobilePlayers({
  ranked,
  scoreMode,
  onScoreMode,
  eyebrow,
  myCharId,
  related,
  latest,
}: PlayersViewProps) {
  const { t } = useTranslation('common')
  const [filters, setFilters] = useState<PlayersFilters>(PLAYERS_FILTERS_DEFAULT)
  const [visible, setVisible] = useState(ROSTER_PAGE_STEP)
  const [raceOpen, setRaceOpen] = useState(true)
  const [allLanes, setAllLanes] = useState(false)
  const [rosterOpen, setRosterOpen] = useState(true)

  const podium = ranked.slice(0, PODIUM_SIZE)
  const standings = useMemo(() => factionStandings(ranked), [ranked])
  const roster = useMemo(
    () => selectRoster(ranked, filters, related),
    [ranked, filters, related],
  )
  const view = rosterView(roster, visible, myCharId)
  const lanes = allLanes ? standings : standings.slice(0, RACE_PREVIEW)
  const hiddenLanes = standings.length - RACE_PREVIEW

  return (
    <div className="py-4" data-testid="mobile-players-directory">
      <p className="label-heading">{eyebrow}</p>
      <div className="flex items-end justify-between" style={{ marginTop: 'var(--space-xs)' }}>
        <h1
          className="font-display italic font-medium leading-tight"
          style={{ fontSize: 'var(--text-heading)', color: 'var(--color-text-primary)' }}
        >
          {t('leaderboard.title')}
        </h1>
        <ScoreToggle mode={scoreMode} onChange={onScoreMode} fontSize="var(--text-md)" />
      </div>
      {/* The phone has no per-letter PageTitle underline, so this rule is the
          page's only spectrum — not the second copy #1699 removed on desktop. */}
      <span
        aria-hidden
        style={{
          display: 'block',
          marginTop: 'var(--space-sm)',
          width: 100,
          height: 3,
          borderRadius: 2,
          background: 'var(--faction-default-rainbow)',
        }}
      />

      {/* ── Out in front ── */}
      <div style={{ marginTop: 'var(--space-lg)' }}>
        {podium.map((row, index) => (
          <PodiumRow key={row.character.id} row={row} lead={index === 0} latest={latest} />
        ))}
      </div>

      {/* ── Faction points ── */}
      <section style={{ marginTop: 'var(--space-xl)' }}>
        <SectionHeading
          title={t('leaderboard.race.heading')}
          open={raceOpen}
          onToggle={() => setRaceOpen(!raceOpen)}
          fontSize="var(--text-content)"
          toggleLabel={t('leaderboard.race.heading')}
        />
        {raceOpen && (
          <div className="flex flex-col" style={{ marginTop: 'var(--space-md)' }}>
            {lanes.map((lane) => (
              <div
                key={lane.slug}
                className="grid items-center"
                style={{
                  gridTemplateColumns: RACE_COLUMNS,
                  gap: 'var(--space-md)',
                  padding: 'var(--space-sm) 0',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                {/* The MOBILE twin of the desktop race lane, and the same
                    guard for the same reason (#2723): the mark takes the
                    lane's own hue, except for the two spectrum slugs, whose
                    CSS key is `default` and whose flat grey would paint over
                    the spectra they own. */}
                <FactionSigil
                  slug={lane.slug}
                  size={18}
                  color={isKnownFaction(lane.slug) ? factionCssVar(lane.slug) : undefined}
                />
                {/* The lane's name opens its faction page (#1953). A race row is
                    a plain div — it links to nothing else — so this is one
                    anchor, not the nested-anchor case the roster has on
                    desktop. `factionHref` still gates it, and since #2409 that
                    gate is load-bearing rather than belt-and-braces: Albescent
                    IS a lane now, so this is where an unrevealed viewer's row
                    loses its href. See that docblock. */}
                <FactionLaneName slug={lane.slug} />
                <span className="font-display rainbow-ink" style={{ fontSize: 'var(--text-content)' }}>
                  {Math.round(lane.points)}
                </span>
              </div>
            ))}
            {hiddenLanes > 0 && (
              <button
                type="button"
                onClick={() => setAllLanes(!allLanes)}
                className="font-body text-left"
                style={{
                  marginTop: 'var(--space-sm)',
                  padding: 0,
                  border: 'none',
                  background: 'none',
                  fontSize: 'var(--text-lg)',
                  color: 'var(--color-text-tertiary)',
                  cursor: 'pointer',
                }}
              >
                {allLanes
                  ? t('leaderboard.race.fewer')
                  : t('leaderboard.race.more', { count: hiddenLanes })}
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Players ── */}
      <section style={{ marginTop: 'var(--space-xl)' }}>
        <SectionHeading
          title={t('leaderboard.roster.heading')}
          meta={<span className="label-heading">{t('leaderboard.playersCount', { count: view.total })}</span>}
          open={rosterOpen}
          onToggle={() => setRosterOpen(!rosterOpen)}
          fontSize="var(--text-content)"
          toggleLabel={t('leaderboard.roster.heading')}
        />

        {rosterOpen && (
          <>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <PlayersFilterBar
                filters={filters}
                onChange={(next) => {
                  setFilters(next)
                  setVisible(ROSTER_PAGE_STEP)
                }}
                showRelationshipRail={myCharId != null}
              />
            </div>

            {view.total === 0 ? (
              <p className="font-body content-text text-muted" style={{ marginTop: 'var(--space-lg)' }}>
                {t('leaderboard.roster.empty')}
              </p>
            ) : (
              <div style={{ marginTop: 'var(--space-lg)' }}>
                {view.rows.map((row) => (
                  <RosterRow key={row.character.id} row={row} isMe={row.character.id === myCharId} />
                ))}

                {view.gap && (
                  <div
                    className="grid items-center"
                    style={{
                      gridTemplateColumns: RACE_COLUMNS,
                      gap: 'var(--space-md)',
                      padding: 'var(--space-xs) 0',
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    <span aria-hidden style={{ fontSize: 'var(--text-md)', letterSpacing: '0.2em' }}>
                      {ELLIPSIS_GLYPH}
                    </span>
                    <span className="label-heading">
                      {t('leaderboard.roster.gap', { from: view.gap.from, to: view.gap.to })}
                    </span>
                  </div>
                )}

                {view.pinned && <RosterRow row={view.pinned} isMe />}

                {view.hasMore && (
                  <button
                    type="button"
                    onClick={() => setVisible(visible + ROSTER_PAGE_STEP)}
                    className="font-body w-full text-left"
                    style={{
                      marginTop: 'var(--space-md)',
                      padding: 'var(--space-md) 0',
                      border: 'none',
                      background: 'none',
                      fontSize: 'var(--text-lg)',
                      color: 'var(--color-text-tertiary)',
                      cursor: 'pointer',
                    }}
                  >
                    {t('leaderboard.roster.loadMoreCount', { count: view.total - view.rows.length })}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

/**
 * A race lane's name, linked to its faction page (#1953).
 *
 * `<a>` is blockified as a grid item, so `truncate` still clips exactly as the
 * `<span>` it replaces did, and Tailwind's preflight (`color: inherit;
 * text-decoration: inherit`) leaves it looking identical. Whether a linked
 * faction name should grow a hover affordance of its own is a style question,
 * deliberately not answered here.
 *
 * THE EIGHTH LANE READS `[REDACTED]` (#2409, ADR-0082 §2). `.redacted` paints
 * the mark in the row's own colour, so an unrevealed viewer sees a lane with a
 * bar, a points count and a share — and a blank where the name goes, until they
 * drag a cursor across it. `factionHref` already answers null for that viewer,
 * so the link half is unreachable rather than merely unpainted; an href would
 * name the society in the markup, which is the leak the mark exists to prevent.
 *
 * THE MARK IS ASKED FOR HERE, not supplied by `factionName`. That function
 * still answers "Unaffiliated" for an unrevealed viewer, because a byline or a
 * task card is LABELLING a thing already on screen and a blank there advertises
 * the omission (#1891). This lane is one of exactly two surfaces that are ABOUT
 * the society and redact instead — the other is the `/factions` select tile.
 * The split is ruled, not an oversight; ADR-0082 §2 has the reasoning.
 */
function FactionLaneName({ slug }: { slug: string }) {
  const href = factionHref(slug)
  const redacted = isFactionRedacted(slug)
  const style = { fontSize: 'var(--text-content)' }
  const className = `font-display truncate${redacted ? ' redacted' : ''}`
  if (href === null) {
    return (
      <span className={className} style={style} data-redacted={redacted ? 'true' : undefined}>
        {redacted ? REDACTED : factionName(slug)}
      </span>
    )
  }
  return (
    <Link to={href} className={className} style={style} data-redacted={redacted ? 'true' : undefined}>
      {redacted ? REDACTED : factionName(slug)}
    </Link>
  )
}

/** One podium row: rank ring, avatar, name / level / what they last did, points. */
function PodiumRow({
  row,
  lead,
  latest,
}: {
  row: RankedPlayer
  lead: boolean
  latest: LatestPraxisMap
}) {
  const { t } = useTranslation('common')
  const { character, rank, points } = row
  const known = isKnownFaction(character.faction_slug)
  const color = factionCssVar(character.faction_slug)
  const recent = latest[character.id]

  return (
    <Link
      to={`/characters/${character.id}`}
      className="grid items-center"
      style={{
        gridTemplateColumns: PODIUM_COLUMNS,
        gap: 'var(--space-md)',
        padding: 'var(--space-md) 0',
        borderBottom: '1px solid var(--color-border)',
        // The leader's wash is skipped for an unaffiliated player rather than
        // faked: `na` has no scalar hue to color-mix (ADR-0039).
        background:
          lead && known
            ? `linear-gradient(90deg, color-mix(in oklab, ${color} 9%, transparent), transparent 62%)`
            : undefined,
        color: 'var(--color-text-primary)',
        textDecoration: 'none',
      }}
    >
      {/* Ring, bloom and wash carry the faction; the numeral inherits
          `--color-text-primary` from the row (#1932). This is the 18px/400
          "1" the nightly measured at 4.46:1 in UA's sienna — 18px regular is
          NOT WCAG large text, so 4.5:1 is the floor it owes. */}
      <span
        className="font-display flex items-center justify-center"
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: `1px solid ${color}`,
          boxShadow: `0 0 0 4px color-mix(in oklab, ${color} 14%, transparent)`,
          fontSize: 'var(--text-content)',
          flex: 'none',
        }}
      >
        {rank}
      </span>

      <span className="flex items-center min-w-0" style={{ gap: 'var(--space-md)' }}>
        <span style={{ flex: 'none', lineHeight: 0 }}>
          <FactionAvatar character={character} size={42} />
        </span>
        <span className="flex flex-col min-w-0" style={{ gap: 'var(--space-xs)' }}>
          <span className="font-display truncate" style={{ fontSize: 'var(--text-content)', lineHeight: 1.05 }}>
            {character.display_name}
          </span>
          {/* Label tier, so the ink is the `--label-ink` seam and not the
              faction hue (#1932) — see DesktopPlayers' twin. */}
          <span className="label-heading">
            {t('leaderboard.level', { level: character.level })}
          </span>
          {/* Content floor, not the design's 10px — a task title is prose that
              can run to any length (WORLD_ZERO_STYLE §4). No timestamp here:
              the phone's row has no width to spend on one. */}
          {recent && (
            <span className="font-body content-text truncate" style={{ color: 'var(--color-text-secondary)' }}>
              {recent.taskTitle}
            </span>
          )}
        </span>
      </span>

      <span className="font-display rainbow-ink" style={{ fontSize: 'var(--text-title)' }}>
        {points}
      </span>
    </Link>
  )
}

/** One roster row — no faction line: the avatar's ring and sigil carry it. */
function RosterRow({ row, isMe }: { row: RankedPlayer; isMe: boolean }) {
  const { t } = useTranslation('common')
  const { character, rank, points } = row

  return (
    <Link
      to={`/characters/${character.id}`}
      className={isMe ? 'grid items-center' : 'leaderboard-row grid items-center'}
      style={{
        position: 'relative',
        gridTemplateColumns: ROSTER_COLUMNS,
        gap: 'var(--space-md)',
        padding: isMe ? 'var(--space-md) 0 var(--space-md) var(--space-md)' : 'var(--space-md) 0',
        marginLeft: isMe ? 'calc(-1 * var(--space-md))' : undefined,
        borderBottom: '1px solid var(--color-border)',
        background: isMe ? 'var(--color-bg-surface)' : undefined,
        color: 'var(--color-text-primary)',
        textDecoration: 'none',
      }}
    >
      {isMe && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: 'var(--faction-default-rainbow)',
          }}
        />
      )}

      <span style={{ fontSize: 'var(--text-lg)', color: isMe ? undefined : 'var(--color-text-secondary)' }}>
        {rank}
      </span>

      <span className="flex items-center min-w-0" style={{ gap: 'var(--space-sm)' }}>
        <span style={{ flex: 'none', lineHeight: 0 }}>
          <FactionAvatar character={character} size={28} />
        </span>
        <span className="font-display truncate" style={{ fontSize: 'var(--text-content)' }}>
          {character.display_name}
          {isMe && (
            <>
              {' '}
              <span className="label-heading">{t('leaderboard.roster.you')}</span>
            </>
          )}
        </span>
      </span>

      <span className="flex justify-center">
        <LevelGem level={character.level} factionSlug={character.faction_slug} size={28} />
      </span>

      <span className="font-display rainbow-ink" style={{ fontSize: 'var(--text-content)' }}>
        {points}
      </span>
    </Link>
  )
}
