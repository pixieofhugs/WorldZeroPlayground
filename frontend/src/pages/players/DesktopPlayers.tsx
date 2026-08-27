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

/** Row geometry, straight from the design. Ornament dimensions, not spacing. */
const PODIUM_COLUMNS = '1.12fr 1fr 1fr'
const RACE_COLUMNS = '26px 26px 1fr 1fr 108px'
/**
 * Rank · Player · Faction · Lvl · Pts. The faction column is #2245's — it was
 * a word inside the player column until the owner ruled it a column of its own
 * — and it takes the LEVEL column's width so the two marks it stands beside,
 * the sigil and the gem, are centred on the same rhythm.
 */
const ROSTER_COLUMNS = '56px 1fr 84px 84px 90px'
/**
 * The roster's faction mark, at the level gem's own size — the ruling asks for
 * "a larger more clickable sigil, size similar with the level diamond", and the
 * gem in this row is 34.
 */
const ROSTER_SIGIL = 34
const RACE_STAGGER_MS = 90
/**
 * The rank ring a SPECTRUM slug wears (#2730) — `factionFill`'s `"frame"` shape
 * cut for a circle. The conic ramp sits on the border box; na's card paper
 * covers the padding box, because a gradient border over a see-through interior
 * shows the ramp straight through the middle (#794); and the numeral takes that
 * paper's own paired ink, the one pairing guaranteed AA on it.
 *
 * Stated here rather than in `playersData.ts` — that file is what the page
 * COMPUTES, and this is dress. `MobilePlayers` restates it beside its own
 * geometry, as it already restates the wash and the ring it replaces;
 * `podiumSpectrumLead.test.tsx` asserts every case against BOTH views, which is
 * the guard that the two do not drift again.
 */
const SPECTRUM_RANK_RING: CSSProperties = {
  border: '2px solid transparent',
  background:
    'linear-gradient(var(--faction-default-card-bg), var(--faction-default-card-bg)) padding-box, var(--faction-default-rainbow-conic) border-box',
  color: 'var(--faction-default-card-text)',
}
/** Decorative marks. Expressions, so they are not user-facing copy. */
const ELLIPSIS_GLYPH = '⋮'

/**
 * The Players page on desktop (#1855) — podium, faction race, roster.
 *
 * This replaced the Constellation (#656/#684), a night-sky scatter plot that
 * encoded rank as orbital radius and score as orb size. It is deleted, not
 * hidden: nothing else in the app reads `--sky-*` now.
 *
 * Deviations from the design, so the next editor does not "restore" them:
 *
 *   - **The eyebrow reads the era config**, never the design's literal "Era
 *     Three" (CLAUDE.md: never hardcode a value that lives in `EraConfig`).
 *   - **`PageTitle` draws the header**, so the title carries the per-letter
 *     spectrum underline every other page has and the design's separate 140px
 *     rainbow rule is NOT drawn. #1699 removed exactly that second rule from
 *     this page; drawing it again is the regression, not the fidelity.
 *   - **Eight lanes in the race, and `na` is still not one of them.** This read
 *     "seven lanes, not eight" until #2409: the design's eighth row was ruled a
 *     deviation to be dropped in #1855, and ADR-0082 reverses that ruling. The
 *     eighth lane is Albescent, reading `[REDACTED]` until the viewer is
 *     revealed. `na` is unchanged and still gets no lane — it is a state rather
 *     than a faction, and the two exclusions were never the same one. See
 *     `factionStandings`.
 *   - **The whole roster row navigates to the player.** The design draws no
 *     link; the roster has linked to the public profile since #517 and losing
 *     that is a regression. Since #1953 the row is a `<div>` with a stretched
 *     overlay rather than one big `<Link>`, so the faction line inside it can
 *     be its own link without nesting anchors — see `RosterRow`.
 *   - **The podium's latest-praxis title takes `--text-content`**, not the
 *     design's 14px: a task title is prose that can run to any length, and the
 *     content-text floor governs those (WORLD_ZERO_STYLE §4, #627).
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

      {/* ── Out in front ── */}
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

      {/* ── Faction points ── */}
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

      {/* ── Players ── */}
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
                  <RosterRow key={row.character.id} row={row} isMe={row.character.id === myCharId} />
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

                {view.pinned && <RosterRow row={view.pinned} isMe />}

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
 * One podium card. The leader's is larger throughout and carries a diagonal
 * faction-tinted wash; the other two step down and have none.
 *
 * ### The two SPECTRUM slugs are dressed, not skipped (#2730, ADR-0088 §2)
 *
 * THIS REVERSES WHAT THIS DOCBLOCK USED TO CLAIM, and the claim is why the bug
 * survived a year of readers. It said the wash was "skipped for an unaffiliated
 * leader rather than faked" because `color-mix()` cannot take a gradient — true
 * — and then that "the rank ring, the avatar and the points numeral already
 * carry the spectrum for that card". Only the numeral did (`.rainbow-ink`). The
 * ring read `factionCssVar(slug)`, which for CSS key `default` is the flat grey
 * `--faction-default`, so the two slugs whose identity IS the spectrum got the
 * greyest card on the page — and the top player on the live leaderboard is one
 * of them.
 *
 * `known` therefore decides which DRESS, never whether there is one:
 *
 *   - a themed faction keeps every byte it had — a 1px hairline in its own hue
 *     with a 14% bloom, and a `color-mix` wash on the leader.
 *   - a spectrum slug takes the spectrum in each of those two places. The ring
 *     is `--faction-default-rainbow-conic` on the border box over an opaque
 *     `--faction-default-card-bg` interior — `factionFill`'s `"frame"` shape
 *     exactly, minus its 90deg cut, because this is a CIRCLE and a linear ramp
 *     bent round one reads as mud (the reason `DefaultSigil` and the avatar's
 *     own ring both take the conic, #1127). The wash is `.spectrum-wash`, which
 *     fades the ramp with a mask because nothing inline can.
 *
 * `CSS_KEY.albescent` STAYS `"default"` (ADR-0088), so an Albescent leader
 * reaches all of the above through `na`'s row and this file names no
 * `--faction-albescent-*` token. What tells the two apart for a revealed viewer
 * is the labyrinth on the avatar's badge, which `AlbescentAvatar` already draws
 * behind `isFactionRedacted()` (#2731) — one mark per card, gated once, in the
 * component that owns the disc. A second labyrinth in this file would be the
 * restatement #2245 deleted the faction WORD for. An unrevealed viewer's card
 * is byte-identical to `na`'s; `podiumSpectrumLead.test.tsx` holds both halves.
 *
 * THE RING'S INTERIOR IS OPAQUE for a spectrum slug, and that is the one thing
 * the hairline version did not have to decide. A gradient border needs a fill
 * on the padding box or the ramp shows straight through the middle behind the
 * numeral (`factionFill`'s docblock, #794), so the numeral sits on na's card
 * paper and takes that paper's paired ink rather than the card's — the one
 * pairing in the palette that is guaranteed AA on it. The rank ring is also the
 * only mark here that is per-CARD rather than per-leader: cards two and three
 * carried the same grey and are dressed the same way.
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
        // A themed leader's wash is a `color-mix` of its one hue; a spectrum
        // leader's is the ramp itself, faded by a mask no inline style can
        // write — see `.spectrum-wash` in index.css.
        background:
          lead && known
            ? `linear-gradient(170deg, color-mix(in oklab, ${color} 10%, transparent), transparent 68%)`
            : undefined,
        color: 'var(--color-text-primary)',
        textDecoration: 'none',
      }}
    >
      <div className="flex items-center justify-between" style={{ gap: 'var(--space-md)' }}>
        {/* The ring, its bloom and the wash carry the faction; the NUMERAL does
            not (#1932). A spine hue is a fill colour — `--faction-wow` is 1.96:1
            on this page and 2.09:1 on the frost, and the lead's 24px does not
            rescue it at the 3:1 large-text floor either. The numeral inherits
            `--color-text-primary` from the card.

            THE SPECTRUM SLUGS TAKE THE OTHER RING (#2730). `color` is the flat
            `--faction-default` grey for both of them, and a hairline plus a 14%
            bloom of it is what made the leaderboard's top card the greyest one
            on the page. The bloom does not survive the swap — a `box-shadow`
            spread takes a colour and the ramp is not one — so the ring is 2px
            where the hairline was 1, which is also the stroke the avatar's own
            spectrum ring beside it wears. The numeral goes with the interior:
            see `SPECTRUM_RANK_RING`. */}
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
        {/* The faction NAME is not drawn on the podium — the tint, the avatar
            ring and the sigil on it already say which one. Nor is the faction
            HUE (#1932): this is the label tier, whose ink is the `--label-ink`
            seam, and an inline colour paints over that seam. */}
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
        {/* The design sets this 8px; the label tier's floor is --text-md
            (#1608/#1783), and .label-heading is exactly this mark: a tracked
            uppercase unit beside a number. */}
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
          {/* Content floor, not the design's 14px: a task title is prose that
              can run to any length (WORLD_ZERO_STYLE §4). */}
          <span className="font-display content-text" style={{ lineHeight: 1.35 }}>
            {recent.taskTitle}
          </span>
        </div>
      )}
    </Link>
  )
}

/** One lane of the faction race: rank, sigil, name, bar, points + share. */
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
      {/* THE MARK IS INKED BY THE LANE (#2723). Passing nothing left each mark
          on its own component default, and on this neutral page that is a
          different failure per faction: the Ephemerists kite fell through to
          `currentColor` and drew in the PAGE's text ink — white after dark,
          which is the report — while S.N.I.D.E.'s acid and WOW's plum surface
          are declared once and so carry no dark half at all. The lane's own bar
          reads `factionCssVar(lane.slug)` twelve lines below; the mark reads it
          too, so the two are one colour and both cascade halves arrive free.
          NOT `--faction-{key}-metal-*`: those are theme-invariant by design and
          the brass measures 1.69:1 here in light. The `isKnownFaction` guard is
          the filter facet's (#2528) — `na` and `albescent` both map to CSS key
          `default`, and handing them that flat grey would paint over the two
          spectra they own. */}
      <FactionSigil
        slug={lane.slug}
        size={22}
        color={isKnownFaction(lane.slug) ? factionCssVar(lane.slug) : undefined}
      />
      {/* The lane's name opens its faction page (#1953). A race row is a plain
          div — it links to nothing else — so this is one anchor, not the
          nested-anchor case `RosterRow` below has to work around. `factionHref`
          still gates it: see its docblock for why a lane can never be `na` or a
          masked Albescent and why it is asked anyway. */}
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
              // The stagger is per-row data, so it rides in as a custom
              // property — the animation itself is a class, gated on
              // reduced-motion in index.css, never an inline `animation:`.
              '--wz-fill-delay': `${delayMs}ms`,
            } as CSSProperties
          }
        />
      </span>
      <span className="flex items-baseline justify-end" style={{ gap: 'var(--space-xs)' }}>
        <span className="font-display rainbow-ink" style={{ fontSize: 'var(--text-title)', lineHeight: 1 }}>
          {Math.round(lane.points)}
        </span>
        {/* A small FACT about the number beside it — caption tier (#1307). */}
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
 * `<a>` is blockified as a grid item and Tailwind's preflight gives it `color:
 * inherit; text-decoration: inherit`, so it renders identically to the `<span>`
 * it replaces. Whether a linked faction name should grow a hover affordance of
 * its own is a style question, deliberately not answered here.
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
  const className = `font-display${redacted ? ' redacted' : ''}`
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
 * The roster's faction COLUMN (#2245), and the row's second link.
 *
 * Owner ruling: "Have a column for faction as opposed to putting it on top of
 * their profile pic (you can use a larger more clickable sigil, size similar
 * with the level diamond) and link that sigil to the faction page." So three
 * things happen at once, and none of them survives on its own:
 *
 *   - the mark moves off the profile picture. `FactionAvatar` takes
 *     `badge={false}` in the row above for exactly this mount; every other
 *     avatar on the page, the podium's included, still wears its badge.
 *   - the WORD goes from the name stack. That is #2245's ruling 1: the sigil
 *     carries membership, and the word beside it was the restatement. The race
 *     lanes keep theirs — a lane is a surface ABOUT the society, where naming
 *     it is the content (ADR-0082 §2).
 *   - the mark inherits the word's LINK (#1953). Deleting the word would
 *     otherwise delete the only route from a roster row to a faction page.
 *
 * THE LABEL IS THE PART THAT IS EASY TO DROP. #2245's ruling 2 keeps every
 * faction glyph `aria-hidden`, and each of the nine sigils says so in its own
 * file — on the reasoning that the faction is spelled out in text beside it.
 * Here it is not, so the anchor has to carry the name itself or the roster
 * hands a screen reader a link that announces nothing. `factionName()` supplies
 * it, which keeps the Albescent mask intact (#1926): an unrevealed viewer is
 * told "Unaffiliated", exactly what the visible word told them before.
 *
 * LIFTED ABOVE THE ROW'S OVERLAY, for the reason the word was — see `RosterRow`
 * below. The anchor fills its cell rather than hugging the 34px mark, which is
 * the "more clickable" half of the ruling; the row-wide target stays the
 * player's.
 *
 * AND IT IS ONLY A LINK WHEN `factionHref` SAYS SO. Unaffiliated has no page,
 * and an unrevealed viewer must not be handed `/factions/albescent`. Unlinked,
 * it is a labelled image — not a focusable control that goes nowhere.
 */
function RosterFaction({ slug }: { slug: string | null | undefined }) {
  const href = factionHref(slug)
  const label = factionName(slug)
  // Inked by the row's faction, for the reason the race lane above is (#2723):
  // a mark on this neutral page that takes its component's default takes either
  // the page's own text ink or a token with one cascade half. Same
  // `isKnownFaction` guard, and here it is the load-bearing one — the roster is
  // the surface where `na` and `albescent` actually appear.
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
 * One roster row. The whole row still navigates to the player — the design
 * draws no link at all and that is a bug — but the faction sigil in its own
 * column now opens that faction's page (#1953, moved there by #2245), and those
 * two facts cannot both be anchors nested one inside the other.
 *
 * So the row takes the shape #1893 settled for feed cards: the row's ROOT is a
 * plain positioned `<div>`, ONE anchor inside it (the player's name) carries a
 * stretched overlay that covers the row, and every other link is lifted above
 * that overlay with `position: relative; z-index: 1`. The overlay declares no
 * z-index of its own, so any positioned sibling that declares one paints — and
 * hit-tests — above it. The name anchor itself must NOT be positioned, or the
 * overlay collapses to the name's own box.
 *
 * `RosterFaction` above is the lifted link. It was the faction WORD under the
 * player's name until #2245 gave the faction a column; the gymnastics are
 * unchanged, only what is lifted moved.
 */
function RosterRow({ row, isMe }: { row: RankedPlayer; isMe: boolean }) {
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
      {/* Your row's edge is the spectrum, bled into the gutter — one mark for
          "this is you" that no faction hue has to be borrowed for. */}
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
        {/* No membership badge on this one disc: the faction column beside it
            draws the same mark at twice the size and links it (#2245). */}
        <span style={{ flex: 'none', lineHeight: 0 }}>
          <FactionAvatar character={character} size={34} badge={false} />
        </span>
        {/* The row's one anchor. NOT positioned — the overlay it carries has to
            cover the row's root, not this name. It was a stacked pair until
            #2245 took the faction word out from under it, so the column that
            stacked them is gone with it; `min-w-0` moves onto the name, which
            is what `truncate` needs from a flex item. */}
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
