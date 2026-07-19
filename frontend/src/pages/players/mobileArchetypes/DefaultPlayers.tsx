import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { CharacterOut } from '../../../api/auth'
import { useAuth } from '../../../auth/AuthContext'
import {
  FACTION_RAINBOW_ORDER,
  factionCssVar,
  factionName,
  isKnownFaction,
  sortFactionsByRainbowOrder,
} from '../../../utils/factions'
import { badgeArtFor } from '../../../components/badges/badgeArt'
import FactionAvatar from '../../../components/avatar/FactionAvatar'
import FactionSigil from '../../../components/cards/FactionSigil'
import LevelGem from '../../../components/ui/LevelGem'
import { ChipRow, Chip } from '../../../components/ui/ChipRow'
import { type RankedPlayer } from '../Constellation'
import SkyCanvas, { MOBILE_SKY_ASPECT } from '../SkyCanvas'
import SkyLegend from '../SkyLegend'

export interface PlayersDirectoryProps {
  characters: CharacterOut[]
  loading: boolean
  error: Error | null
  /** The viewer's own character id, pinned in the sky and highlighted in the roster. */
  myCharId: number | null
}

type ScoreMode = 'era' | 'alltime'

/** The sky shows the top few; mobile fits fewer labelled orbs than desktop's 12. */
const SKY_POPULATION = 6
/** "Load more players" reveals one more page of this many roster rows. */
const PAGE_STEP = 8

/** Unaffiliated players carry a null faction_slug; normalise to a stable chip
 *  key so the "All / <faction>" filter can include them. factionName(null)
 *  already resolves to the Unaffiliated copy. */
const UNAFFILIATED = 'na'
const slugKey = (slug: string | null): string => slug ?? UNAFFILIATED

/**
 * Default MOBILE players-directory skin (#657) — the desktop Constellation
 * (#656) brought to the phone. The sky is the *reused* `Constellation`
 * component at a smaller population (top 6 + you, pinned); the roster below is
 * a single-column stack of everyone with a "Load more players" pager instead
 * of desktop's numbered pages. The Era / All-Time toggle drives the whole page
 * — sky and roster share one `scoreMode` — mirroring desktop (epic #654 §6).
 *
 * Copy is shared with the desktop board: the sky's eyebrow/title/tagline/legend
 * reuse the `leaderboard.desktop.*` catalog keys (the reused Constellation
 * already pulls its own copy from there), so there is one voice, not two.
 */
export default function DefaultPlayers({ characters, loading, error, myCharId }: PlayersDirectoryProps) {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  const [scoreMode, setScoreMode] = useState<ScoreMode>('era')

  const pointsOf = (character: CharacterOut) =>
    scoreMode === 'era' ? character.score : character.all_time_score

  // Rank is the true global standing over everyone in the field (server already
  // returns score DESC, id ASC, so ties stay deterministic across renders).
  const ranked: RankedPlayer[] = useMemo(
    () =>
      [...characters]
        .sort((a, b) => pointsOf(b) - pointsOf(a))
        .map((character, index) => ({ character, rank: index + 1, points: pointsOf(character) })),
    [characters, scoreMode],
  )

  const maxScore = ranked.length > 0 ? ranked[0].points : 0
  const factionCount = new Set(
    characters.map((c) => c.faction_slug).filter((slug): slug is string => slug != null),
  ).size

  const eyebrow =
    scoreMode === 'era'
      ? t('leaderboard.desktop.eyebrowEra', { era: user?.era_name ?? '' })
      : t('leaderboard.desktop.eyebrowAllTime')
  const tagline =
    scoreMode === 'era'
      ? t('leaderboard.desktop.taglineEra')
      : t('leaderboard.desktop.taglineAllTime')

  return (
    <div className="py-4" data-testid="mobile-players-directory">
      {/* ── Sky header ── */}
      <p className="eyebrow mb-1">{eyebrow}</p>

      <h1
        className="font-display italic font-medium leading-tight mb-1"
        style={{ fontSize: 'var(--text-heading)', color: 'var(--color-text-primary)' }}
      >
        {t('leaderboard.desktop.title')}
      </h1>

      <p className="eyebrow mb-2">
        {t('leaderboard.desktop.playersCount', { count: characters.length })}
        {' · '}
        {t('leaderboard.desktop.factionsCount', { count: factionCount })}
      </p>

      {/* Era / All-Time toggle — drives the sky and the roster together. */}
      <ChipRow label={t('filters.sort')}>
        <Chip on={scoreMode === 'era'} onClick={() => setScoreMode('era')}>
          {t('leaderboard.mobile.sortEra')}
        </Chip>
        <Chip on={scoreMode === 'alltime'} onClick={() => setScoreMode('alltime')}>
          {t('leaderboard.mobile.sortAllTime')}
        </Chip>
      </ChipRow>

      {/* Rainbow rule — the faction spectrum, in canonical order. */}
      <div
        aria-hidden
        className="mt-3 mb-3"
        style={{
          height: 3,
          borderRadius: 2,
          background: `linear-gradient(90deg, ${FACTION_RAINBOW_ORDER.map((slug) =>
            factionCssVar(slug),
          ).join(', ')})`,
        }}
      />

      {loading ? (
        <p className="font-body content-text text-muted">{t('leaderboard.loading')}</p>
      ) : error ? (
        <p className="font-body content-text text-red-600 border-2 border-red-300 px-3 py-2">
          {t('leaderboard.mobile.loadError')}
        </p>
      ) : characters.length === 0 ? (
        <p className="font-body content-text text-muted">{t('leaderboard.mobile.empty')}</p>
      ) : (
        <>
          <p
            className="mb-3"
            style={{
              fontFamily: 'var(--font-faction-script)',
              fontSize: 'var(--text-title)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.2,
            }}
          >
            {tagline}
          </p>

          <SkyCanvas
            players={ranked}
            maxScore={maxScore}
            myCharId={myCharId}
            population={SKY_POPULATION}
            aspect={MOBILE_SKY_ASPECT}
          />

          <SkyLegend scoreMode={scoreMode} />

          {/* ── Full roster ── */}
          <Roster players={ranked} myCharId={myCharId} />
        </>
      )}
    </div>
  )
}

function Roster({ players, myCharId }: { players: RankedPlayer[]; myCharId: number | null }) {
  const { t } = useTranslation('common')
  const [query, setQuery] = useState('')
  const [faction, setFaction] = useState('')
  const [visible, setVisible] = useState(PAGE_STEP)

  // Distinct factions present, in canonical rainbow order, for the chip row.
  const factionChips = useMemo(() => {
    const present = Array.from(new Set(players.map((p) => slugKey(p.character.faction_slug))))
    return sortFactionsByRainbowOrder(present.map((slug) => ({ slug })))
  }, [players])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return players.filter((p) => {
      if (faction && slugKey(p.character.faction_slug) !== faction) return false
      if (!needle) return true
      return p.character.display_name.toLowerCase().includes(needle)
    })
  }, [players, query, faction])

  const shownRows = filtered.slice(0, visible)
  const hasMore = visible < filtered.length

  const resetPaging = () => setVisible(PAGE_STEP)

  return (
    // Every roster player may also be an orb in the sky above, so their profile
    // link appears twice on the page; the testid lets a test say which one it
    // means (#754).
    <section className="mt-8" data-testid="mobile-roster">
      <h2
        className="font-display italic content-title mb-3"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {t('leaderboard.desktop.roster.heading')}
      </h2>

      <input
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          resetPaging()
        }}
        placeholder={t('leaderboard.desktop.roster.searchPlaceholder')}
        className="font-body w-full mb-3"
        style={{
          fontSize: 'var(--text-md)',
          padding: 'var(--space-sm) var(--space-md)',
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-strong)',
          color: 'var(--color-text-primary)',
          borderRadius: 6,
        }}
      />

      <ChipRow label={t('filters.faction')}>
        <Chip
          on={faction === ''}
          onClick={() => {
            setFaction('')
            resetPaging()
          }}
        >
          {t('leaderboard.mobile.allFactions')}
        </Chip>
        {factionChips.map(({ slug }) => {
          // Scalar-only, so no isKnownFaction branch: Chip spends `tint` on a
          // border colour and a box-shadow ring, and a gradient is invalid in
          // both. The unaffiliated selection ring stays neutral by necessity —
          // the spectrum arrives on this chip through the FactionSigil glyph
          // below, which draws --faction-default-ring. factionCssVar already
          // maps `na` to --faction-default; see the isKnownFaction docblock in
          // utils/factions for why that is the design, not a fallback (#754).
          const ring = factionCssVar(slug)
          return (
            <Chip
              key={slug}
              iconOnly
              // The visible name is gone, so the label is the only name left.
              ariaLabel={factionName(slug === UNAFFILIATED ? null : slug)}
              on={faction === slug}
              onClick={() => {
                setFaction(faction === slug ? '' : slug)
                resetPaging()
              }}
              tint={ring}
            >
              {/* ponytail: FactionSigil already dispatches all seven plus the
                  unaffiliated rainbow ring, and each sigil defaults to its own
                  faction colour — so no wrapper and no `color` prop. */}
              <FactionSigil slug={slug === UNAFFILIATED ? null : slug} size={22} />
            </Chip>
          )
        })}
      </ChipRow>

      {filtered.length === 0 ? (
        <p className="font-body content-text text-muted mt-4">{t('leaderboard.mobile.empty')}</p>
      ) : (
        <>
          <div className="flex flex-col gap-2 mt-4">
            {shownRows.map((row) => (
              <PlayerRow key={row.character.id} row={row} isMe={row.character.id === myCharId} />
            ))}
          </div>

          <div className="flex flex-col items-center gap-3 mt-4">
            <span className="eyebrow">
              {t('leaderboard.mobile.showing', { shown: shownRows.length, total: filtered.length })}
            </span>
            {hasMore && (
              <button
                type="button"
                onClick={() => setVisible((current) => current + PAGE_STEP)}
                className="font-body uppercase w-full"
                style={{
                  fontSize: 'var(--text-base)',
                  letterSpacing: '0.1em',
                  padding: 'var(--space-md)',
                  border: '1px solid var(--color-border-strong)',
                  background: 'var(--color-bg-surface)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                {t('leaderboard.mobile.loadMore')}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function PlayerRow({ row, isMe }: { row: RankedPlayer; isMe: boolean }) {
  const { t } = useTranslation('common')
  const { character, rank, points } = row
  // `known` gates the one ornament that CAN carry the spectrum here: the points
  // numeral, which swaps to the .rainbow-ink gradient clip below (ADR-0039).
  // `color` is scalar-only — a 4px border-left and two text colours — so it has
  // no gradient branch to make; factionCssVar maps `na` to --faction-default by
  // itself. See the isKnownFaction docblock in utils/factions (#749/#754).
  const known = isKnownFaction(character.faction_slug)
  const color = factionCssVar(character.faction_slug)
  const badges = character.badges ?? []

  return (
    <Link
      to={`/characters/${character.id}`}
      className="sidebar-card flex items-center"
      style={{
        gap: 'var(--space-md)',
        padding: 'var(--space-sm) var(--space-md)',
        // ponytail: the 4px edge stays a flat colour rather than growing a
        // gradient case — it is 4px of paint, and the avatar ring plus the
        // points numeral already carry the spectrum for an unaffiliated row.
        borderLeft: `4px solid ${color}`,
        textDecoration: 'none',
        // Your own row's wash stays a flat tint for every slug: it sits behind
        // body text, and no single ink is legible across the spectrum (#649), so
        // factionFill has no wash shape to reach for. `na` resolves to
        // --faction-default-light on its own.
        background: isMe ? factionCssVar(character.faction_slug, 'light') : undefined,
      }}
    >
      {/* Rank */}
      <span
        className="font-display italic"
        style={{
          flex: 'none',
          minWidth: 22,
          textAlign: 'center',
          fontSize: 'var(--text-content)',
          fontWeight: 700,
          color: isMe ? color : 'var(--color-text-tertiary)',
        }}
      >
        {rank}
      </span>

      {/* Avatar — the shared component supplies the glowing faction ring, the
          corner sigil and the unaffiliated spectrum. No FactionSigil beside the
          name: the sigil is already on the avatar, inches away. */}
      <span style={{ flex: 'none', lineHeight: 0 }}>
        <FactionAvatar character={character} size={40} glow />
      </span>

      {/* Name + faction · level · badges */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="font-display italic truncate"
          style={{
            // White on every row including your own — faction colour is
            // ornament only; the tinted row background marks your row.
            fontSize: 'var(--text-content)',
            color: 'var(--color-text-primary)',
            lineHeight: 1.15,
          }}
        >
          {character.display_name}
        </div>
        <div className="flex items-center flex-wrap mt-1" style={{ gap: 'var(--space-xs)' }}>
          <span className="eyebrow">{factionName(character.faction_slug)}</span>
          <LevelGem level={character.level} factionSlug={character.faction_slug} size={34} />
          {badges.map((badge) => {
            const Art = badgeArtFor(badge.key)
            return (
              <span
                key={badge.key}
                title={badge.name}
                style={{ display: 'inline-flex', color: 'var(--color-text-secondary)' }}
              >
                <Art size={16} />
              </span>
            )
          })}
        </div>
      </div>

      {/* Points */}
      <div style={{ flex: 'none', textAlign: 'right' }}>
        <div
          className={known ? 'font-body' : 'font-body rainbow-ink'}
          style={{
            fontSize: 'var(--text-content)',
            fontWeight: 700,
            // .rainbow-ink sets its own transparent colour — don't hand it one.
            ...(known ? { color } : null),
          }}
        >
          {points}
        </div>
        <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>
          {t('leaderboard.mobile.points')}
        </span>
      </div>
    </Link>
  )
}
