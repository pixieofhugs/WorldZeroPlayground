import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  factionCssVar,
  factionName,
  sortFactionsByRainbowOrder,
} from '../../utils/factions'
import { mediaUrl } from '../../utils/media'
import { badgeArtFor } from '../../components/badges/badgeArt'
import LevelPill from '../../components/ui/LevelPill'
import type { RankedPlayer } from './Constellation'

const PAGE_SIZE = 8

/** Unaffiliated players carry a null faction_slug; normalise to a stable chip
 *  key so the "All / <faction>" filter can include them. */
const UNAFFILIATED = 'na'
const slugKey = (slug: string | null): string => slug ?? UNAFFILIATED

interface RosterTableProps {
  /** Full ranked list, descending — rank is the player's true global standing. */
  players: RankedPlayer[]
  myCharId: number | null
}

export default function RosterTable({ players, myCharId }: RosterTableProps) {
  const { t } = useTranslation('common')
  const [query, setQuery] = useState('')
  const [faction, setFaction] = useState('')
  const [page, setPage] = useState(0)

  // Distinct factions present, in canonical rainbow order, for the chip row.
  const factionChips = useMemo(() => {
    const present = Array.from(
      new Set(players.map((p) => slugKey(p.character.faction_slug))),
    )
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

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const resetPage = () => setPage(0)

  return (
    <section className="mt-10">
      <h2
        className="font-display italic content-title mb-3"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {t('leaderboard.desktop.roster.heading')}
      </h2>

      {/* Search + faction chips */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            resetPage()
          }}
          placeholder={t('leaderboard.desktop.roster.searchPlaceholder')}
          className="font-body"
          style={{
            fontSize: 'var(--text-md)',
            padding: 'var(--space-sm) var(--space-md)',
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-strong)',
            color: 'var(--color-text-primary)',
            borderRadius: 6,
            minWidth: 220,
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Chip on={faction === ''} onClick={() => { setFaction(''); resetPage() }}>
            {t('leaderboard.desktop.roster.allFactions')}
          </Chip>
          {factionChips.map(({ slug }) => (
            <Chip
              key={slug}
              on={faction === slug}
              onClick={() => {
                setFaction(faction === slug ? '' : slug)
                resetPage()
              }}
              tint={factionCssVar(slug === UNAFFILIATED ? null : slug)}
            >
              {factionName(slug === UNAFFILIATED ? null : slug)}
            </Chip>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="font-body content-text text-muted">
          {t('leaderboard.desktop.roster.empty')}
        </p>
      ) : (
        <>
          <div className="sidebar-card p-0" style={{ overflow: 'hidden' }}>
            {/* Header */}
            <div
              className="grid items-center"
              style={{
                gridTemplateColumns: '56px 1fr 120px 64px 72px',
                padding: 'var(--space-sm) var(--space-lg)',
                borderBottom: '2px solid var(--color-text-primary)',
              }}
            >
              <span className="eyebrow">{t('leaderboard.desktop.roster.colRank')}</span>
              <span className="eyebrow">{t('leaderboard.desktop.roster.colPlayer')}</span>
              <span className="eyebrow">{t('leaderboard.desktop.roster.colBadges')}</span>
              <span className="eyebrow">{t('leaderboard.desktop.roster.colLevel')}</span>
              <span className="eyebrow" style={{ textAlign: 'right' }}>
                {t('leaderboard.desktop.roster.colPoints')}
              </span>
            </div>

            {pageRows.map((row) => (
              <RosterRow key={row.character.id} row={row} isMe={row.character.id === myCharId} />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <span className="eyebrow">
              {t('leaderboard.desktop.roster.showing', {
                from: safePage * PAGE_SIZE + 1,
                to: safePage * PAGE_SIZE + pageRows.length,
                total: filtered.length,
              })}
            </span>
            {pageCount > 1 && (
              <div className="flex items-center gap-2">
                <PageButton disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                  {t('leaderboard.desktop.roster.prev')}
                </PageButton>
                {Array.from({ length: pageCount }, (_, index) => (
                  <PageButton key={index} on={index === safePage} onClick={() => setPage(index)}>
                    {index + 1}
                  </PageButton>
                ))}
                <PageButton
                  disabled={safePage === pageCount - 1}
                  onClick={() => setPage(safePage + 1)}
                >
                  {t('leaderboard.desktop.roster.next')}
                </PageButton>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function RosterRow({ row, isMe }: { row: RankedPlayer; isMe: boolean }) {
  const { character, rank, points } = row
  const color = factionCssVar(character.faction_slug)
  const badges = character.badges ?? []

  return (
    <div
      className="leaderboard-row grid items-center"
      style={{
        gridTemplateColumns: '56px 1fr 120px 64px 72px',
        padding: 'var(--space-md) var(--space-lg)',
        borderBottom: '1px dashed var(--color-border)',
        position: 'relative',
        background: isMe ? factionCssVar(character.faction_slug, 'light') : 'transparent',
      }}
    >
      {/* Faction left accent */}
      <div
        aria-hidden
        style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: color }}
      />

      <span
        className="font-display italic"
        style={{
          fontSize: 'var(--text-lg)',
          fontWeight: 700,
          color: isMe ? color : 'var(--color-text-tertiary)',
        }}
      >
        {rank}
      </span>

      <div className="flex items-center gap-2 min-w-0">
        {character.avatar_url ? (
          <img
            src={mediaUrl(character.avatar_url)}
            alt=""
            style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flex: 'none' }}
          />
        ) : (
          <span
            aria-hidden
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              flex: 'none',
              background: `linear-gradient(135deg, ${factionCssVar(character.faction_slug, 'light')}, ${color})`,
            }}
          />
        )}
        <div className="min-w-0">
          <Link
            to={`/characters/${character.id}`}
            className="font-display italic block truncate"
            style={{
              fontSize: 'var(--text-content)',
              color: isMe ? color : 'var(--color-text-primary)',
              textDecoration: 'none',
            }}
          >
            {character.display_name}
          </Link>
          <span className="eyebrow">{factionName(character.faction_slug)}</span>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
        {badges.length === 0 ? (
          <span className="eyebrow">—</span>
        ) : (
          badges.map((badge) => {
            const Art = badgeArtFor(badge.key)
            return (
              <span key={badge.key} title={badge.name} style={{ display: 'inline-flex' }}>
                <Art size={18} />
              </span>
            )
          })
        )}
      </div>

      <LevelPill level={character.level} factionSlug={character.faction_slug} />

      <div style={{ textAlign: 'right' }}>
        <span
          className="font-body"
          style={{ fontSize: 'var(--text-content)', fontWeight: 700, color: 'var(--color-text-primary)' }}
        >
          {points}
        </span>
      </div>
    </div>
  )
}

function Chip({
  on,
  onClick,
  tint,
  children,
}: {
  on: boolean
  onClick: () => void
  tint?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-body uppercase"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-xs)',
        fontSize: 'var(--text-base)',
        fontWeight: on ? 700 : 400,
        letterSpacing: '0.1em',
        color: on ? 'var(--color-text-on-accent)' : 'var(--color-text-secondary)',
        background: on ? 'var(--color-text-primary)' : 'var(--color-bg-surface)',
        border: `1px solid ${on ? 'transparent' : 'var(--color-border-strong)'}`,
        borderRadius: 999,
        padding: 'var(--space-xs) var(--space-md)',
        cursor: 'pointer',
      }}
    >
      {tint && (
        <i style={{ width: 8, height: 8, borderRadius: 2, flex: 'none', background: tint }} />
      )}
      {children}
    </button>
  )
}

function PageButton({
  children,
  on,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  on?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="font-body uppercase"
      style={{
        fontSize: 'var(--text-base)',
        letterSpacing: '0.08em',
        minWidth: 30,
        padding: 'var(--space-xs) var(--space-sm)',
        color: on ? 'var(--color-text-on-accent)' : 'var(--color-text-primary)',
        background: on ? 'var(--color-text-primary)' : 'var(--color-bg-surface)',
        border: `1px solid ${on ? 'transparent' : 'var(--color-border-strong)'}`,
        borderRadius: 4,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  )
}
