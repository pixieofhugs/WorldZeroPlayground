import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getLeaderboard } from '../api/leaderboard'
import type { CharacterOut } from '../api/auth'
import PageTitle from '../components/ui/PageTitle'
import LevelPill from '../components/ui/LevelPill'
import { useAuth } from '../auth/AuthContext'
import { factionCssVar, factionName } from '../utils/factions'
import { extractError } from '../utils/errors'
import { mediaUrl } from '../utils/media'

// Rank colors reference CSS vars defined in index.css (--rank-gold, --rank-silver, --rank-bronze)
const RANK_STYLES = [
  { color: 'var(--rank-gold)',   bgSubtle: 'rgba(245,158,11,0.08)',   textFaint: 'rgba(245,158,11,0.13)' },
  { color: 'var(--rank-silver)', bgSubtle: 'rgba(196,154,58,0.08)',   textFaint: 'rgba(196,154,58,0.13)' },
  { color: 'var(--rank-bronze)', bgSubtle: 'rgba(136,136,136,0.08)', textFaint: 'rgba(136,136,136,0.13)' },
]

export default function Leaderboard() {
  const { t } = useTranslation('common')
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
  const isSoloMe = sorted.length === 1 && sorted[0].id === myCharId

  return (
    <div className="py-8">
      <PageTitle title="Players" eyebrow="Era I" />

      {loading ? (
        <p className="font-body text-muted">{t('leaderboard.loading')}</p>
      ) : fetchError ? (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
          {fetchError}{' '}
          <button onClick={() => window.location.reload()} className="underline">{t('states.tryRefreshing')}</button>
        </p>
      ) : characters.length === 0 ? (
        <p className="font-body text-muted">{t('leaderboard.empty')}</p>
      ) : (
        <>
          {/* ── Early-era hero note: only you have joined so far ── */}
          {isSoloMe && (
            <div
              className="sidebar-card"
              style={{
                padding: '14px 18px',
                marginBottom: 16,
                borderLeft: `3px solid ${factionCssVar(sorted[0].faction_slug, 'border')}`,
              }}
            >
              <span className="eyebrow" style={{ fontSize: 8, display: 'block', marginBottom: 4 }}>
                {t('leaderboard.soloEyebrow')}
              </span>
              <p className="font-body" style={{ fontSize: 14, margin: 0, color: 'var(--color-text-primary)' }}>
                {t('leaderboard.soloBody')}
              </p>
            </div>
          )}

          {/* ── Solo card (one player, not the viewer — edge case) ── */}
          {sorted.length === 1 && !isSoloMe && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              {(() => {
                const player = sorted[0]
                return (
                  <div
                    className="sidebar-card"
                    style={{
                      width: 180,
                      borderLeft: `3px solid ${factionCssVar(player.faction_slug, 'border')}`,
                      padding: '14px 12px',
                      textAlign: 'center',
                    }}
                  >
                    <span
                      className="pennant-shape"
                      style={{
                        display: 'inline-block',
                        background: factionCssVar(player.faction_slug), color: 'var(--color-text-on-accent)',
                        fontFamily: "'Courier Prime', monospace",
                        fontSize: 7, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.07em', padding: '2px 10px',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        marginBottom: 8,
                      }}
                    >
                      {factionName(player.faction_slug)}
                    </span>
                    {player.avatar_url ? (
                      <img
                        src={mediaUrl(player.avatar_url)}
                        alt={player.display_name}
                        style={{
                          width: 64, height: 64, borderRadius: '50%',
                          objectFit: 'cover', margin: '0 auto 6px',
                          border: `2px solid ${factionCssVar(player.faction_slug, 'border')}`,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 64, height: 64, borderRadius: '50%',
                          background: `linear-gradient(135deg, ${factionCssVar(player.faction_slug, 'light')}, ${factionCssVar(player.faction_slug)})`,
                          margin: '0 auto 6px',
                          border: `2px solid ${factionCssVar(player.faction_slug, 'border')}`,
                        }}
                      />
                    )}
                    <Link
                      to={`/characters/${player.id}`}
                      className="font-display italic block truncate"
                      style={{ fontSize: 13, color: factionCssVar(player.faction_slug), textDecoration: 'none', marginBottom: 4 }}
                    >
                      {player.display_name}
                    </Link>
                    <div
                      className="font-display italic"
                      style={{ fontSize: 28, fontWeight: 700, color: factionCssVar(player.faction_slug) }}
                    >
                      {scoreMode === 'era' ? player.score : player.all_time_score}
                    </div>
                    <span className="eyebrow" style={{ fontSize: 7 }}>
                      {scoreMode === 'era' ? 'era pts' : 'all-time pts'}
                    </span>
                  </div>
                )
              })()}
            </div>
          )}

          {/* ── Two-player rankings-so-far (no podium platforms) ── */}
          {sorted.length === 2 && (
            <>
              <span className="eyebrow" style={{ fontSize: 8, display: 'block', marginBottom: 8, textAlign: 'center' }}>
                {t('leaderboard.rankingsSoFar')}
              </span>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
                {sorted.map((player, index) => {
                  const rank = index
                  return (
                    <div
                      key={player.id}
                      className="sidebar-card"
                      style={{
                        width: 160,
                        borderLeft: `${rank === 0 ? 3 : 2}px solid ${rank === 0 ? 'var(--rank-gold)' : factionCssVar(player.faction_slug, 'border')}`,
                        padding: '12px 10px',
                        textAlign: 'center',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute', top: -8, right: -8,
                          width: 22, height: 22, borderRadius: '50%',
                          background: RANK_STYLES[rank].color,
                          color: 'var(--color-text-on-accent)', fontFamily: "'Courier Prime', monospace",
                          fontSize: 10, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '2px solid var(--color-bg-page)',
                        }}
                      >
                        {rank + 1}
                      </div>
                      <span
                        className="pennant-shape"
                        style={{
                          display: 'inline-block',
                          background: factionCssVar(player.faction_slug), color: 'var(--color-text-on-accent)',
                          fontFamily: "'Courier Prime', monospace",
                          fontSize: 7, fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.07em', padding: '2px 10px',
                          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                          marginBottom: 8,
                        }}
                      >
                        {factionName(player.faction_slug)}
                      </span>
                      {player.avatar_url ? (
                        <img
                          src={mediaUrl(player.avatar_url)}
                          alt={player.display_name}
                          style={{
                            width: 56, height: 56, borderRadius: '50%',
                            objectFit: 'cover', margin: '0 auto 6px',
                            border: `2px solid ${factionCssVar(player.faction_slug, 'border')}`,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 56, height: 56, borderRadius: '50%',
                            background: `linear-gradient(135deg, ${factionCssVar(player.faction_slug, 'light')}, ${factionCssVar(player.faction_slug)})`,
                            margin: '0 auto 6px',
                            border: `2px solid ${factionCssVar(player.faction_slug, 'border')}`,
                          }}
                        />
                      )}
                      <Link
                        to={`/characters/${player.id}`}
                        className="font-display italic block truncate"
                        style={{ fontSize: 12, color: factionCssVar(player.faction_slug), textDecoration: 'none', marginBottom: 4 }}
                      >
                        {player.display_name}
                      </Link>
                      <div
                        className="font-display italic"
                        style={{ fontSize: 24, fontWeight: 700, color: factionCssVar(player.faction_slug) }}
                      >
                        {scoreMode === 'era' ? player.score : player.all_time_score}
                      </div>
                      <span className="eyebrow" style={{ fontSize: 7 }}>
                        {scoreMode === 'era' ? 'era pts' : 'all-time pts'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ── Podium — Top 3 (§16.3) ── */}
          {top3.length >= 3 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 12, marginBottom: 24 }}>
              {[1, 0, 2].map((podiumIndex) => {
                const player = top3[podiumIndex]
                if (!player) return null
                const rank = podiumIndex
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
                        borderLeft: `${isFirst ? 3 : 2}px solid ${isFirst ? 'var(--rank-gold)' : factionCssVar(player.faction_slug, 'border')}`,
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
                          color: 'var(--color-text-on-accent)', fontFamily: "'Courier Prime', monospace",
                          fontSize: 10, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '2px solid var(--color-bg-page)',
                        }}
                      >
                        {rank + 1}
                      </div>

                      {/* Faction pennant */}
                      <span
                        className="pennant-shape"
                        style={{
                          display: 'inline-block',
                          background: factionCssVar(player.faction_slug), color: 'var(--color-text-on-accent)',
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
                            border: `2px solid ${factionCssVar(player.faction_slug, 'border')}`,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: avatarSize, height: avatarSize, borderRadius: '50%',
                            background: `linear-gradient(135deg, ${factionCssVar(player.faction_slug, 'light')}, ${factionCssVar(player.faction_slug)})`,
                            margin: '0 auto 6px',
                            border: `2px solid ${factionCssVar(player.faction_slug, 'border')}`,
                          }}
                        />
                      )}

                      {/* Name */}
                      <Link
                        to={`/characters/${player.id}`}
                        className="font-display italic block truncate"
                        style={{ fontSize: 12, color: factionCssVar(player.faction_slug), textDecoration: 'none', marginBottom: 4 }}
                      >
                        {player.display_name}
                      </Link>

                      {/* Score */}
                      <div className="font-display italic" style={{ fontSize: scoreSize, fontWeight: 700, color: factionCssVar(player.faction_slug) }}>
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
                    background: `linear-gradient(135deg, ${factionCssVar(user?.character?.faction_slug, 'light')}, ${factionCssVar(user?.character?.faction_slug)})`,
                  }}
                />
              )}
              <div className="flex-1">
                <span className="font-display italic" style={{ fontSize: 12, color: 'var(--color-rank-accent)' }}>
                  {user?.character?.display_name}
                </span>
                <span className="eyebrow" style={{ marginLeft: 6 }}>
                  {t('leaderboard.youFactionLevel', {
                    faction: factionName(user?.character?.faction_slug),
                    level: user?.character?.level,
                  })}
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
              const isMe = c.id === myCharId

              return (
                <div
                  key={c.id}
                  className="leaderboard-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr 80px 50px 60px',
                    padding: '10px 16px',
                    alignItems: 'center',
                    borderBottom: '1px dashed var(--color-border)',
                    position: 'relative',
                    background: isMe ? factionCssVar(c.faction_slug, 'light') : 'transparent',
                    transition: 'background 120ms',
                  }}
                >
                  {/* Faction left accent */}
                  <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: factionCssVar(c.faction_slug, 'border') }} />

                  {/* Rank */}
                  <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: isMe ? factionCssVar(c.faction_slug) : 'var(--color-text-tertiary)' }}>
                    {rank}
                  </span>

                  {/* Player */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    {c.avatar_url ? (
                      <img src={mediaUrl(c.avatar_url)} alt={c.display_name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${factionCssVar(c.faction_slug, 'light')}, ${factionCssVar(c.faction_slug)})`, flexShrink: 0 }} />
                    )}
                    <div className="min-w-0">
                      <Link to={`/characters/${c.id}`} className="font-display italic block truncate" style={{ fontSize: 12, color: isMe ? factionCssVar(c.faction_slug) : 'var(--color-text-primary)', textDecoration: 'none' }}>
                        {c.display_name}
                      </Link>
                    </div>
                  </div>

                  {/* Faction */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: factionCssVar(c.faction_slug, 'border'), flexShrink: 0 }} />
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
