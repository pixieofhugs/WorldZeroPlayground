import { useTranslation } from 'react-i18next'
import type { ScoreMode } from './playersData'

interface ScoreToggleProps {
  mode: ScoreMode
  onChange: (mode: ScoreMode) => void
  /** `--text-*` token — the phone sets these pills a rung smaller. */
  fontSize: string
}

/**
 * Era / All-time. It drives the WHOLE page — podium, faction totals and roster
 * all read `score` or `all_time_score` off the one toggle — so it lives beside
 * the page title rather than over any one section.
 */
export default function ScoreToggle({ mode, onChange, fontSize }: ScoreToggleProps) {
  const { t } = useTranslation('common')
  const options: ReadonlyArray<{ value: ScoreMode; label: string }> = [
    { value: 'era', label: t('leaderboard.toggleEra') },
    { value: 'alltime', label: t('leaderboard.toggleAllTime') },
  ]
  return (
    <div className="flex" style={{ gap: 'var(--space-xs)', flex: 'none' }}>
      {options.map(({ value, label }) => {
        const active = mode === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={active}
            className="font-body uppercase"
            style={{
              fontSize,
              letterSpacing: '0.16em',
              padding: 'var(--space-sm) var(--space-md)',
              borderRadius: 999,
              border: `1px solid ${active ? 'var(--color-text-primary)' : 'var(--color-border-strong)'}`,
              background: active ? 'var(--color-text-primary)' : 'transparent',
              color: active ? 'var(--color-bg-page)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'color .18s ease, border-color .18s ease',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
