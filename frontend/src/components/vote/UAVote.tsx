import { useTranslation } from 'react-i18next'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteSummary } from './VoteShell'
import { VOTE_REFRAMES } from './voteReframes'

/**
 * UA (University of Asthmatics) vote UI — THE GILT SALON. The 1-5 approval is
 * cast as an acquisition/appraisal ramp: the Salon judging a filed work from a
 * polite "noted" up to the gilt "ACQUIRED" plate. Each rung is an engraved
 * museum placard on parchment, framed in old gold; the chosen rung lights up
 * in burnt amber. Always-light — the salon never dims, so every token reads
 * identically in both themes and we never touch data-theme.
 *
 * Same 1-5 data model as every other faction; purely a visual reskin driven by
 * the shared {@link useVote} hook so cast/refetch logic lives in one place.
 */

const PLATE_FONT = 'var(--faction-ua-card-font)'

const TIERS = VOTE_REFRAMES['ua'].tiers

export default function UAVote({
  praxisId,
  currentValue,
  points,
  totalVotes,
}: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)

  if (!user) {
    return <VoteLoginGate />
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        {TIERS.map((tier) => {
          const active = selected === tier.value
          const reached = selected >= tier.value
          const top = tier.value === 5
          return (
            <div
              key={tier.value}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}
            >
              <button
                disabled={saving}
                onClick={() => void vote(tier.value)}
                aria-label={t('chrome.ua.rateAria', { value: tier.value, label: tier.label })}
                style={{
                  minWidth: 60,
                  height: 40,
                  padding: '0 14px',
                  cursor: saving ? 'default' : 'pointer',
                  border: active && top ? 'none' : `1px solid ${reached ? 'var(--faction-ua-card-accent)' : 'var(--ua-line)'}`,
                  background: active
                    ? top
                      ? 'var(--ua-gilt)'
                      : 'var(--faction-ua-card-accent)'
                    : reached
                      ? 'color-mix(in srgb, var(--faction-ua-card-accent) 12%, var(--faction-ua-card-bg))'
                      : 'var(--faction-ua-card-bg)',
                  color: active
                    ? 'var(--ua-paper)'
                    : reached
                      ? 'var(--faction-ua-card-accent)'
                      : 'var(--faction-ua-card-muted)',
                  fontFamily: PLATE_FONT,
                  fontSize: 12,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  transform: active ? 'scale(1.06)' : 'none',
                  boxShadow: active
                    ? '0 4px 10px color-mix(in srgb, var(--ua-ink) 22%, transparent), inset 0 0 0 1px color-mix(in srgb, var(--ua-paper) 40%, transparent)'
                    : 'none',
                  transition: 'all 120ms',
                }}
              >
                {tier.label}
              </button>
              <span
                style={{
                  fontFamily: PLATE_FONT,
                  fontSize: 8,
                  letterSpacing: '0.14em',
                  color: active ? 'var(--faction-ua-card-accent)' : 'var(--faction-ua-card-muted)',
                  textTransform: 'uppercase',
                }}
              >
                {tier.value === 5
                  ? t('chrome.ua.plateTopMark')
                  : t('chrome.ua.plateNumber', { value: tier.value })}
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
          muted: 'var(--faction-ua-card-muted)',
          accent: 'var(--faction-ua-card-accent)',
          accentFont: PLATE_FONT,
          avgFontSize: 16,
          errorColor: 'var(--ua-orange-deep)',
          avgLetterSpacing: '0.04em',
        }}
      />
    </div>
  )
}
