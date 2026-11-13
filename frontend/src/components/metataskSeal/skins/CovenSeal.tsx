import { useTranslation } from 'react-i18next'

import { CovenBand } from '../../cardMasthead/factionBands'
import { factionCssVar } from '../../../utils/factions'
import {
  Braid,
  CAPTION,
  CARD,
  BORDER,
  DEEP,
  DISPLAY,
  GOLD,
  HOLD_INK,
  INK,
  SHADOW,
} from '../../factionMarks/covenSlip'
import type { SealSkinProps } from '../types'
import { factionBodyVars } from '../../../utils/factionBodyFace'

/**
 * Cozy Coven seal (#1209) — a spell slip tied on with a braided thread (the
 * braid holds it to the praxis, so it stays at the very top, full-bleed). The
 * tilt stays: a slip pressed onto a praxis sits crooked. Bonus chip pair is
 * slip-gold under ward-hold-ink (6.20:1 light / 7.03:1 dark).
 *
 * #2636/#2648: the head reads pink by day via `CovenBand` (already pink under
 * white, unchanged at night). The ward card ground is NOT tinted: it's a shared
 * Coven ground read by six surfaces.
 */
export default function CovenSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')

  return (
    <div
      className="relative"
      style={{ ...factionBodyVars("coven"),
        background: CARD,
        color: INK,
        border: `2px solid ${BORDER}`,
        // The token's corner (#2729), shared with the picker's selection ring.
        borderRadius: factionCssVar('coven', 'card-radius'),
        boxShadow: SHADOW,
        transform: 'rotate(-0.6deg)',
        overflow: 'hidden',
      }}
    >
      <Braid />

      <CovenBand />

      <div
        className="relative"
        style={{ padding: 'var(--space-md) var(--space-lg) var(--space-md)' }}
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
              zIndex: 2,
              background: 'transparent',
              border: 'none',
              color: DEEP,
              fontSize: 'var(--text-xl)',
              cursor: 'pointer',
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}

        {/* What the object is; the band says whose. */}
        <span className="block" style={{ ...CAPTION, marginBottom: 'var(--space-xs)' }}>
          {t('detail.seal.kind')}
        </span>

        <span
          className="block"
          style={{
            fontFamily: DISPLAY,
            fontWeight: 600,
            fontSize: 'var(--text-title)',
            lineHeight: 1.1,
            letterSpacing: '0.005em',
            color: INK,
          }}
        >
          {metatask.title}
        </span>

        <span
          className="inline-block"
          style={{
            background: GOLD,
            color: HOLD_INK,
            fontFamily: 'var(--font-faction-script)',
            fontSize: 'var(--text-lg)',
            fontWeight: 700,
            letterSpacing: '0.04em',
            padding: 'var(--space-xs) var(--space-sm)',
            borderRadius: 8,
            marginTop: 'var(--space-sm)',
            transform: 'rotate(-1.5deg)',
          }}
        >
          {t('detail.seal.bonus', { points: metatask.point_value })}
        </span>
      </div>
    </div>
  )
}
