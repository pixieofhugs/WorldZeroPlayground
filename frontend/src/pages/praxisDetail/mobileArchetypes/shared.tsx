/**
 * Shared mobile praxis-detail chrome (#499).
 *
 * MobileStarVote — a thumb-sized 1-5 star caster. It is a presentational shell
 * over the existing {@link useVote} hook (exactly like the faction vote UIs), so
 * casting still records through castVote/refetch — no voting logic is
 * reimplemented here. The only mobile-specific change is larger touch targets
 * (48px star buttons) for the feed-detail surface. Logged-out viewers get the
 * shared VoteLoginGate; the points/vote tally reuses the shared VoteSummary
 * (#375: a running tally, never an average).
 */
import { useTranslation } from 'react-i18next'
import { useVote } from '../../../components/vote/useVote'
import { VoteLoginGate, VoteSummary } from '../../../components/vote/VoteShell'

const STAR_TILE = 48

/** Filled or outline star glyph. */
function StarGlyph({ filled, color, size = 34 }: { filled: boolean; color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 18.9 6.1 21l1.3-6.5-4.9-4.6 6.6-.8z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={filled ? 1 : 1.6}
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function MobileStarVote({
  praxisId,
  currentValue,
  points,
  totalVotes,
  accent = 'var(--color-accent)',
  accentFont = 'var(--font-display)',
}: {
  praxisId: number
  currentValue?: number
  points?: number | null
  totalVotes?: number
  /** Faction tint for filled stars + the tally figure. */
  accent?: string
  accentFont?: string
}) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)

  if (!user) return <VoteLoginGate />

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
        {[1, 2, 3, 4, 5].map((value) => {
          const filled = selected >= value
          return (
            <button
              key={value}
              type="button"
              disabled={saving}
              onClick={() => void vote(value)}
              aria-label={t('chrome.mobile.rateAria', { value })}
              style={{
                width: STAR_TILE,
                height: STAR_TILE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: saving ? 'default' : 'pointer',
              }}
            >
              <StarGlyph filled={filled} color={filled ? accent : 'var(--color-text-tertiary)'} />
            </button>
          )
        })}
      </div>

      <div style={{ textAlign: 'center' }}>
        <VoteSummary
          selected={selected}
          points={points}
          totalVotes={totalVotes}
          error={error}
          theme={{
            muted: 'var(--color-text-tertiary)',
            accent,
            accentFont,
            avgFontSize: 15,
            errorColor: 'var(--color-danger)',
          }}
        />
      </div>
    </div>
  )
}
