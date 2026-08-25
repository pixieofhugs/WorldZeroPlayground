import { useTranslation } from 'react-i18next'

import { UaBand } from '../../cardMasthead/factionBands'
import type { SealSkinProps } from '../types'
import { factionRoleVars } from '../../../utils/factionRoles'

/**
 * UA seal — a wax-lotus note pressed into the host praxis, "a note on
 * refinement". Same three-field contract as every seal, in UA's gilt-salon
 * voice: an EB Garamond condition on sun-bleached parchment, and the bonus
 * struck in vermil display type beside a lotus wax disc.
 *
 * THE CORMORANT EYEBROW IS THE SHARED BAND NOW (#2648) — `UaBand`, the leaf's
 * frozen orange mast under its frozen warm white, with the ensō handed the same
 * ink so mark and wordmark read as one lettering. The hairline that sat under
 * the eyebrow went with it: it existed to separate the eyebrow from the body,
 * and a filled band's own edge does that.
 *
 * THE LOTUS DISC MOVED INTO THE BODY. It is pressed into the note's paper at the
 * corner; left on the root it would have been pressed into the mast, which is a
 * different material.
 */
export default function UaSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')

  return (
    <div
      className="relative"
      style={{
        /* The nine roles under this surface's prefix (#2659/#2673). */
        ...factionRoleVars('ua', 'leaf-metatask-seal'),
        background: 'var(--faction-ua-card-parchment)',
        color: 'var(--leaf-metatask-seal-ink)',
        border: '1px solid var(--faction-ua-card-frame)',
        borderRadius: 3,
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

        {/* The leaf's caption hand — the card face, tracked, in the vermilion
            the parchment already reserves for a small mark on it. */}
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
