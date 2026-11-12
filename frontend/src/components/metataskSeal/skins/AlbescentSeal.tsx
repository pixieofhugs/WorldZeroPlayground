import { useTranslation } from 'react-i18next'

import { AlbescentBand } from '../sealBands'
import { factionCssVar } from '../../../utils/factions'
import type { SealSkinProps } from '../types'

/**
 * Albescent seal — a sticker on someone else's card (#930). Flat na sheet, NOT
 * the prism (#2632): on an Albescent host the card is already `.alb-prism`, so
 * reading the sheet triple would paint the bloom twice. Flat card bg + hairline
 * keep it a distinct object. Albescent owns no hue (ADR-0048, #783); ink tiers
 * match `DefaultSeal`. Its one colour moves: `.spectrum-rule` under `alb-moves`
 * (#2500), held by `AlbescentBand` as the band's rule (#2648; see sealBands.tsx
 * for why a seal may fly that band).
 */
export default function AlbescentSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')

  return (
    <div
      className="relative alb-moves"
      style={{
        background: 'var(--faction-default-card-bg)',
        color: 'var(--faction-default-card-text)',
        border: '1px solid var(--faction-default-card-line)',
        // The token's corner (#2729), shared with the picker's selection ring.
        borderRadius: factionCssVar('albescent', 'card-radius'),
        boxShadow: '0 2px 18px var(--color-cast-shadow-soft), 0 1px 3px var(--color-cast-shadow-soft)',
        fontFamily: 'var(--font-faction-serif)',
        overflow: 'hidden',
      }}
    >
      <AlbescentBand />

      {/* Padding lives on the body (the band is full-bleed); the peel control
          positions against it, not the band's link. */}
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
              zIndex: 2,
              background: 'transparent',
              border: 'none',
              color: 'var(--faction-default-card-muted)',
              fontSize: 'var(--text-xl)',
              cursor: 'pointer',
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}

        {/* What the object is; the band says whose. */}
        <span
          className="font-body block"
          style={{
            fontSize: 'var(--text-md)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'var(--faction-default-card-muted)',
            marginBottom: 'var(--space-xs)',
          }}
        >
          {t('detail.seal.kind')}
        </span>

        <span
          className="block"
          style={{
            fontSize: 'var(--text-content)',
            color: 'var(--faction-default-card-text)',
          }}
        >
          {metatask.title}
        </span>

        <span
          className="block"
          style={{
            fontSize: 'var(--text-title)',
            fontWeight: 600,
            letterSpacing: '0.02em',
            color: 'var(--faction-default-card-accent)',
            marginTop: 'var(--space-xs)',
          }}
        >
          {t('detail.seal.bonus', { points: metatask.point_value })}
        </span>
      </div>
    </div>
  )
}
