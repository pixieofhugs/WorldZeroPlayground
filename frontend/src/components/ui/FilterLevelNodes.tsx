import { useTranslation } from 'react-i18next'

/**
 * Level filter — Connected Nodes (Style Guide §5.3).
 * Row of circles connected by horizontal bars. Active: dark fill, scale(1.15).
 * Colors use CSS variables so dark mode is handled by the cascade.
 */

interface Props {
  levels: number[]
  value: number | ''
  onChange: (level: number | '') => void
}

export default function FilterLevelNodes({ levels, value, onChange }: Props) {
  const { t } = useTranslation('common')
  return (
    <div className="flex items-center">
      <span className="eyebrow mr-2">{t('filters.level')}</span>
      {levels.map((level, index) => {
        const active = value === level
        return (
          <div key={level} className="flex items-center">
            {index > 0 && (
              <div style={{ width: 12, height: 2, background: 'var(--color-border-strong)' }} />
            )}
            <button
              type="button"
              onClick={() => onChange(value === level ? '' : level)}
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                border: `2px solid ${active ? 'var(--color-text-primary)' : 'var(--color-border-strong)'}`,
                background: active ? 'var(--color-text-primary)' : 'var(--color-bg-surface)',
                color: active ? 'var(--color-bg-page)' : 'var(--color-text-tertiary)',
                fontFamily: "'Courier Prime', monospace",
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: active ? 'scale(1.15)' : 'scale(1)',
                transition: 'all 120ms',
                padding: 0,
              }}
            >
              {t('filters.levelAtLeast', { level })}
            </button>
          </div>
        )
      })}
    </div>
  )
}
