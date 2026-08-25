import { useTranslation } from 'react-i18next'

import { EverymenBand } from '../../cardMasthead/factionBands'
import type { SealSkinProps } from '../types'

/**
 * Everymen seal — a union-broadsheet dispatch stamped onto the host praxis.
 * Same three-field contract as every seal: cream paper, red masthead rule,
 * Bebas Neue caps for the condition, a rubber-stamped bonus circle.
 *
 * THE RED MAST IS THE SHARED BAND NOW (#2648). The "red masthead rule" this
 * dispatch was described by was a muted eyebrow on the paper, not a mast;
 * `EverymenBand` is the bill's actual one — `--faction-everymen-bill-mast`
 * under its frozen ink, with the double rule and the paper's inset shadow,
 * the same band the task card and the praxis card fly.
 *
 * THE ROOT STOPPED BEING THE FLEX ROW. The dispatch is a column now — mast over
 * body — so the row that sets the condition beside the stamped bonus circle
 * moved down onto the body's own box with the padding, which is the move a
 * full-bleed band forces on any frame that padded itself (`CardMasthead`).
 */
export default function EverymenSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')

  return (
    <div
      className="relative"
      style={{
        background: 'var(--everymen-paper)',
        color: 'var(--everymen-paper-text)',
        border: '1.5px solid var(--everymen-ink)',
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
          <span
            className="font-body block"
            style={{
              fontFamily: 'var(--faction-everymen-card-font)',
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
            fontFamily: 'var(--faction-everymen-card-font)',
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
