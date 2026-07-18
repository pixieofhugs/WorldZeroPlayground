import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { CharacterOut } from '../../../api/auth'
import { useAuth } from '../../../auth/AuthContext'
import {
  FACTION_RAINBOW_ORDER,
  factionCssVar,
  factionName,
  sortFactionsByRainbowOrder,
} from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import { badgeArtFor } from '../../../components/badges/badgeArt'
import LevelPill from '../../../components/ui/LevelPill'
import { ChipRow, Chip } from '../../../components/ui/ChipRow'
import Constellation, { type RankedPlayer } from '../Constellation'

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
  const legend =
    scoreMode === 'era'
      ? t('leaderboard.desktop.legendEra')
      : t('leaderboard.desktop.legendAllTime')

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

          <SkyCanvas players={ranked} maxScore={maxScore} myCharId={myCharId} />

          <p className="content-text mt-3" style={{ color: 'var(--color-text-secondary)' }}>
            {legend}
          </p>

          {/* ── Full roster ── */}
          <Roster players={ranked} myCharId={myCharId} />
        </>
      )}
    </div>
  )
}

/**
 * Measures its own width so the Constellation's spiral radius is derived from
 * the real phone-column width rather than a magic constant — 6 labelled orbs on
 * a ~360px canvas is tight, so equal offsets must be equal px (epic #654 §1).
 * The stage is drawn slightly taller than wide so `min(w, h)` — the radius
 * basis inside Constellation — tracks the measured width.
 */
function SkyCanvas({
  players,
  maxScore,
  myCharId,
}: {
  players: RankedPlayer[]
  maxScore: number
  myCharId: number | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setWidth(element.clientWidth)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ minHeight: 320 }}>
      {width > 0 && (
        <Constellation
          players={players}
          maxScore={maxScore}
          myCharId={myCharId}
          population={SKY_POPULATION}
          stageWidth={width}
          stageHeight={Math.round(width * 1.08)}
        />
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
    <section className="mt-8">
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
        {factionChips.map(({ slug }) => (
          <Chip
            key={slug}
            on={faction === slug}
            onClick={() => {
              setFaction(faction === slug ? '' : slug)
              resetPaging()
            }}
            tint={factionCssVar(slug === UNAFFILIATED ? null : slug)}
          >
            {factionName(slug === UNAFFILIATED ? null : slug)}
          </Chip>
        ))}
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
  const color = factionCssVar(character.faction_slug)
  const badges = character.badges ?? []

  return (
    <Link
      to={`/characters/${character.id}`}
      className="sidebar-card flex items-center"
      style={{
        gap: 'var(--space-md)',
        padding: 'var(--space-sm) var(--space-md)',
        borderLeft: `4px solid ${color}`,
        textDecoration: 'none',
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

      {/* Avatar */}
      {character.avatar_url ? (
        <img
          src={mediaUrl(character.avatar_url)}
          alt=""
          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flex: 'none' }}
        />
      ) : (
        <span
          aria-hidden
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            flex: 'none',
            background: `linear-gradient(135deg, ${factionCssVar(character.faction_slug, 'light')}, ${color})`,
          }}
        />
      )}

      {/* Name + faction · level · badges */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="font-display italic truncate"
          style={{
            fontSize: 'var(--text-content)',
            color: isMe ? color : 'var(--color-text-primary)',
            lineHeight: 1.15,
          }}
        >
          {character.display_name}
        </div>
        <div className="flex items-center flex-wrap mt-1" style={{ gap: 'var(--space-xs)' }}>
          <span className="eyebrow">{factionName(character.faction_slug)}</span>
          <LevelPill level={character.level} factionSlug={character.faction_slug} />
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
          className="font-body"
          style={{ fontSize: 'var(--text-content)', fontWeight: 700, color: 'var(--color-text-primary)' }}
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
