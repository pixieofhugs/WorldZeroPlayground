import { useTranslation } from 'react-i18next'
import { factionCssVar, factionFill, isKnownFaction } from '../../utils/factions'

/**
 * A wrapping row of "level ≥ N" circles (#1824): 2px border in every state so
 * selection never reflows. The active node takes the selected faction's tint,
 * or the spectrum frame for na/undefined (ADR-0039). Callers own the label.
 */

interface Props {
  levels: number[]
  value: number | ''
  onChange: (level: number | '') => void
  /** Undefined = unaffiliated. */
  factionSlug?: string
}

export default function FilterLevelNodes({ levels, value, onChange, factionSlug }: Props) {
  const { t } = useTranslation('common')
  const known = isKnownFaction(factionSlug)
  const tint = factionCssVar(factionSlug)
  return (
    <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-xs)' }}>
      {levels.map((level) => {
        const active = value === level
        // A spectrum can't be a border-colour: na gets a frame, spread last.
        const frameStyle = active && !known ? factionFill(null, 'frame') : undefined
        return (
          <button
            key={level}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(value === level ? '' : level)}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              boxSizing: 'border-box',
              border: `2px solid ${active && known ? tint : 'var(--color-border-strong)'}`,
              background:
                active && known
                  ? `color-mix(in srgb, ${tint} 18%, var(--color-bg-surface))`
                  : 'var(--color-bg-surface)',
              color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-md)',
              fontWeight: active ? 700 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 120ms',
              padding: 0,
              ...frameStyle,
            }}
          >
            {t('filters.levelAtLeast', { level })}
          </button>
        )
      })}
    </div>
  )
}
