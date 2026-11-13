import { useTranslation } from 'react-i18next'

import { factionSpectrumSheet } from '../../../utils/factions'
import { factionRoleVars } from '../../../utils/factionRoles'
import { DefaultBand } from '../sealBands'
import type { SealSkinProps } from '../types'

/**
 * The neutral seal (#930): the `na` seal and the fallback for any issuer without
 * a skin. Its signature is the spectrum painted into the border box (#2520), the
 * na kit's one material, so `DefaultBand` carries no ramp of its own.
 *
 * ponytail: an unskinned issuer gets na's band; the manifest is 9/9 so that's
 * theoretical. A tenth faction without a seal wants its own band.
 */
export default function DefaultSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')

  return (
    <div
      className="relative"
      style={{
        // Role map (#2672) pinned to na: the slug-blind frame below means its
        // inks may not take a slug either (#2361). The helper owns the
        // three-list ramp composition.
        ...factionRoleVars('na', 'na-seal'),
        border: '3px solid transparent',
        ...factionSpectrumSheet(),
        color: 'var(--na-seal-ink)',
        // The role map's corner (#2729), shared with the picker's selection ring.
        borderRadius: 'var(--na-seal-radius)',
        overflow: 'hidden',
      }}
    >
      <DefaultBand />

      {/* The peel control positions here so it never shares a hit target with the band's link. */}
      <div className="relative" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
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
              color: 'var(--na-seal-quiet)',
              fontSize: 'var(--text-xl)',
              cursor: 'pointer',
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}

        {/* What the object is; the band spells the faction. */}
        <span
          className="font-body block"
          style={{
            fontSize: 'var(--text-md)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'var(--na-seal-quiet)',
            marginBottom: 'var(--space-xs)',
          }}
        >
          {t('detail.seal.kind')}
        </span>

        <span
          className="font-body block"
          style={{
            fontSize: 'var(--text-content)',
            color: 'var(--na-seal-ink)',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          {metatask.title}
        </span>

        <span
          className="font-display block"
          style={{
            fontSize: 'var(--text-title)',
            color: 'var(--na-seal-accent)',
            marginTop: 'var(--space-xs)',
          }}
        >
          {t('detail.seal.bonus', { points: metatask.point_value })}
        </span>
      </div>
    </div>
  )
}
