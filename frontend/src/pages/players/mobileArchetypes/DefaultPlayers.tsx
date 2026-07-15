import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { CharacterOut } from '../../../api/auth'
import { factionCssVar, factionName, sortFactionsByRainbowOrder } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'

export interface PlayersDirectoryProps {
  characters: CharacterOut[]
  loading: boolean
  error: Error | null
  /** The viewer's own character id, highlighted in the list. */
  myCharId: number | null
}

type ScoreMode = 'era' | 'alltime'

/** Unaffiliated players carry a null faction_slug; normalise to a stable chip
 *  key so the "All / <faction>" filter can include them. factionName(null)
 *  already resolves to the Unaffiliated copy. */
const UNAFFILIATED = 'na'
const slugKey = (slug: string | null): string => slug ?? UNAFFILIATED

/**
 * Default MOBILE players-directory skin (#517) — a scannable single-column
 * ranking (rank · avatar · faction tint · level · points) with phone-native
 * filter chips (sort by era/all-time score, filter by faction), NOT the desktop
 * podium + table. A row taps through to the public profile. Mirrors the
 * DefaultTasks mobile browse idiom; consumes the same leaderboard read the
 * desktop board uses (presentation-only, no backend change).
 */
export default function DefaultPlayers({ characters, loading, error, myCharId }: PlayersDirectoryProps) {
  const { t } = useTranslation('common')
  const [scoreMode, setScoreMode] = useState<ScoreMode>('era')
  const [faction, setFaction] = useState<string>('')

  const scoreOf = (c: CharacterOut) => (scoreMode === 'era' ? c.score : c.all_time_score)
  const sorted = [...characters].sort((a, b) => scoreOf(b) - scoreOf(a))
  const shown = faction === '' ? sorted : sorted.filter((c) => slugKey(c.faction_slug) === faction)

  // Distinct factions present, in canonical rainbow order, for the filter row.
  const presentSlugs = Array.from(new Set(characters.map((c) => slugKey(c.faction_slug))))
  const factionChips = sortFactionsByRainbowOrder(presentSlugs.map((slug) => ({ slug })))

  return (
    <div className="py-4" data-testid="mobile-players-directory">
      <h1
        className="font-display italic font-medium mb-1"
        style={{ fontSize: 26, color: 'var(--color-text-primary)', lineHeight: 1.1 }}
      >
        {t('nav.players')}
      </h1>
      <p className="eyebrow mb-3">{t('leaderboard.mobile.count', { count: characters.length })}</p>

      {/* Sort chips — era vs all-time score */}
      <ChipRow label={t('filters.sort')}>
        <Chip on={scoreMode === 'era'} onClick={() => setScoreMode('era')}>
          {t('leaderboard.mobile.sortEra')}
        </Chip>
        <Chip on={scoreMode === 'alltime'} onClick={() => setScoreMode('alltime')}>
          {t('leaderboard.mobile.sortAllTime')}
        </Chip>
      </ChipRow>

      {/* Faction chips */}
      <ChipRow label={t('filters.faction')}>
        <Chip on={faction === ''} onClick={() => setFaction('')}>
          {t('leaderboard.mobile.allFactions')}
        </Chip>
        {factionChips.map(({ slug }) => (
          <Chip
            key={slug}
            on={faction === slug}
            onClick={() => setFaction(faction === slug ? '' : slug)}
            tint={factionCssVar(slug === UNAFFILIATED ? null : slug)}
          >
            {factionName(slug === UNAFFILIATED ? null : slug)}
          </Chip>
        ))}
      </ChipRow>

      {/* Results */}
      <div className="mt-4">
        {loading ? (
          <p className="font-body text-muted">{t('leaderboard.loading')}</p>
        ) : error ? (
          <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
            {t('leaderboard.mobile.loadError')}
          </p>
        ) : shown.length === 0 ? (
          <p className="font-body text-muted">{t('leaderboard.mobile.empty')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {shown.map((character, index) => (
              <PlayerRow
                key={character.id}
                character={character}
                rank={index + 1}
                points={scoreOf(character)}
                isMe={character.id === myCharId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PlayerRow({
  character,
  rank,
  points,
  isMe,
}: {
  character: CharacterOut
  rank: number
  points: number
  isMe: boolean
}) {
  const { t } = useTranslation('common')
  const color = factionCssVar(character.faction_slug)
  return (
    <Link
      to={`/characters/${character.id}`}
      className="sidebar-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px 10px 16px',
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
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--color-text-tertiary)',
        }}
      >
        {rank}
      </span>

      {/* Avatar */}
      {character.avatar_url ? (
        <img
          src={mediaUrl(character.avatar_url)}
          alt={character.display_name}
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

      {/* Name + faction · level */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="font-display italic truncate"
          style={{ fontSize: 16, color: 'var(--color-text-primary)', lineHeight: 1.15 }}
        >
          {character.display_name}
        </div>
        <div
          className="eyebrow"
          style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}
        >
          <i style={{ width: 8, height: 8, borderRadius: 2, background: color, flex: 'none' }} />
          {t('leaderboard.mobile.factionLevel', {
            faction: factionName(character.faction_slug),
            level: character.level,
          })}
        </div>
      </div>

      {/* Points */}
      <div style={{ flex: 'none', textAlign: 'right' }}>
        <div
          className="font-body"
          style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}
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

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="eyebrow" style={{ flex: 'none' }}>
        {label}
      </span>
      <div
        className="flex gap-2"
        style={{ overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}
      >
        {children}
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
      style={{
        flex: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: "'Courier Prime', monospace",
        fontSize: 11,
        fontWeight: on ? 700 : 400,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: on ? 'var(--color-text-on-accent)' : 'var(--color-text-secondary)',
        background: on ? 'var(--color-text-primary)' : 'var(--color-bg-surface)',
        border: `1px solid ${on ? 'transparent' : 'var(--color-border-strong)'}`,
        borderRadius: 999,
        padding: '8px 14px',
        minHeight: 36,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      }}
    >
      {tint && (
        <i
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            flex: 'none',
            background: tint,
          }}
        />
      )}
      {children}
    </button>
  )
}
