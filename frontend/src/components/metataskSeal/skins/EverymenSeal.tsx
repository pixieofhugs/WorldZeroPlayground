import { useTranslation } from 'react-i18next'

import { EverymenBand } from '../../cardMasthead/factionBands'
import type { SealSkinProps } from '../types'
import { factionRoleVars } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'

/**
 * Everymen seal — a union-broadsheet dispatch with a rubber-stamped bonus
 * circle. The mast is the shared `EverymenBand` (#2648), so the root is a
 * column and the condition/bonus flex row lives on the body.
 */
export default function EverymenSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')

  return (
    <div
      className="relative"
      style={{
        ...factionBodyVars("everymen"), ...factionRoleVars('everymen', 'ev-seal'),
        background: 'var(--everymen-paper)',
        color: 'var(--everymen-paper-text)',
        border: '1.5px solid var(--everymen-ink)',
        // The role map's corner (#2729), shared with the picker's selection ring.
        borderRadius: 'var(--ev-seal-radius)',
        boxShadow: '0 0 0 3px var(--everymen-paper), 0 0 0 4px var(--everymen-ink)',
      }}
    >
      <EverymenBand />

      <div
        className="relative"
        style={{
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
          {/* What the object is; the band names the faction. */}
          <span
            className="font-body block"
            style={{
              fontSize: 'var(--text-md)',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: 'var(--everymen-muted)',
              marginBottom: 'var(--space-xs)',
            }}
          >
            {t('detail.seal.kind')}
          </span>

          <span
            className="font-body block"
            style={{
              fontFamily: 'var(--ev-seal-face)',
              fontSize: 'var(--text-content)',
              letterSpacing: '0.01em',
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
            fontFamily: 'var(--ev-seal-face)',
            fontSize: 'var(--text-lg)',
            lineHeight: 1.05,
            padding: 'var(--space-xs)',
          }}
        >
          {t('detail.seal.bonus', { points: metatask.point_value })}
        </div>
      </div>
    </div>
  )
}
