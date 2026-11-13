import { useTranslation } from 'react-i18next'

import { UaBand } from '../../cardMasthead/factionBands'
import type { SealSkinProps } from '../types'
import { factionRoleVars } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'

/**
 * UA seal — a wax-lotus note on sun-bleached parchment. Issuer is the shared
 * `UaBand` (#2648); its filled edge replaces the old hairline. The lotus disc
 * lives in the body: on the root it would press into the mast.
 */
export default function UaSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')

  return (
    <div
      className="relative"
      style={{
        /* The nine roles under this surface's prefix (#2659/#2673). */
        ...factionBodyVars("ua"), ...factionRoleVars('ua', 'leaf-metatask-seal'),
        background: 'var(--faction-ua-card-parchment)',
        color: 'var(--leaf-metatask-seal-ink)',
        border: '1px solid var(--faction-ua-card-frame)',
        // The role map's corner (#2729), shared with the picker's selection ring.
        borderRadius: 'var(--leaf-metatask-seal-radius)',
        fontFamily: 'var(--leaf-metatask-seal-face)',
        overflow: 'hidden',
      }}
    >
      <UaBand />

      <div className="relative" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
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
              color: 'var(--leaf-metatask-seal-accent)',
              fontSize: 'var(--text-xl)',
              cursor: 'pointer',
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}

        {/* The card face, tracked, in the parchment's vermilion. */}
        <span
          className="block"
          style={{
            fontFamily: 'var(--leaf-metatask-seal-face)',
            fontSize: 'var(--text-md)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'var(--leaf-metatask-seal-accent)',
            marginBottom: 'var(--space-xs)',
          }}
        >
          {t('detail.seal.kind')}
        </span>

        <span
          className="block"
          style={{
            fontFamily: 'var(--faction-ua-body-font)',
            fontSize: 'var(--text-content)',
            color: 'var(--leaf-metatask-seal-ink)',
          }}
        >
          {metatask.title}
        </span>

        <span
          className="block"
          style={{
            fontFamily: 'var(--leaf-metatask-seal-face)',
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
    </div>
  )
}
