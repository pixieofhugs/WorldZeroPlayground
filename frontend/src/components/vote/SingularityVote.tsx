import { useTranslation } from 'react-i18next'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteSummary } from './VoteShell'
import { VOTE_REFRAMES } from './voteReframes'

/**
 * Singularity faction vote UI — THE CONSENSUS ARRAY. The 1-5 rating is rendered
 * as a signal-strength ramp cast into the terminal: noise → weak → signal →
 * clear → verified, measuring how confidently a sealed output holds up to
 * scrutiny. Square mono "cast signal" keys glow when reached; the selected key
 * scales up. Singularity is ALWAYS-DARK — its tokens hold identical terminal
 * values in both themes, so this never touches data-theme.
 *
 * Same 1-5 data model as every other faction — a pure terminal reskin driven by
 * the shared {@link useVote} hook so cast/refetch logic lives in one place.
 */

/**
 * Signal ramp fills per tier value — labels come from voteReframes. The ramp
 * runs cool→warm→green: terminal-green accent mixed up from the blue brand chrome
 * as confidence rises.
 */
const SG_FILLS: Record<number, string> = {
  1: 'var(--faction-singularity-card-muted)',
  2: 'color-mix(in srgb, var(--faction-singularity-card-muted) 70%, var(--faction-singularity-card-accent))',
  3: 'color-mix(in srgb, var(--faction-singularity-card-muted) 40%, var(--faction-singularity-card-accent))',
  4: 'color-mix(in srgb, var(--faction-singularity-card-accent) 75%, var(--faction-singularity-card-muted))',
  5: 'var(--faction-singularity-card-accent)',
}

const KEY_SIZE = 42

const TIERS = VOTE_REFRAMES['singularity'].tiers

export default function SingularityVote({ praxisId, currentValue, points, totalVotes }: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)

  if (!user) {
    return <VoteLoginGate />
  }

  return (
    <div style={{ fontFamily: 'var(--font-faction-terminal)' }}>
      <div
        style={{
          fontSize: 8,
          letterSpacing: '0.18em',
          color: 'color-mix(in srgb, var(--faction-singularity-card-muted) 75%, transparent)',
          textTransform: 'uppercase',
          marginBottom: 3,
        }}
      >
        {t('chrome.singularity.prompt')}
      </div>
      <div
        style={{
          fontSize: 7.5,
          fontStyle: 'italic',
          color: 'color-mix(in srgb, var(--faction-singularity-card-accent) 50%, transparent)',
          marginBottom: 12,
        }}
      >
        {t('chrome.singularity.promptHint')}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {TIERS.map((tier) => {
          const fill = SG_FILLS[tier.value] ?? SG_FILLS[1]
          const reached = selected >= tier.value
          const picked = selected === tier.value
          return (
            <div key={tier.value} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <button
                disabled={saving}
                onClick={() => void vote(tier.value)}
                aria-label={t('chrome.singularity.rateAria', { value: tier.value, label: tier.label })}
                style={{
                  position: 'relative',
                  width: KEY_SIZE,
                  height: KEY_SIZE,
                  cursor: saving ? 'default' : 'pointer',
                  padding: 0,
                  border: 'none',
                  background: reached ? fill : 'var(--faction-singularity-light)',
                  color: reached ? 'var(--faction-singularity-card-bg)' : 'color-mix(in srgb, var(--faction-singularity-card-muted) 55%, transparent)',
                  fontFamily: 'var(--font-faction-terminal)',
                  fontWeight: 700,
                  fontSize: 13,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: picked ? 'scale(1.12)' : 'none',
                  transition: 'all 110ms',
                  outline: `1px solid ${reached ? fill : 'var(--faction-singularity-border)'}`,
                  boxShadow: reached ? `0 0 12px color-mix(in srgb, ${fill} 33%, transparent)` : 'none',
                }}
              >
                {tier.value}
              </button>
              <span
                style={{
                  fontSize: 6.5,
                  letterSpacing: '0.08em',
                  color: picked ? fill : 'color-mix(in srgb, var(--faction-singularity-card-muted) 45%, transparent)',
                  maxWidth: KEY_SIZE + 8,
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
          muted: 'color-mix(in srgb, var(--faction-singularity-card-muted) 60%, transparent)',
          accent: 'var(--faction-singularity-card-accent)',
          accentFont: 'var(--font-faction-terminal)',
          avgFontSize: 17,
          errorColor: 'var(--color-danger)',
          avgLetterSpacing: '0.08em',
        }}
      />
    </div>
  )
}
