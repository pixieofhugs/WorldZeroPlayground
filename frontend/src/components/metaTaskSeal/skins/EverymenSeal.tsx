import { useTranslation } from 'react-i18next'

import { factionName } from '../../../utils/factions'
import type { SealSkinProps } from '../types'

/**
 * Everymen seal — a union-broadsheet dispatch stamped onto the host praxis.
 * Same three-field contract as every seal: cream paper, red masthead rule,
 * Bebas Neue caps for the condition, a rubber-stamped bonus circle.
 */
export default function EverymenSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <div
      className="relative"
      style={{
        background: 'var(--everymen-paper)',
        color: 'var(--everymen-paper-text)',
        border: '1.5px solid var(--everymen-ink)',
        boxShadow: '0 0 0 3px var(--everymen-paper), 0 0 0 4px var(--everymen-ink)',
        padding: 'var(--space-md) var(--space-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
      }}
    >
      {removable && (
        <button
          type="button"
          onClick={() => onRemove?.(metatask.id)}
          aria-label={t('detail.seal.remove')}
          className="absolute font-body leading-none"
          style={{
            top: 'var(--space-sm)',
            right: 'var(--space-sm)',
            background: 'transparent',
            border: 'none',
            color: 'var(--everymen-red)',
            fontSize: 'var(--text-xl)',
            cursor: 'pointer',
          }}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}

      <div className="flex-1" style={{ minWidth: 0 }}>
        <span
          className="eyebrow block"
          style={{ color: 'var(--everymen-muted)' }}
        >
          {t('detail.seal.label', { faction })}
        </span>

        <span
          className="font-body block"
          style={{
            fontFamily: 'var(--faction-everymen-card-font)',
            fontSize: 'var(--text-content)',
            letterSpacing: '0.01em',
            marginTop: 'var(--space-xs)',
          }}
        >
          {metatask.title}
        </span>
      </div>

      <div
        style={{
          width: 52,
          height: 52,
          flexShrink: 0,
          borderRadius: '50%',
          border: '2px solid var(--everymen-red)',
          boxShadow: 'inset 0 0 0 2px var(--everymen-red)',
          color: 'var(--everymen-red)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          transform: 'rotate(-8deg)',
          mixBlendMode: 'multiply',
          fontFamily: 'var(--faction-everymen-card-font)',
          fontSize: 'var(--text-lg)',
          lineHeight: 1.05,
          padding: 'var(--space-xs)',
        }}
      >
        {t('detail.seal.bonus', { points: metatask.point_value })}
      </div>
    </div>
  )
}
