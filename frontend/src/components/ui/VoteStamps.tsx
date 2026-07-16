import { useTranslation } from 'react-i18next'
import { useVote } from '../vote/useVote'
import type { VoteUIProps } from '../vote/VoteUI'

/**
 * Stamp-style vote buttons replacing star rating (Style Guide §13.1).
 * Five rectangular stamps numbered 1–5 with word labels and value-specific colors.
 *
 * The fallback every unregistered / `na`-faction praxis renders, so it drives
 * from the shared {@link useVote} hook exactly like the seven faction variants
 * do — cast, error handling and the tally override (#626) stay in one place.
 * It keeps its own summary markup because its copy is the common:voteStamps
 * catalog branch rather than votes:chrome.
 */

interface StampConfig {
  value: number
  label: string
  color: string
}

export default function VoteStamps({ praxisId, currentValue, points, totalVotes }: VoteUIProps) {
  const { t } = useTranslation('common')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)

  const stamps: StampConfig[] = [
    { value: 1, label: t('voteStamps.a-start'), color: 'var(--vote-1)' },
    { value: 2, label: t('voteStamps.solid'), color: 'var(--vote-2)' },
    { value: 3, label: t('voteStamps.good'), color: 'var(--vote-3)' },
    { value: 4, label: t('voteStamps.excellent'), color: 'var(--vote-4)' },
    { value: 5, label: t('voteStamps.legendary'), color: 'var(--vote-5)' },
  ]

  return (
    <div>
      {/* Stamp buttons — hidden for logged-out users */}
      {!user ? (
        <p className="eyebrow">{t('voteStamps.loginPrompt')}</p>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {stamps.map((stamp) => {
            const active = selected === stamp.value
            return (
              <div key={stamp.value} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <button
                  disabled={saving}
                  onClick={() => void vote(stamp.value)}
                  className={active ? 'vote-stamp vote-stamp-active' : 'vote-stamp'}
                  style={{ '--stamp-color': stamp.color } as React.CSSProperties}
                  aria-label={t('voteStamps.rateAria', { value: stamp.value, label: stamp.label })}
                >
                  {/* Inner dashed border on selected */}
                  {active && (
                    <span
                      style={{
                        position: 'absolute',
                        inset: 2,
                        border: '1px dashed color-mix(in srgb, var(--color-text-on-accent) 25%, transparent)',
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
      )}

      {/* Vote economy info */}
      {selected > 0 && (
        <p className="font-body" style={{ fontSize: 8, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
          {t('voteStamps.voted', { count: selected })}
        </p>
      )}

      {/* Summary */}
      {points != null && (
        <p className="font-body" style={{ fontSize: 9, color: 'var(--color-text-secondary)' }}>
          {t('voteStamps.summary', { count: totalVotes ?? 0, points })}
        </p>
      )}

      {error && <p className="font-body" style={{ fontSize: 9, color: 'var(--color-danger)', marginTop: 4 }}>{error}</p>}
    </div>
  )
}
