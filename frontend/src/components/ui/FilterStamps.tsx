import { useTranslation } from 'react-i18next'

/**
 * Status filter — Rubber Stamps (Style Guide §5.3).
 * Rectangular, no border-radius, inner dashed border, bold uppercase.
 * Active/inactive colors use CSS variables so dark mode is handled by the cascade.
 */

interface Props {
  options: string[]
  value: string
  onChange: (value: string) => void
  /** Group eyebrow. Defaults to the status label for the original Tasks call
   *  site; other filters (type / voted / sort) pass their own (#644). */
  label?: string
  /** Per-option display text keyed by option value, when the option strings are
   *  internal keys rather than the label to show (e.g. localized type names).
   *  Falls back to the option string itself (the original Tasks behaviour). */
  optionLabels?: Record<string, string>
}

export default function FilterStamps({ options, value, onChange, label, optionLabels }: Props) {
  const { t } = useTranslation('common')
  return (
    <div className="flex gap-1.5 items-center">
      <span className="eyebrow">{label ?? t('filters.status')}</span>
      {options.map((option) => {
        const active = value === option
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            style={{
              position: 'relative',
              border: `2px solid ${active ? 'var(--color-text-primary)' : 'var(--color-border-strong)'}`,
              borderRadius: 0,
              background: active ? 'var(--color-text-primary)' : 'var(--color-bg-surface)',
              color: active ? 'var(--color-bg-page)' : 'var(--color-text-primary)',
              fontFamily: "'Courier Prime', monospace",
              fontSize: 'var(--text-base)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: '5px 10px',
              cursor: 'pointer',
              transition: 'all 120ms',
            }}
          >
            <span
              style={{
                position: 'absolute',
                inset: 2,
                border: `1px dashed ${active ? 'var(--stamp-active-dashed)' : 'var(--stamp-inactive-dashed)'}`,
                pointerEvents: 'none',
              }}
            />
            {optionLabels?.[option] ?? option}
          </button>
        )
      })}
    </div>
  )
}
