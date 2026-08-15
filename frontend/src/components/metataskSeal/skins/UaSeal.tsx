import { useTranslation } from 'react-i18next'

import { factionName } from '../../../utils/factions'
import type { SealSkinProps } from '../types'

/**
 * UA seal — a wax-lotus note pressed into the host praxis, "a note on
 * refinement". Same three-field contract as every seal, in UA's gilt-salon
 * voice: Cormorant small-caps eyebrow on sun-bleached parchment, an EB Garamond
 * condition, and the bonus struck in vermil display type beside a lotus wax disc.
 */
export default function UaSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <div
      className="relative"
      style={{
        background: 'var(--faction-ua-card-parchment)',
        color: 'var(--faction-ua-card-text)',
        border: '1px solid var(--faction-ua-card-frame)',
        borderRadius: 3,
        padding: 'var(--space-md) var(--space-lg)',
        fontFamily: 'var(--faction-ua-card-font)',
        overflow: 'hidden',
      }}
    >
      {/* the lotus wax disc — ornament, never text (--faction-ua-card-lotus) */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 'var(--space-md)',
          right: 'var(--space-lg)',
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: 'var(--faction-ua-card-lotus)',
          opacity: 'var(--faction-ua-card-lotus-opacity)',
        }}
      />

      {removable && (
        <button
          type="button"
          onClick={() => onRemove?.(metatask.id)}
          aria-label={t('detail.seal.remove')}
          className="absolute font-body leading-none"
          style={{
            top: 'var(--space-sm)',
            right: 'var(--space-sm)',
            zIndex: 2,
            background: 'transparent',
            border: 'none',
            color: 'var(--faction-ua-card-accent)',
            fontSize: 'var(--text-xl)',
            cursor: 'pointer',
          }}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}

      <span
        className="label-heading block"
        style={{
          fontFamily: 'var(--faction-ua-card-font)',
          color: 'var(--faction-ua-card-accent)',
        }}
      >
        {t('detail.seal.label', { faction })}
      </span>

      <span
        aria-hidden="true"
        className="block"
        style={{
          height: 1,
          background: 'var(--faction-ua-card-rule)',
          margin: 'var(--space-xs) 0 var(--space-sm)',
        }}
      />

      <span
        className="block"
        style={{
          fontFamily: 'var(--faction-ua-body-font)',
          fontSize: 'var(--text-content)',
          color: 'var(--faction-ua-card-text)',
        }}
      >
        {metatask.title}
      </span>

      <span
        className="block"
        style={{
          fontFamily: 'var(--faction-ua-card-font)',
          fontSize: 'var(--text-title)',
          fontWeight: 600,
          letterSpacing: '0.02em',
          color: 'var(--faction-ua-card-total)',
          marginTop: 'var(--space-xs)',
        }}
      >
        {t('detail.seal.bonus', { points: metatask.point_value })}
      </span>
    </div>
  )
}
