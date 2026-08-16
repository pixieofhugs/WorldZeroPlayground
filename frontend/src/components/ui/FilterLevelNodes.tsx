import { useTranslation } from 'react-i18next'
import { factionCssVar, factionFill, isKnownFaction } from '../../utils/factions'

/**
 * Level nodes — a wrapping row of circles, each meaning "level ≥ N".
 *
 * Redrawn in #1824 to the propose form's one geometry: 40px circles with a 2px
 * border in EVERY state, matching the faction chips above them, so a selection
 * changes colour and nothing else moves. The connector bars and the
 * `scale(1.15)` on the active node went with that — a scaling node in a
 * wrapping row is the one thing that CAN reflow it.
 *
 * `factionSlug` is the selected faction, and it is what makes the row part of
 * the same sentence as the chips: the active node takes that faction's tint,
 * and an unaffiliated selection takes the spectrum as a frame rather than
 * degrading to grey (ADR-0039 — `factionCssVar('na')` is neutral by design).
 * Undefined behaves as na.
 *
 * It carries NO label. The propose form renders its own "Minimum Level" above
 * the row, so the internal `label-heading` this used to draw announced the
 * field twice. Callers own the label; the preview cells supply their own.
 *
 * Colours are CSS variables, so dark mode arrives through the cascade.
 */

interface Props {
  levels: number[]
  value: number | ''
  onChange: (level: number | '') => void
  /** Selected faction, for the active node's accent. Undefined = unaffiliated. */
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
        // The spectrum can't be a border-colour, so na's selection arrives as a
        // frame spread last — same treatment the selected chip takes.
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
