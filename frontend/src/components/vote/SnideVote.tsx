import { useTranslation } from 'react-i18next'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteSummary } from './VoteShell'
import { VOTE_REFRAMES } from './voteReframes'

/**
 * S.N.I.D.E. faction vote UI — the 1-5 rating rendered as a junk-drawer of
 * mismatched rubber stamps climbing from a dismissive "meh" to a black ANARCHY
 * seal. Mixed faces, sizes, and tilts; colours are theme-aware tokens so the
 * stamps read on both the xerox-paper and concrete-night surfaces. Same 1-5
 * data model as every other faction — purely a visual reskin.
 *
 * Plugs into the vote dispatcher via the shared {@link useVote} hook so the
 * cast/refetch logic lives in exactly one place.
 */

interface StampVisual {
  /** Border + idle text colour (theme-aware token). */
  color: string
  font: string
  /** Corner rounding — square, seal, or full circle. */
  radius: number | string
  rot: number
  fontSize: number
}

/**
 * Visual tokens per tier value — labels come from voteReframes.
 *
 * ornament: each tier is a rubber stamp (rotation, radius, face, size are one
 * illustration); the sizes here draw the stamp, they are not read as text.
 */
const SNIDE_VISUALS: Record<number, StampVisual> = {
  // eslint-disable-next-line local/no-raw-style-values -- ornament: each tier is a rubber stamp; the size draws the stamp, it is not read as text.
  1: { color: 'var(--color-text-tertiary)', font: 'var(--font-body)', radius: 2, rot: -3, fontSize: 10 },
  // eslint-disable-next-line local/no-raw-style-values -- ornament: each tier is a rubber stamp; the size draws the stamp, it is not read as text.
  2: { color: '#b59a3a', font: 'var(--font-body)', radius: 2, rot: 2, fontSize: 10 },
  // eslint-disable-next-line local/no-raw-style-values -- ornament: each tier is a rubber stamp; the size draws the stamp, it is not read as text.
  3: { color: 'var(--faction-snide)', font: 'var(--faction-snide-font-cond)', radius: '50%', rot: -2, fontSize: 13 },
  // eslint-disable-next-line local/no-raw-style-values -- ornament: each tier is a rubber stamp; the size draws the stamp, it is not read as text.
  4: { color: 'var(--faction-snide-pink)', font: 'var(--faction-snide-font-black)', radius: 3, rot: 3, fontSize: 12 },
  // eslint-disable-next-line local/no-raw-style-values -- ornament: each tier is a rubber stamp; the size draws the stamp, it is not read as text.
  5: { color: 'var(--color-text-primary)', font: 'var(--faction-snide-font-black)', radius: 4, rot: -4, fontSize: 12 },
}

const TIERS = VOTE_REFRAMES['snide'].tiers

export default function SnideVote({ praxisId, currentValue, points, totalVotes }: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)

  if (!user) {
    return <VoteLoginGate />
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', alignItems: 'center' }}>
        {TIERS.map((tier) => {
          const visual = SNIDE_VISUALS[tier.value] ?? SNIDE_VISUALS[1]
          const active = selected === tier.value
          const reached = selected >= tier.value
          return (
            <button
              key={tier.value}
              disabled={saving}
              onClick={() => void vote(tier.value)}
              aria-label={t('chrome.snide.rateAria', { value: tier.value, label: tier.label })}
              style={{
                minWidth: 46,
                height: 40,
                padding: '0 var(--space-md)',
                cursor: saving ? 'default' : 'pointer',
                border: `2.5px ${tier.value === 5 ? 'double' : 'solid'} ${visual.color}`,
                borderRadius: visual.radius,
                background: active
                  ? visual.color
                  : reached
                    ? `color-mix(in srgb, ${visual.color} 16%, transparent)`
                    : 'transparent',
                color: active ? '#fff' : visual.color,
                fontFamily: visual.font,
                fontSize: visual.fontSize,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                transform: `rotate(${visual.rot}deg) scale(${active ? 1.08 : 1})`,
                boxShadow: active ? '2px 3px 0 rgba(0,0,0,0.35)' : 'none',
                transition: 'all 120ms',
              }}
            >
              {tier.label}
            </button>
          )
        })}
      </div>

      <VoteSummary
        selected={selected}
        points={points}
        totalVotes={totalVotes}
        error={error}
        theme={{
          muted: 'var(--color-text-secondary)',
          accent: 'var(--faction-snide)',
          accentFont: 'var(--faction-snide-font-impact)',
          errorColor: 'var(--color-danger)',
        }}
      />
    </div>
  )
}
