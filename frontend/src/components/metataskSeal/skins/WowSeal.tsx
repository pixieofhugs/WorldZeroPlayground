import { useTranslation } from 'react-i18next'

import { factionRoleVars } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'
import { WowBand } from '../../cardMasthead/factionBands'
import type { SealSkinProps } from '../types'

/**
 * Warriors of Whimsy seal — a court writ with a wax seal (#931), from WOW's
 * chronicle identity (ADR-0050): cream parchment, gold frame, plum ink; not
 * coven's pink. Issuer is the shared `WowBand` (#2648); the woven running-head
 * stripe hangs from it, as on the task card.
 */
export default function WowSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')

  return (
    <div
      className="relative"
      style={{
        // Role map (#2674); every read carries today's token as fallback.
        ...factionBodyVars("wow"), ...factionRoleVars('wow', 'wow-seal'),
        background: 'var(--faction-wow-chronicle-bg)',
        color: 'var(--wow-seal-ink)',
        border: '2px solid var(--faction-wow-chronicle-border)',
        // The role map's corner (#2729), shared with the picker's selection ring.
        borderRadius: 'var(--wow-seal-radius)',
        overflow: 'hidden',
        boxShadow: '0 4px 16px -8px var(--faction-wow-chronicle-shadow)',
        fontFamily: 'var(--faction-wow-body-font)',
        transition: 'background 150ms, color 150ms',
      }}
    >
      <WowBand />

      {/* the chronicle running head — a woven gold/plum stripe, no text */}
      <div
        aria-hidden="true"
        style={{
          height: 5,
          background:
            'repeating-linear-gradient(90deg, var(--faction-wow-chronicle-gold) 0 10px, var(--wow-seal-accent) 10px 20px)',
        }}
      />

      <div style={{ position: 'relative', padding: 'var(--space-md) var(--space-lg)' }}>
        {/* the wax seal — plum disc ringed in gold; ornament, never text */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 'var(--space-md)',
            right: 'var(--space-lg)',
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'var(--faction-wow-plum-surface)',
            border: '2px solid var(--faction-wow-chronicle-gold)',
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
              color: 'var(--wow-seal-accent)',
              fontSize: 'var(--text-xl)',
              cursor: 'pointer',
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}

        {/* The decree face at the kit's 0.14em heading tracking. */}
        <span
          className="block"
          style={{
            fontFamily: 'var(--wow-seal-face)',
            fontSize: 'var(--text-md)',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--wow-seal-accent)',
            marginBottom: 'var(--space-xs)',
          }}
        >
          {t('detail.seal.kind')}
        </span>

        <span
          className="block"
          style={{
            fontFamily: 'var(--faction-wow-body-font)',
            fontStyle: 'italic',
            fontSize: 'var(--text-content)',
            lineHeight: 1.3,
            color: 'var(--wow-seal-ink)',
          }}
        >
          {metatask.title}
        </span>

        <span
          className="block"
          style={{
            fontFamily: 'var(--wow-seal-face)',
            fontSize: 'var(--text-title)',
            letterSpacing: '0.03em',
            color: 'var(--faction-wow-stamp-total)',
            marginTop: 'var(--space-xs)',
          }}
        >
          {t('detail.seal.bonus', { points: metatask.point_value })}
        </span>
      </div>
    </div>
  )
}
