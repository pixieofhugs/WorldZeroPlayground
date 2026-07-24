import { useTranslation } from 'react-i18next'

import { factionName } from '../../../utils/factions'
import type { SealSkinProps } from '../types'

/**
 * Cozy Coven seal — a hand-lettered sticker pressed on with a strip of washi
 * tape. Same three-field contract as every seal (label / condition / bonus) but
 * in Coven's own voice: Caveat script on blush sticker stock, a pink hairline
 * edge, and the bonus punched out as a little gummed stamp chip.
 */
export default function CovenSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <div
      className="relative"
      style={{
        background: 'var(--faction-coven-sticker-bg)',
        color: 'var(--faction-coven-sticker-muted)',
        border: '1px solid var(--faction-coven-sticker-border)',
        borderRadius: 14,
        padding: 'var(--space-lg) var(--space-lg) var(--space-md)',
        boxShadow: '0 3px 10px var(--faction-coven-sticker-shadow)',
        fontFamily: 'var(--faction-coven-card-font)',
        transform: 'rotate(-0.6deg)',
        overflow: 'hidden',
      }}
    >
      {/* washi tape holding the sticker to the host praxis */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -8,
          left: '50%',
          width: 72,
          height: 20,
          marginLeft: -36,
          background: 'var(--faction-coven-tape)',
          transform: 'rotate(-2.5deg)',
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
            color: 'var(--faction-coven-sticker-accent)',
            fontSize: 'var(--text-xl)',
            cursor: 'pointer',
          }}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}

      <span
        className="eyebrow block"
        style={{ color: 'var(--faction-coven-sticker-accent)' }}
      >
        {t('detail.seal.label', { faction })}
      </span>

      <span
        className="block"
        style={{
          fontFamily: 'var(--faction-coven-card-font)',
          fontSize: 'var(--text-title)',
          lineHeight: 1.1,
          color: 'var(--faction-coven-title-text)',
          marginTop: 'var(--space-xs)',
        }}
      >
        {metatask.title}
      </span>

      <span
        className="inline-block font-body"
        style={{
          background: 'var(--faction-coven-stamp-chip-bg)',
          color: 'var(--faction-coven-stamp-chip-text)',
          fontSize: 'var(--text-lg)',
          fontWeight: 700,
          letterSpacing: '0.04em',
          padding: 'var(--space-xs) var(--space-sm)',
          borderRadius: 6,
          marginTop: 'var(--space-sm)',
          transform: 'rotate(-1.5deg)',
          boxShadow: '0 1px 3px var(--faction-coven-stamp-shadow)',
        }}
      >
        {t('detail.seal.bonus', { points: metatask.point_value })}
      </span>
    </div>
  )
}
