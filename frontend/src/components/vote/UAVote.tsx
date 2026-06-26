import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteSummary } from './VoteShell'

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

interface AppraisalRung {
  value: number
  /** Engraved placard label — the Salon's verdict. */
  label: string
}

export const UA_APPRAISALS: AppraisalRung[] = [
  { value: 1, label: 'Noted' },
  { value: 2, label: 'Sketch' },
  { value: 3, label: 'Hung' },
  { value: 4, label: 'Commended' },
  { value: 5, label: 'Acquired' },
]

const PLATE_FONT = 'var(--faction-ua-card-font)'

export default function UAVote({
  praxisId,
  currentStars,
  averageStars,
  totalVotes,
  mode = 'caster',
}: VoteUIProps) {
  const { user, selected, saving, error, vote } = useVote(praxisId, currentStars)

  if (mode === 'summary') {
    const rung =
      UA_APPRAISALS[Math.max(0, Math.round(averageStars ?? 0) - 1)] ?? UA_APPRAISALS[0]
    const acquired = rung.value === 5
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div
          style={{
            minWidth: 50,
            height: 30,
            padding: '0 9px',
            border: '1px solid var(--ua-line)',
            background: acquired ? 'var(--ua-gilt)' : 'var(--faction-ua-card-bg)',
            color: acquired ? 'var(--ua-paper)' : 'var(--faction-ua-card-accent)',
            fontFamily: PLATE_FONT,
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: acquired ? 'inset 0 0 0 1px color-mix(in srgb, var(--ua-paper) 45%, transparent)' : 'none',
          }}
        >
          {rung.label}
        </div>
        <span
          style={{
            fontFamily: PLATE_FONT,
            fontSize: 7,
            letterSpacing: '0.1em',
            color: 'var(--faction-ua-card-muted)',
            textAlign: 'center',
          }}
        >
          {totalVotes ?? 0} appraisals
        </span>
      </div>
    )
  }

  if (!user) {
    return <VoteLoginGate />
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        {UA_APPRAISALS.map((rung) => {
          const active = selected === rung.value
          const reached = selected >= rung.value
          const top = rung.value === 5
          return (
            <div
              key={rung.value}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}
            >
              <button
                disabled={saving}
                onClick={() => void vote(rung.value)}
                aria-label={`Appraise ${rung.value} — ${rung.label}`}
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
                {rung.label}
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
                {rung.value === 5 ? '✦' : `№${rung.value}`}
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
