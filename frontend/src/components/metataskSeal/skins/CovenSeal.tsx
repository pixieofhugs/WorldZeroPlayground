import { useTranslation } from 'react-i18next'

import { CovenBand } from '../../cardMasthead/factionBands'
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
 *
 * ── THE HEAD IS PINK BY DAY NOW (#2636, folded into #2648) ──────────────────
 *
 * The complaint was that this slip is a NEAR-WHITE SHEET in light:
 * `--faction-coven-ward-card` is `#fff6fb`, and the eyebrow that named the
 * faction was quiet type sitting straight on it. Owner ruling: Coven's heading
 * area reads as faction pink with white text by day, and dark stays byte-
 * identical.
 *
 * `CovenBand` IS THAT RULING, at no new paint. #2639 had already repainted the
 * card band onto `--faction-coven-mast` under `--faction-coven-mast-ink` — "a
 * pink under white by day", transcribed from the CTA's own measured
 * white-on-pink pairing and unchanged at night. Mounting it here is #2636's
 * option (b) — a filled strip in the pink, leaving the sheet blush — executed
 * with tokens that already carry both cascades rather than with geometry
 * invented for one seal.
 *
 * SO THE WARD CARD IS NOT TINTED, which was #2636's option (a) and its open
 * question. Two reasons, either sufficient: `#fff6fb` IS the "blush" the ruling's
 * own option (b) leaves in place under a pink strip; and `-ward-card` is a
 * SHARED Coven ground — the comment voice, the feed frame, the select card, the
 * character path sheet and the score stamp's plate head all read it — so moving
 * its light value would repaint six surfaces the ruling never looked at, which
 * is a redesign wearing a bug fix's clothes. Every ink measured against
 * `#2a0f1e` is untouched, and so is every ink measured against `#fff6fb`.
 *
 * THE BRAID STAYS AT THE VERY TOP, above the band and full-bleed, because that
 * is its job: it is the thread that ties the slip to the praxis under it, not a
 * rule inside the slip. What moved is the body's padding, down onto an inner box
 * — the band is full-bleed, and `CardMasthead`'s docblock records the two praxis
 * frames that had to make the same move.
 */
export default function CovenSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')

  return (
    <div
      className="relative"
      style={{
        background: CARD,
        color: INK,
        border: `2px solid ${BORDER}`,
        borderRadius: 14,
        boxShadow: SHADOW,
        transform: 'rotate(-0.6deg)',
        overflow: 'hidden',
      }}
    >
      {/* the braid that ties the slip to the praxis under it */}
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

        {/* What the object is. The band above says WHOSE it is; the slip's own
            small-caps caption voice says what it is, which is the half of the
            deleted "{{faction}} Metatask" eyebrow a wordmark cannot give back. */}
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
    </div>
  )
}
