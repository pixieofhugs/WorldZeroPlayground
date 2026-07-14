import { useTranslation } from 'react-i18next'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteSummary } from './VoteShell'
import { VOTE_REFRAMES } from './voteReframes'

/**
 * Albescent vote UI — BEAR WITNESS (#232). The 1-5 approval is recast as an act
 * of witnessing: how completely was a task attended, from "Unseeing" up to the
 * final "Inscribed". Five grayscale cross-hair marks in rising ink — no hue, no
 * numerals; the chosen mark takes a white centre. Albescent refuses the palette.
 *
 * Same 1-5 data model as every faction — a visual reskin over the shared
 * {@link useVote} hook, so cast/refetch logic stays in one place. Always-light:
 * every --faction-albescent-* token is identical in both themes; the rising
 * shades derive from the ink token via color-mix (no hardcoded hex — CLAUDE.md).
 * Design: docs/design/albescent-kit `AlWitnessWidget`.
 */

const INK = 'var(--faction-albescent-card-text)'
const FONT = 'var(--faction-albescent-card-font)' // Cormorant Garamond
const MONO = 'var(--faction-albescent-mono)' // Courier Prime

const TIERS = VOTE_REFRAMES['albescent'].tiers

// Rising ink weight per mark (1 → 5), mixed from the near-black ink token.
const SHADE_PCT = [16, 30, 48, 66, 84]
const shade = (value: number): string =>
  `color-mix(in srgb, ${INK} ${SHADE_PCT[value - 1]}%, transparent)`

export default function AlbescentVote({
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
      <div
        style={{
          fontFamily: MONO,
          fontSize: 7,
          letterSpacing: '0.26em',
          textTransform: 'uppercase',
          color: 'var(--faction-albescent-text-faint)',
          marginBottom: 10,
        }}
      >
        {t('chrome.albescent.prompt')}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
        {TIERS.map((tier) => {
          const reached = selected >= tier.value
          const picked = selected === tier.value
          const marked = shade(tier.value)
          return (
            <div
              key={tier.value}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, minWidth: 44 }}
            >
              <button
                disabled={saving}
                onClick={() => void vote(tier.value)}
                aria-label={t('chrome.albescent.rateAria', { value: tier.value, label: tier.label })}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  padding: 0,
                  cursor: saving ? 'default' : 'pointer',
                  border: `1.5px solid ${marked}`,
                  background: reached ? marked : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 200ms ease',
                }}
              >
                {picked && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--faction-albescent-surface)',
                    }}
                  />
                )}
              </button>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 6.5,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  color: picked ? 'var(--faction-albescent-card-accent)' : 'var(--faction-albescent-card-muted)',
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
          muted: 'var(--faction-albescent-card-muted)',
          accent: 'var(--faction-albescent-card-accent)',
          accentFont: FONT,
          avgFontSize: 16,
          errorColor: 'var(--faction-albescent-card-accent)',
          avgLetterSpacing: '0.04em',
        }}
      />
    </div>
  )
}
