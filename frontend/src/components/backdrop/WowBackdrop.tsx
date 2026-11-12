import type { CSSProperties } from 'react'

import { WowSigil } from '../sigil/WowSigil'

/**
 * WOW page backdrop (kit §14, #900). Ground, glow, hatch and rail live in
 * `.wow-backdrop` (index.css); only the crest and the twinkles (per-element
 * delays) are drawn here.
 *
 * Quiet on purpose (ADR-0002): other factions' cards sit on it, so the kit's
 * swatch values are dialled down (glow .13/.19, watermark .09, twinkles ≤.5) —
 * the same order as UaBackdrop's 6–8%.
 */

/** The kit's six twinkle positions, sizes and stagger, verbatim. */
const TWINKLES = [
  { top: '14%', left: '18%', size: 14, delay: '0s' },
  { top: '24%', left: '76%', size: 20, delay: '0.7s' },
  { top: '60%', left: '14%', size: 16, delay: '1.3s' },
  { top: '70%', left: '64%', size: 22, delay: '0.4s' },
  { top: '42%', left: '48%', size: 12, delay: '1s' },
  { top: '82%', left: '42%', size: 15, delay: '1.6s' },
]

export default function WowBackdrop() {
  return (
    <div className="wow-backdrop" aria-hidden="true">
      {/* capped so the stars never compete with content */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
        {TWINKLES.map((twinkle) => (
          <span
            key={`${twinkle.top}-${twinkle.left}`}
            className="wow-backdrop-twinkle"
            style={
              {
                position: 'absolute',
                top: twinkle.top,
                left: twinkle.left,
                lineHeight: 1,
                color: 'var(--faction-wow-figure)',
                // ornament: the ✦ is an icon sized 12–22px for depth, not text.
                // No eslint hatch needed (table-sourced; WORLD_ZERO_STYLE §4a).
                fontSize: twinkle.size,
                '--wow-twinkle-delay': twinkle.delay,
              } as CSSProperties
            }
          >
            ✦
          </span>
        ))}
      </div>

      {/* the watermark crest, bled off the lower right */}
      <div style={{ position: 'absolute', right: -110, bottom: -140, opacity: 0.09 }}>
        <WowSigil size={520} />
      </div>
    </div>
  )
}
