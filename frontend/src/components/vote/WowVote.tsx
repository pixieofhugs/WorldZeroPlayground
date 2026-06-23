import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteSummary } from './VoteShell'

/**
 * Warriors of Whimsy faction vote UI — the 1-5 rating rendered as filled hearts in the
 * pink computer-witch language. Empty hearts are outline-only; filled hearts
 * climb an escalating pastel-pink ramp left-to-right, each in a soft rounded
 * stamp tile with tiny uppercase word labels (Caveat script numerals elsewhere
 * in the kit; here the labels use the body font to match GVoteStamps).
 *
 * Plugs into the vote dispatcher via the shared {@link useVote} hook so the
 * cast/refetch logic lives in exactly one place.
 */

interface HeartConfig {
  value: number
  label: string
  fill: string
}

/** Escalating pink heart-fill ramp (from wow-kit.jsx voteFills). */
const VOTE_FILLS = ['#f6b8cf', '#f489b0', '#ec5f99', '#df3f86', '#c52470'] as const

const HEART_TILE = 40

const HEARTS: HeartConfig[] = [
  { value: 1, label: 'a start',   fill: VOTE_FILLS[0] },
  { value: 2, label: 'solid',     fill: VOTE_FILLS[1] },
  { value: 3, label: 'good',      fill: VOTE_FILLS[2] },
  { value: 4, label: 'excellent', fill: VOTE_FILLS[3] },
  { value: 5, label: 'legendary', fill: VOTE_FILLS[4] },
]

/** Inline heart glyph — filled (ramp color) or outline-only when empty. */
function HeartGlyph({ filled, color }: { filled: boolean; color: string }) {
  return (
    <svg width="30" height="30" viewBox="0 0 36 36" aria-hidden="true">
      <path
        d="M18 31C7 23 3 17 6.5 11 9 6.8 14 6.5 16 10c.9 1.5 1.6 2.7 2 3.4.4-.7 1.1-1.9 2-3.4 2-3.5 7-3.2 9.5 1C33 17 29 23 18 31Z"
        fill={filled ? color : 'none'}
        stroke={filled ? '#fff' : 'var(--faction-wow-border)'}
        strokeWidth={filled ? 2.2 : 2}
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function WowVote({ praxisId, currentStars, averageStars, totalVotes }: VoteUIProps) {
  const { user, selected, saving, error, vote } = useVote(praxisId, currentStars)

  if (!user) {
    return <VoteLoginGate />
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 9 }}>
        {HEARTS.map((heart) => {
          const filled = selected >= heart.value
          const active = selected === heart.value
          return (
            <div
              key={heart.value}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
            >
              <button
                disabled={saving}
                onClick={() => void vote(heart.value)}
                aria-label={`Rate ${heart.value} — ${heart.label}`}
                style={{
                  width: HEART_TILE,
                  height: HEART_TILE,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: saving ? 'default' : 'pointer',
                  padding: 0,
                  borderRadius: 9,
                  border: `1.5px solid ${filled ? 'var(--faction-wow)' : 'var(--faction-wow-border)'}`,
                  background: filled ? 'var(--faction-wow-notepad-bg)' : 'transparent',
                  boxShadow: filled ? '0 3px 7px var(--faction-wow-light)' : 'none',
                  transform: active ? 'scale(1.08)' : 'none',
                  transition: 'all 120ms',
                } as React.CSSProperties}
              >
                <HeartGlyph filled={filled} color={heart.fill} />
              </button>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 7,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: filled ? heart.fill : 'var(--faction-wow-card-muted)',
                  maxWidth: HEART_TILE + 2,
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                {heart.label}
              </span>
            </div>
          )
        })}
      </div>

      <VoteSummary
        selected={selected}
        averageStars={averageStars}
        totalVotes={totalVotes}
        error={error}
        theme={{
          muted: 'var(--faction-wow-card-muted)',
          accent: 'var(--faction-wow)',
          accentFont: 'var(--faction-wow-card-font)',
          avgFontSize: 16,
          errorColor: 'var(--color-danger)',
        }}
      />
    </div>
  )
}
