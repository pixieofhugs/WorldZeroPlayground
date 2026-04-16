import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLeaderboard } from '../api/leaderboard'
import type { CharacterOut } from '../api/auth'
import PageTitle from '../components/ui/PageTitle'
import LevelPill from '../components/ui/LevelPill'
import { useAuth } from '../auth/AuthContext'
import { factionColor, factionName } from '../utils/factions'
import { extractError } from '../utils/errors'
import { mediaUrl } from '../utils/media'

// Rank colors reference CSS vars defined in index.css (--rank-gold, --rank-silver, --rank-bronze)
const RANK_STYLES = [
  { color: 'var(--rank-gold)',   bgSubtle: 'rgba(245,158,11,0.08)',   textFaint: 'rgba(245,158,11,0.13)' },
  { color: 'var(--rank-silver)', bgSubtle: 'rgba(196,154,58,0.08)',   textFaint: 'rgba(196,154,58,0.13)' },
  { color: 'var(--rank-bronze)', bgSubtle: 'rgba(136,136,136,0.08)', textFaint: 'rgba(136,136,136,0.13)' },
]

export default function Leaderboard() {
  const { user } = useAuth()
  const [characters, setCharacters] = useState<CharacterOut[]>([])
  const [scoreMode, setScoreMode] = useState<'era' | 'alltime'>('era')
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    getLeaderboard({ limit: 50 })
      .then(setCharacters)
      .catch((err) => setFetchError(extractError(err, "Couldn't load the leaderboard.")))
      .finally(() => setLoading(false))
  }, [])

  const sorted = [...characters].sort((a, b) =>
    scoreMode === 'era' ? b.score - a.score : b.all_time_score - a.all_time_score
  )
  const top3 = sorted.slice(0, 3)
  const rest = sorted.slice(3)
  const myCharId = user?.character?.id
  const myRank = sorted.findIndex((c) => c.id === myCharId)

  return (
    <div className="py-8">
      <PageTitle title="Players" eyebrow="Era I" />

      {loading ? (
        <p className="font-body text-muted">Loading...</p>
      ) : fetchError ? (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
          {fetchError}{' '}
          <button onClick={() => window.location.reload()} className="underline">Try refreshing.</button>
        </p>
      ) : characters.length === 0 ? (
        <p className="font-body text-muted">No players yet.</p>
      ) : (
        <>
          {/* ── Podium — Top 3 (§16.3) ── */}
          {top3.length >= 3 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 12, marginBottom: 24 }}>
              {[1, 0, 2].map((podiumIndex) => {
                const player = top3[podiumIndex]
                if (!player) return null
                const rank = podiumIndex
                const color = factionColor(player.faction_slug)
                const isFirst = rank === 0
                const cardWidth = isFirst ? 160 : 140
                const avatarSize = isFirst ? 64 : 52
                const scoreSize = isFirst ? 28 : 22
                const platformHeight = isFirst ? 52 : rank === 1 ? 36 : 24

                return (
                  <div key={player.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {/* Card */}
                    <div
                      className="sidebar-card"
                      style={{
                        width: cardWidth,
                        borderLeft: `${isFirst ? 3 : 2}px solid ${isFirst ? 'var(--rank-gold)' : color}`,
                        padding: '12px 10px',
                        textAlign: 'center',
                        position: 'relative',
                      }}
                    >
                      {/* Rank badge */}
                      <div
                        style={{
                          position: 'absolute', top: -8, right: -8,
                          width: 22, height: 22, borderRadius: '50%',
                          background: RANK_STYLES[rank].color,
                          color: 'white', fontFamily: "'Courier Prime', monospace",
                          fontSize: 10, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '2px solid var(--color-bg-page)',
                        }}
                      >
                        {rank + 1}
                      </div>

                      {/* Faction pennant */}
                      <span
                        style={{
                          display: 'inline-block',
                          clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)',
                          background: color, color: 'white',
                          fontFamily: "'Courier Prime', monospace",
                          fontSize: 7, fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.07em', padding: '2px 10px',
                          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                          marginBottom: 8,
                        }}
                      >
                        {factionName(player.faction_slug)}
                      </span>

                      {/* Avatar orb */}
                      {player.avatar_url ? (
                        <img
                          src={mediaUrl(player.avatar_url)}
                          alt={player.display_name}
                          style={{
                            width: avatarSize, height: avatarSize, borderRadius: '50%',
                            objectFit: 'cover', margin: '0 auto 6px',
                            border: `2px solid ${color}`,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: avatarSize, height: avatarSize, borderRadius: '50%',
                            background: `linear-gradient(135deg, ${color}, ${color}88)`,
                            margin: '0 auto 6px',
                            border: `2px solid ${color}`,
                          }}
                        />
                      )}

                      {/* Name */}
                      <Link
                        to={`/characters/${player.id}`}
                        className="font-display italic block truncate"
                        style={{ fontSize: 12, color, textDecoration: 'none', marginBottom: 4 }}
                      >
                        {player.display_name}
                      </Link>

                      {/* Score */}
                      <div className="font-display italic" style={{ fontSize: scoreSize, fontWeight: 700, color }}>
                        {scoreMode === 'era' ? player.score : player.all_time_score}
                      </div>
                      <span className="eyebrow" style={{ fontSize: 7 }}>
                        {scoreMode === 'era' ? 'era pts' : 'all-time pts'}
                      </span>
                    </div>

                    {/* Platform block */}
                    <div
                      style={{
                        width: cardWidth,
                        height: platformHeight,
                        background: RANK_STYLES[rank].bgSubtle,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: "'Lora', serif", fontStyle: 'italic',
                        fontSize: platformHeight * 0.7, fontWeight: 700,
                        color: RANK_STYLES[rank].textFaint,
                        borderRadius: '0 0 8px 8px',
                      }}
                    >
                      {rank + 1}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Your Rank Strip (§16.4) ── */}
          {myRank >= 0 && myCharId && (
            <div
              style={{
                background: 'var(--rank-strip-bg)',
                border: '2px solid var(--rank-strip-border)',
                borderRadius: 8,
                padding: '10px 16px',
                marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <span className="font-display italic" style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-rank-accent)', minWidth: 32, textAlign: 'right' }}>
                {myRank + 1}
              </span>
              {user?.character?.avatar_url ? (
                <img
                  src={mediaUrl(user.character.avatar_url)}
                  alt={user.character.display_name}
                  style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${factionColor(user?.character?.faction_slug)}, ${factionColor(user?.character?.faction_slug)}88)`,
                  }}
                />
              )}
              <div className="flex-1">
                <span className="font-display italic" style={{ fontSize: 12, color: 'var(--color-rank-accent)' }}>
                  {user?.character?.display_name}
                </span>
                <span className="eyebrow" style={{ marginLeft: 6 }}>
                  {factionName(user?.character?.faction_slug)} · Level {user?.character?.level}
                </span>
              </div>
              <span className="font-display italic" style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-rank-accent)' }}>
                {scoreMode === 'era' ? user?.character?.score : user?.character?.all_time_score}
              </span>
              <span className="eyebrow">{scoreMode === 'era' ? 'era pts' : 'all-time'}</span>
            </div>
          )}

          {/* ── Score Toggle (§16.5) ── */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {(['era', 'alltime'] as const).map((mode) => {
              const active = scoreMode === mode
              return (
                <button
                  key={mode}
                  onClick={() => setScoreMode(mode)}
                  style={{
                    position: 'relative',
                    border: `2px solid ${active ? 'var(--color-text-primary)' : 'var(--color-border-strong)'}`,
                    borderRadius: 0,
                    background: active ? 'var(--color-text-primary)' : 'var(--color-bg-surface)',
                    color: active ? 'var(--color-bg-page)' : 'var(--color-text-primary)',
                    fontFamily: "'Courier Prime', monospace",
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.1em', padding: '5px 12px',
                    cursor: 'pointer',
                  }}
                >
                  {active && <span style={{ position: 'absolute', inset: 2, border: '1px dashed var(--stamp-active-dashed)', pointerEvents: 'none' }} />}
                  {mode === 'era' ? 'Era Score' : 'All-time'}
                </button>
              )
            })}
          </div>

          {/* ── Main Table (§16.6) ── */}
          {rest.length > 0 && (
          <div
            className="sidebar-card"
            style={{ padding: 0, overflow: 'hidden' }}
          >
            {/* Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 80px 50px 60px',
                padding: '8px 16px',
                borderBottom: '2px solid var(--color-text-primary)',
              }}
            >
              {['#', 'Player', 'Faction', 'Lvl', 'Score'].map((col) => (
                <span key={col} className="eyebrow" style={{ fontSize: 8 }}>{col}</span>
              ))}
            </div>

            {/* Rows */}
            {rest.map((c, index) => {
              const rank = index + 4
              const color = factionColor(c.faction_slug)
              const isMe = c.id === myCharId

              return (
                <div
                  key={c.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr 80px 50px 60px',
                    padding: '10px 16px',
                    alignItems: 'center',
                    borderBottom: '1px dashed var(--color-border)',
                    position: 'relative',
                    background: isMe ? `${color}0F` : 'transparent',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={(e) => { if (!isMe) e.currentTarget.style.background = 'var(--leaderboard-row-hover)' }}
                  onMouseLeave={(e) => { if (!isMe) e.currentTarget.style.background = 'transparent' }}
                >
                  {/* Faction left accent */}
                  <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: color }} />

                  {/* Rank */}
                  <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: isMe ? color : 'var(--color-text-tertiary)' }}>
                    {rank}
                  </span>

                  {/* Player */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    {c.avatar_url ? (
                      <img src={mediaUrl(c.avatar_url)} alt={c.display_name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}88)`, flexShrink: 0 }} />
                    )}
                    <div className="min-w-0">
                      <Link to={`/characters/${c.id}`} className="font-display italic block truncate" style={{ fontSize: 12, color: isMe ? color : 'var(--color-text-primary)', textDecoration: 'none' }}>
                        {c.display_name}
                      </Link>
                    </div>
                  </div>

                  {/* Faction */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span className="eyebrow" style={{ fontSize: 8 }}>{factionName(c.faction_slug)}</span>
                  </div>

                  {/* Level */}
                  <LevelPill level={c.level} />

                  {/* Score */}
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-body" style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {scoreMode === 'era' ? c.score : c.all_time_score}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          )}
        </>
      )}
    </div>
  )
}
