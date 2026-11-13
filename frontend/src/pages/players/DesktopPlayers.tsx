import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageTitle from '../../components/ui/PageTitle'
import FactionAvatar from '../../components/avatar/FactionAvatar'
import FactionSigil from '../../components/sigil/FactionSigil'
import LevelGem from '../../components/ui/LevelGem'
import { REDACTED, factionCssVar, factionName, isFactionRedacted, isKnownFaction } from '../../utils/factions'
import { relativeTime } from '../../utils/dates'
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
  type FactionStanding,
  type LatestPraxisMap,
  type PlayersFilters,
  type PlayersViewProps,
  type RankedPlayer,
} from './playersData'

/** Row geometry from the design (ornament, not spacing). */
const PODIUM_COLUMNS = '1.12fr 1fr 1fr'
const RACE_COLUMNS = '26px 26px 1fr 1fr 108px'
/** Rank · Player · Faction · Lvl · Pts; faction column (#2245) matches level's width. */
const ROSTER_COLUMNS = '56px 1fr 84px 84px 90px'
/** Matches the row's 34px level gem (#2245 ruling). */
const ROSTER_SIGIL = 34
const RACE_STAGGER_MS = 90
/**
 * Rank ring for a spectrum slug (#2730): conic ramp on the border box over an
 * opaque na paper interior (else the ramp shows through, #794); numeral in that
 * paper's ink. `MobilePlayers` restates it; `podiumSpectrumLead.test.tsx` checks both.
 */
const SPECTRUM_RANK_RING: CSSProperties = {
  border: '2px solid transparent',
  background:
    'linear-gradient(var(--faction-default-card-bg), var(--faction-default-card-bg)) padding-box, var(--faction-default-rainbow-conic) border-box',
  color: 'var(--faction-default-card-text)',
}
const ELLIPSIS_GLYPH = '⋮'

/**
 * The Players page on desktop (#1855): podium, faction race, roster.
 *
 * Deliberate deviations from the design, do not "restore":
 *   - the eyebrow reads the era config, not the literal "Era Three";
 *   - `PageTitle` draws the header; no second rainbow rule (#1699);
 *   - eight race lanes incl. Albescent (ADR-0082), never `na` (a state);
 *   - the whole roster row links to the player (a stretched overlay, see `RosterRow`);
 *   - podium task titles take `--text-content` (content floor, WORLD_ZERO_STYLE §4).
 */
export default function DesktopPlayers({
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
  const [rosterOpen, setRosterOpen] = useState(true)

  const podium = ranked.slice(0, PODIUM_SIZE)
  const standings = useMemo(() => factionStandings(ranked), [ranked])
  const roster = useMemo(
    () => selectRoster(ranked, filters, related),
    [ranked, filters, related],
  )
  const view = rosterView(roster, visible, myCharId)

  return (
    <div className="py-8">
      <div className="flex items-end justify-between" style={{ gap: 'var(--space-lg)' }}>
        <PageTitle title={t('leaderboard.title')} eyebrow={eyebrow} />
        <ScoreToggle mode={scoreMode} onChange={onScoreMode} fontSize="var(--text-base)" />
      </div>

      <div
        className="grid items-stretch"
        style={{
          gridTemplateColumns: PODIUM_COLUMNS,
          borderTop: '1px solid var(--color-border-strong)',
          borderBottom: '1px solid var(--color-border-strong)',
        }}
      >
        {podium.map((row, index) => (
          <PodiumCard key={row.character.id} row={row} lead={index === 0} latest={latest} />
        ))}
      </div>

      <section style={{ marginTop: 'var(--space-3xl)' }}>
        <SectionHeading
          title={t('leaderboard.race.heading')}
          open={raceOpen}
          onToggle={() => setRaceOpen(!raceOpen)}
          fontSize="var(--text-title)"
          toggleLabel={t('leaderboard.race.heading')}
        />
        {raceOpen && (
          <div className="flex flex-col" style={{ marginTop: 'var(--space-lg)' }}>
            {standings.map((lane, index) => (
              <RaceRow key={lane.slug} lane={lane} rank={index + 1} delayMs={index * RACE_STAGGER_MS} />
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 'var(--space-3xl)' }}>
        <SectionHeading
          title={t('leaderboard.roster.heading')}
          meta={<span className="label-heading">{t('leaderboard.playersCount', { count: view.total })}</span>}
          open={rosterOpen}
          onToggle={() => setRosterOpen(!rosterOpen)}
          fontSize="var(--text-title)"
          toggleLabel={t('leaderboard.roster.heading')}
        />

        {rosterOpen && (
          <>
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <PlayersFilterBar
                filters={filters}
                onChange={(next) => {
                  setFilters(next)
                  setVisible(ROSTER_PAGE_STEP)
                }}
                showRelationshipRail={myCharId != null}
                showNearby={related.nearby != null}
              />
            </div>

            {view.total === 0 ? (
              <p className="font-body content-text text-muted" style={{ marginTop: 'var(--space-xl)' }}>
                {t('leaderboard.roster.empty')}
              </p>
            ) : (
              <>
                <div
                  className="grid items-center"
                  style={{
                    marginTop: 'var(--space-xl)',
                    gridTemplateColumns: ROSTER_COLUMNS,
                    gap: 'var(--space-lg)',
                    paddingBottom: 'var(--space-sm)',
                    borderBottom: '1px solid var(--color-border-strong)',
                  }}
                >
                  <span className="label-heading">{t('leaderboard.roster.colRank')}</span>
                  <span className="label-heading">{t('leaderboard.roster.colPlayer')}</span>
                  <span className="label-heading" style={{ textAlign: 'center' }}>
                    {t('leaderboard.roster.colFaction')}
                  </span>
                  <span className="label-heading" style={{ textAlign: 'center' }}>
                    {t('leaderboard.roster.colLevel')}
                  </span>
                  <span className="label-heading" style={{ textAlign: 'right' }}>
                    {t('leaderboard.roster.colPoints')}
                  </span>
                </div>

                {view.rows.map((row) => (
                  <RosterRow
                    key={row.character.id}
                    row={row}
                    isMe={row.character.id === myCharId}
                    showCode={filters.rail === 'nearby'}
                  />
                ))}

                {view.gap && (
                  <div
                    className="grid items-center"
                    style={{
                      gridTemplateColumns: ROSTER_COLUMNS,
                      gap: 'var(--space-lg)',
                      padding: 'var(--space-sm) 0',
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

                {view.pinned && <RosterRow row={view.pinned} isMe showCode={filters.rail === 'nearby'} />}

                {view.hasMore && (
                  <div className="flex items-center justify-end" style={{ paddingTop: 'var(--space-xl)' }}>
                    <button
                      type="button"
                      onClick={() => setVisible(visible + ROSTER_PAGE_STEP)}
                      className="font-body uppercase"
                      style={{
                        fontSize: 'var(--text-md)',
                        letterSpacing: '0.18em',
                        padding: 'var(--space-sm) var(--space-lg)',
                        borderRadius: 999,
                        border: '1px solid var(--color-border-strong)',
                        background: 'transparent',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {t('leaderboard.roster.loadMore')}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>
    </div>
  )
}

/**
 * One podium card; the leader's is larger with a faction-tinted wash.
 *
 * Spectrum slugs are dressed, not skipped (#2730, ADR-0088 §2): `known` picks the
 * dress. A themed faction gets a hairline + 14% bloom and a `color-mix` wash; a
 * spectrum slug gets `SPECTRUM_RANK_RING` (conic: a linear ramp bent round a
 * circle reads as mud, #1127) and `.spectrum-wash`. Albescent maps to `default`;
 * only `AlbescentAvatar`'s badge tells it apart (#2731), so no second mark here.
 */
function PodiumCard({
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
      className={lead && !known ? 'flex flex-col spectrum-wash' : 'flex flex-col'}
      style={{
        gap: lead ? 'var(--space-lg)' : 'var(--space-md)',
        padding: 'var(--space-xl)',
        borderLeft: lead ? undefined : '1px solid var(--color-border)',
        // Spectrum leaders get `.spectrum-wash` (a mask; inline cannot).
        background:
          lead && known
            ? `linear-gradient(170deg, color-mix(in oklab, ${color} 10%, transparent), transparent 68%)`
            : undefined,
        color: 'var(--color-text-primary)',
        textDecoration: 'none',
      }}
    >
      <div className="flex items-center justify-between" style={{ gap: 'var(--space-md)' }}>
        {/* The numeral never takes the faction hue (#1932): spine hues fail
            3:1 here. Spectrum slugs take `SPECTRUM_RANK_RING` (#2730), 2px
            since a box-shadow bloom cannot carry a ramp. */}
        <span
          className="font-display flex items-center justify-center"
          style={{
            width: lead ? 44 : 38,
            height: lead ? 44 : 38,
            borderRadius: '50%',
            ...(known
              ? {
                  border: `1px solid ${color}`,
                  boxShadow: `0 0 0 ${lead ? 5 : 4}px color-mix(in oklab, ${color} 14%, transparent)`,
                }
              : SPECTRUM_RANK_RING),
            fontSize: lead ? 'var(--text-title)' : 'var(--text-content)',
            flex: 'none',
          }}
        >
          {rank}
        </span>
        <FactionAvatar character={character} size={lead ? 54 : 42} />
      </div>

      <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
        <span
          className="font-display"
          style={{ fontSize: lead ? 'var(--text-title)' : 'var(--text-content)', lineHeight: 1.05 }}
        >
          {character.display_name}
        </span>
        {/* No faction name (the marks say it) or hue: label ink is the
            `--label-ink` seam (#1932). */}
        <span className="label-heading">
          {t('leaderboard.level', { level: character.level })}
        </span>
      </div>

      <div className="flex items-baseline" style={{ gap: 'var(--space-xs)' }}>
        <span
          className="font-display rainbow-ink"
          style={{ fontSize: lead ? 'var(--text-display)' : 'var(--text-heading)', lineHeight: 1 }}
        >
          {points}
        </span>
        {/* Label floor, not the design's 8px (#1608/#1783). */}
        <span className="label-heading">{t('leaderboard.points')}</span>
      </div>

      {recent && (
        <div
          className="flex flex-col"
          style={{
            marginTop: 'auto',
            gap: 'var(--space-xs)',
            paddingTop: 'var(--space-md)',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <span className="label-heading">
            {t('leaderboard.podium.latest', {
              ago: recent.submittedAt ? relativeTime(recent.submittedAt) : '',
            })}
          </span>
          <span className="font-display content-text" style={{ lineHeight: 1.35 }}>
            {recent.taskTitle}
          </span>
        </div>
      )}
    </Link>
  )
}

function RaceRow({
  lane,
  rank,
  delayMs,
}: {
  lane: FactionStanding
  rank: number
  delayMs: number
}) {
  const { t } = useTranslation('common')
  return (
    <div
      className="leaderboard-row grid items-center"
      style={{
        gridTemplateColumns: RACE_COLUMNS,
        gap: 'var(--space-lg)',
        padding: 'var(--space-md) 0',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <span style={{ fontSize: 'var(--text-md)', color: 'var(--color-text-tertiary)' }}>{rank}</span>
      {/* Inked by the lane's own hue, as its bar is (#2723): component defaults
          fail on this neutral page per faction. Not `-metal-*` (theme-invariant).
          `isKnownFaction` guard: `na`/`albescent` keep their spectra. */}
      <FactionSigil
        slug={lane.slug}
        size={22}
        color={isKnownFaction(lane.slug) ? factionCssVar(lane.slug) : undefined}
      />
      {/* Opens the faction page (#1953); gated by `factionHref`. */}
      <FactionLaneName slug={lane.slug} />
      <span
        aria-hidden
        style={{
          height: 7,
          borderRadius: 999,
          background: 'var(--color-border-strong)',
          overflow: 'hidden',
          display: 'block',
        }}
      >
        <span
          className="wz-race-fill"
          style={
            {
              display: 'block',
              width: `${lane.barPercent}%`,
              height: '100%',
              background: factionCssVar(lane.slug),
              transformOrigin: 'left',
              // Per-row stagger as a custom property; the animation is a class
              // gated on reduced-motion in index.css.
              '--wz-fill-delay': `${delayMs}ms`,
            } as CSSProperties
          }
        />
      </span>
      <span className="flex items-baseline justify-end" style={{ gap: 'var(--space-xs)' }}>
        <span className="font-display rainbow-ink" style={{ fontSize: 'var(--text-title)', lineHeight: 1 }}>
          {Math.round(lane.points)}
        </span>
        <span className="label-caption">
          {t('leaderboard.race.share', { share: Math.round(lane.sharePercent) })}
        </span>
      </span>
    </div>
  )
}

/**
 * A race lane's name, linked to its faction page (#1953).
 *
 * The Albescent lane reads `[REDACTED]` for an unrevealed viewer (ADR-0082 §2),
 * and `factionHref` gives no href (an href would leak the name). The mark is
 * asked for here, not by `factionName` ("Unaffiliated" for labels, #1891): a
 * lane is ABOUT the society, like the `/factions` tile.
 */
function FactionLaneName({ slug }: { slug: string }) {
  const href = factionHref(slug)
  const redacted = isFactionRedacted(slug)
  const style = { fontSize: 'var(--text-content)' }
  const className = redacted ? 'font-display redacted' : 'font-display'
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

/**
 * The roster's faction column and the row's second link (#2245 owner ruling):
 * the mark leaves the avatar (`badge={false}`), the faction word goes, and the
 * sigil inherits its link (#1953).
 *
 * The anchor must carry `aria-label` (sigils are `aria-hidden` and no text says
 * the faction here); `factionName()` keeps the Albescent mask (#1926). Lifted
 * above the row overlay (see `RosterRow`). Unlinked when `factionHref` is null:
 * a labelled image, not a dead control.
 */
function RosterFaction({ slug }: { slug: string | null | undefined }) {
  const href = factionHref(slug)
  const label = factionName(slug)
  // Inked as the race lane is (#2723); here `na`/`albescent` really appear.
  const mark = (
    <FactionSigil
      slug={slug}
      size={ROSTER_SIGIL}
      color={isKnownFaction(slug) ? factionCssVar(slug) : undefined}
    />
  )
  if (href === null) {
    return (
      <span role="img" aria-label={label} className="flex justify-center">
        {mark}
      </span>
    )
  }
  return (
    <Link to={href} aria-label={label} className="flex justify-center" style={{ position: 'relative', zIndex: 1 }}>
      {mark}
    </Link>
  )
}

/**
 * One roster row. Whole-row link to the player plus a faction link, without
 * nested anchors (#1893's feed-card shape): root is a positioned `<div>`; the
 * name anchor carries a stretched overlay and must NOT be positioned (or the
 * overlay shrinks to it); other links lift with `position: relative; z-index: 1`.
 */
function RosterRow({
  row,
  isMe,
  showCode = false,
}: {
  row: RankedPlayer
  isMe: boolean
  /** The Nearby view prints the player's airport code (#3247). */
  showCode?: boolean
}) {
  const { t } = useTranslation('common')
  const { character, rank, points } = row

  return (
    <div
      className={isMe ? 'grid items-center' : 'leaderboard-row grid items-center'}
      style={{
        position: 'relative',
        gridTemplateColumns: ROSTER_COLUMNS,
        gap: 'var(--space-lg)',
        padding: isMe ? 'var(--space-md) 0 var(--space-md) var(--space-md)' : 'var(--space-md) 0',
        marginLeft: isMe ? 'calc(-1 * var(--space-md))' : undefined,
        borderBottom: '1px solid var(--color-border)',
        background: isMe ? 'var(--color-bg-surface)' : undefined,
        color: 'var(--color-text-primary)',
      }}
    >
      {/* "This is you": a spectrum edge bled into the gutter. */}
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

      <div className="flex items-center min-w-0" style={{ gap: 'var(--space-md)' }}>
        {/* No badge: the faction column draws it (#2245). */}
        <span style={{ flex: 'none', lineHeight: 0 }}>
          <FactionAvatar character={character} size={34} badge={false} />
        </span>
        {/* The row's one anchor. NOT positioned (see `RosterRow`). */}
        <Link
          to={`/characters/${character.id}`}
          className="font-display truncate min-w-0"
          style={{ fontSize: 'var(--text-content)', color: 'inherit', textDecoration: 'none' }}
        >
          {character.display_name}
          {isMe && (
            <>
              {' '}
              <span className="label-heading">{t('leaderboard.roster.you')}</span>
            </>
          )}
          {showCode && (
            <>
              {' '}
              <span className="label-heading">{character.location}</span>
            </>
          )}
          <span aria-hidden style={{ position: 'absolute', inset: 0 }} />
        </Link>
      </div>

      <RosterFaction slug={character.faction_slug} />

      <span className="flex justify-center">
        <LevelGem level={character.level} factionSlug={character.faction_slug} size={34} />
      </span>

      <span
        className="font-display rainbow-ink"
        style={{ fontSize: 'var(--text-content)', textAlign: 'right' }}
      >
        {points}
      </span>
    </div>
  )
}
