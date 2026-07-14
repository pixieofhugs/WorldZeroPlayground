import { useTranslation } from 'react-i18next'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteSummary } from './VoteShell'
import { VOTE_REFRAMES } from './voteReframes'

/**
 * Everymen faction vote UI — union "approval stamps" with an escalating
 * ink ramp (gold → red → the authoritative black seal at 5). Square stamp
 * buttons with a 2px border and a dashed inset on the active stamp, Bebas
 * Neue numerals, tiny uppercase labels, and an average display below.
 *
 * Plugs into the vote dispatcher via the shared {@link useVote} hook so the
 * cast/refetch logic lives in exactly one place.
 */

/** Visual tokens per tier value — labels come from voteReframes. */
const STAMP_VISUALS: Record<number, { fill: string; ink: string }> = {
  1: { fill: 'var(--everymen-gold)',      ink: 'var(--everymen-ink)' },
  2: { fill: 'var(--everymen-gold-deep)', ink: 'var(--everymen-cream)' },
  3: { fill: 'var(--everymen-red)',       ink: 'var(--everymen-cream)' },
  4: { fill: 'var(--everymen-red-deep)',  ink: 'var(--everymen-cream)' },
  5: { fill: 'var(--everymen-ink)',       ink: 'var(--everymen-gold)' },
}

const STAMP_SIZE = 40

const TIERS = VOTE_REFRAMES['everymen'].tiers

export default function EverymenVote({ praxisId, currentValue, points, totalVotes }: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)

  if (!user) {
    return <VoteLoginGate />
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 9 }}>
        {TIERS.map((tier) => {
          const visual = STAMP_VISUALS[tier.value] ?? STAMP_VISUALS[1]
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
                aria-label={t('chrome.everymen.rateAria', { value: tier.value, label: tier.label })}
                style={{
                  position: 'relative',
                  width: STAMP_SIZE,
                  height: STAMP_SIZE,
                  cursor: saving ? 'default' : 'pointer',
                  padding: 0,
                  border: '2px solid var(--everymen-ink)',
                  borderRadius: 0,
                  background: filled ? visual.fill : 'var(--everymen-paper)',
                  color: filled ? visual.ink : 'var(--everymen-ink)',
                  fontFamily: 'var(--faction-everymen-card-font)',
                  fontSize: STAMP_SIZE * 0.5,
                  lineHeight: 1,
                  transform: active ? 'rotate(-4deg) scale(1.08)' : 'none',
                  transition: 'all 110ms',
                } as React.CSSProperties}
              >
                <span
                  style={{
                    position: 'absolute',
                    inset: 3,
                    border: `1px dashed ${
                      filled
                        ? 'rgba(255,255,255,0.4)'
                        : 'color-mix(in srgb, var(--everymen-ink) 30%, transparent)'
                    }`,
                    pointerEvents: 'none',
                  }}
                />
                {tier.value}
              </button>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 7.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: active ? 'var(--everymen-red)' : 'var(--everymen-muted)',
                  maxWidth: STAMP_SIZE + 8,
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
          muted: 'var(--everymen-muted)',
          accent: 'var(--everymen-red)',
          accentFont: 'var(--faction-everymen-card-font)',
          avgFontSize: 15,
          errorColor: 'var(--everymen-red)',
          avgLetterSpacing: '0.04em',
        }}
      />
    </div>
  )
}
