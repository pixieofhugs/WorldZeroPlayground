import { useState } from 'react'
import { castVote } from '../../api/votes'
import { useAuth } from '../../auth/AuthContext'
import { useTheme } from '../../hooks/useTheme'
import { extractError } from '../../utils/errors'

/**
 * Stamp-style vote buttons replacing star rating (Style Guide §13.1).
 * Five rectangular stamps numbered 1–5 with word labels and value-specific colors.
 */

interface StampConfig {
  value: number
  label: string
  color: string
}

const STAMPS: StampConfig[] = [
  { value: 1, label: 'a start', color: '#9b8e7d' },
  { value: 2, label: 'solid',   color: '#0e7490' },
  { value: 3, label: 'good',    color: '#4f46e5' },
  { value: 4, label: 'excellent', color: '#be185d' },
  { value: 5, label: 'legendary', color: '#14532d' },
]

interface Props {
  submissionId: number
  currentStars?: number
  averageStars?: number
  totalVotes?: number
}

export default function VoteStamps({ submissionId, currentStars, averageStars, totalVotes }: Props) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [hovered, setHovered] = useState(0)
  const [selected, setSelected] = useState(currentStars ?? 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleVote = async (stars: number) => {
    setSaving(true)
    setError('')
    try {
      await castVote(submissionId, stars)
      setSelected(stars)
    } catch (err) {
      setError(extractError(err, 'Could not save your vote. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Stamp buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {STAMPS.map((stamp) => {
          const active = selected === stamp.value
          const isHovered = hovered === stamp.value
          return (
            <div key={stamp.value} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <button
                disabled={saving || !user}
                onMouseEnter={() => setHovered(stamp.value)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => void handleVote(stamp.value)}
                style={{
                  position: 'relative',
                  width: 44,
                  height: 44,
                  border: `2.5px solid ${stamp.color}`,
                  borderRadius: 0,
                  background: active
                    ? stamp.color
                    : isHovered
                      ? `${stamp.color}18`
                      : dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)',
                  color: active ? 'white' : (dark ? 'var(--color-text-primary)' : stamp.color),
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 18,
                  fontWeight: 900,
                  cursor: user ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 120ms',
                  opacity: saving ? 0.5 : 1,
                }}
                aria-label={`Rate ${stamp.value} — ${stamp.label}`}
              >
                {/* Inner dashed border on selected */}
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      inset: 2,
                      border: '1px dashed rgba(255,255,255,0.25)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {stamp.value}
              </button>
              {/* Word label */}
              <span
                style={{
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 7,
                  textTransform: 'uppercase',
                  color: active ? stamp.color : 'var(--color-text-tertiary)',
                  maxWidth: 44,
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                {stamp.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Vote economy info */}
      {selected > 0 && (
        <p className="font-body" style={{ fontSize: 8, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
          Voted {selected} pts
        </p>
      )}

      {/* Summary */}
      {averageStars !== undefined && (
        <p className="font-body" style={{ fontSize: 9, color: 'var(--color-text-secondary)' }}>
          {(averageStars).toFixed(1)} avg · {totalVotes ?? 0} votes
        </p>
      )}

      {error && <p className="font-body" style={{ fontSize: 9, color: '#dc2626', marginTop: 4 }}>{error}</p>}
      {!user && <p className="font-body" style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginTop: 4 }}>Log in to vote on this praxis.</p>}
    </div>
  )
}
