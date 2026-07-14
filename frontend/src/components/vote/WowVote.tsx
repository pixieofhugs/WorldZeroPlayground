import { useTranslation } from 'react-i18next'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteSummary } from './VoteShell'
import { VOTE_REFRAMES } from './voteReframes'

/**
 * Warriors of Whimsy faction vote UI — the 1-5 rating rendered as filled hearts in the
 * pink computer-witch language. Empty hearts are outline-only; filled hearts
 * climb an escalating pastel-pink ramp left-to-right, each in a soft rounded
 * stamp tile with tiny uppercase word labels.
 *
 * Plugs into the vote dispatcher via the shared {@link useVote} hook so the
 * cast/refetch logic lives in exactly one place.
 */

/** Escalating pink heart-fill ramp (from wow-kit.jsx voteFills). */
const HEART_FILLS: Record<number, string> = {
  1: '#f6b8cf',
  2: '#f489b0',
  3: '#ec5f99',
  4: '#df3f86',
  5: '#c52470',
}

const HEART_TILE = 40

const TIERS = VOTE_REFRAMES['wow'].tiers

/** Inline heart glyph — filled (ramp color) or outline-only when empty. */
function HeartGlyph({ filled, color, size = 30 }: { filled: boolean; color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
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

export default function WowVote({ praxisId, currentValue, points, totalVotes }: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)

  if (!user) {
    return <VoteLoginGate />
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 9 }}>
        {TIERS.map((tier) => {
          const fill = HEART_FILLS[tier.value] ?? HEART_FILLS[1]
          const filled = selected >= tier.value
          const active = selected === tier.value
          return (
            <div
              key={tier.value}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
            >
              <button
                disabled={saving}
                onClick={() => void vote(tier.value)}
                aria-label={t('chrome.wow.rateAria', { value: tier.value, label: tier.label })}
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
                <HeartGlyph filled={filled} color={fill} />
              </button>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 7,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: filled ? fill : 'var(--faction-wow-card-muted)',
                  maxWidth: HEART_TILE + 2,
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                {tier.label}
              </span>
            </div>
          )
        })}
      </div>

      <VoteSummary
        selected={selected}
        points={points}
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
