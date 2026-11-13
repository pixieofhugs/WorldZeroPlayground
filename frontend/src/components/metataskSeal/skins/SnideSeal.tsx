import { useTranslation } from 'react-i18next'

import { SnideBand } from '../../cardMasthead/factionBands'
import type { SealSkinProps } from '../types'
import { factionRoleVars } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'

/**
 * S.N.I.D.E. seal — a photocopier-ink ransom note on the host praxis. Issuer is
 * the shared `SnideBand` (#2648). The halftone field sits on the ROOT, under the
 * band too (it's the print the clipping ran on); `CardMasthead` pins its zIndex.
 */

/** Word-level "cut from a magazine" chip palette, picked deterministically per word. */
const CLIP_STYLES = [
  { bg: 'var(--faction-snide-paper)', color: 'var(--faction-snide-ink)', font: 'var(--faction-snide-font-black)', rotate: -3 },
  { bg: 'var(--faction-snide-ink)', color: 'var(--faction-snide-acid)', font: 'var(--faction-snide-font-marker)', rotate: 3 },
  // `#fff` measured 3.50:1 on pink (#1609); `--faction-snide-on-accent` is 5.38:1.
  { bg: 'var(--faction-snide-pink)', color: 'var(--faction-snide-on-accent)', font: 'var(--faction-snide-font-black)', rotate: -2 },
]

function ClippedCondition({ text }: { text: string }) {
  // `filter(Boolean)`: an empty word has no charCodeAt(0).
  const words = text.split(/\s+/).filter(Boolean)
  return (
    // Must stay one readable string: flex `gap` drops whitespace children (#1043),
    // so inline flow with real spaces; line-height carries the row rhythm.
    <span style={{ display: 'block', fontSize: 'var(--text-md)', lineHeight: 2.1 }}>
      {words.map((word, index) => {
        const clip = CLIP_STYLES[(word.charCodeAt(0) + index) % CLIP_STYLES.length]
        return (
          <span key={index}>
            {index > 0 ? ' ' : ''}
            <span
              className="font-body"
              style={{
                display: 'inline-block',
                verticalAlign: 'middle',
                background: clip.bg,
                color: clip.color,
                fontFamily: clip.font,
                fontSize: 'var(--text-md)',
                lineHeight: 1,
                padding: 'var(--space-xs) var(--space-xs)',
                transform: `rotate(${clip.rotate}deg)`,
                // ornament (#1609): print register, not elevation; 40% is the
                // uniform strength (#2302).
                boxShadow: '1px 2px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)',
                textTransform: 'uppercase',
              }}
            >
              {word}
            </span>
          </span>
        )
      })}
    </span>
  )
}

export default function SnideSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')

  return (
    <div
      className="relative"
      style={{
        ...factionBodyVars("snide"), ...factionRoleVars('snide', 'snd-seal'),
        background: 'var(--snd-seal-paper)',
        color: 'var(--snd-seal-ink)',
        border: '2px solid var(--faction-snide-pink)',
        // The role map's corner (#2729), shared with the picker's selection ring.
        borderRadius: 'var(--snd-seal-radius)',
        transform: 'rotate(-1deg)',
        // ornament (#1609): flat print register at the uniform 40% (#2302). The
        // halftone dots below stay raw: density IS the drawing. See the legacy list.
        boxShadow: '4px 5px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)',
        overflow: 'hidden',
      }}
    >
      <div className="ht-dots" style={{ position: 'absolute', inset: 0, color: 'rgba(182,255,46,0.08)', pointerEvents: 'none' }} />

      <SnideBand />

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
              color: 'var(--faction-snide-pink)',
              fontSize: 'var(--text-xl)',
              cursor: 'pointer',
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}

        {/* What has been stuck on; the band shouts the faction. */}
        <span
          className="block relative"
          style={{
            fontFamily: 'var(--faction-snide-font-type)',
            fontSize: 'var(--text-md)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'var(--faction-snide-acid)',
            marginBottom: 'var(--space-xs)',
          }}
        >
          {t('detail.seal.kind')}
        </span>

        <div className="relative" style={{ marginBottom: 'var(--space-sm)' }}>
          <ClippedCondition text={metatask.title} />
        </div>

        <span
          className="font-body block relative"
          style={{
            fontFamily: 'var(--faction-snide-font-black)',
            letterSpacing: '0.04em',
            fontSize: 'var(--text-title)',
            color: 'var(--faction-snide-acid)',
          }}
        >
          {t('detail.seal.bonus', { points: metatask.point_value })}
        </span>
      </div>
    </div>
  )
}
