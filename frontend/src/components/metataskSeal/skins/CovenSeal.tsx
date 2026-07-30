import { useTranslation } from 'react-i18next'

import { factionName } from '../../../utils/factions'
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

/**
 * Cozy Coven seal (#1209) — a spell slip tied on with a braided thread.
 *
 * Same three-field contract as every seal (label / condition / bonus) in Coven's
 * own hand: the ward's candle-lit paper inside the slip's pink edge, the
 * metatask's name in Grenze Gotisch, and the bonus struck as a candle-gold chip.
 *
 * The washi tape and the blush marker-sticker stock are gone — both belonged to
 * the `coven.exe` / pink-sticker metaphor the v2 task card retired. The braid
 * replaces the tape because it does the same job (it is what holds a Coven
 * surface to the one under it) and it is a mark this faction already ships.
 *
 * THE TILT STAYS. `rotate(-0.6deg)` is not a lo-fi mark — a slip pressed onto
 * somebody else's praxis sits crooked, and the ward pages keep every other
 * hand-placed thing slightly off-square.
 *
 * The bonus chip's gold/ink pair is `--faction-coven-slip-gold` under
 * `--faction-coven-ward-hold-ink`, measured for the "you already hold this task"
 * band at 6.20:1 light / 7.03:1 dark; the retired `-stamp-chip-*` pair was a
 * theme-invariant amber nothing re-measured after the ward landed.
 */
export default function CovenSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <div
      className="relative"
      style={{
        background: CARD,
        color: INK,
        border: `2px solid ${BORDER}`,
        borderRadius: 14,
        padding: 'var(--space-md) var(--space-lg) var(--space-md)',
        boxShadow: SHADOW,
        transform: 'rotate(-0.6deg)',
        overflow: 'hidden',
      }}
    >
      {/* the braid that ties the slip to the praxis under it */}
      <Braid style={{ marginBottom: 'var(--space-sm)' }} />

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

      <span className="block" style={CAPTION}>
        {t('detail.seal.label', { faction })}
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
          marginTop: 'var(--space-xs)',
        }}
      >
        {metatask.title}
      </span>

      <span
        className="inline-block"
        style={{
          background: GOLD,
          color: HOLD_INK,
          fontFamily: 'var(--font-faction-rounded)',
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
  )
}
