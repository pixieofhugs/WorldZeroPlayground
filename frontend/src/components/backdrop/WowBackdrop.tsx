import type { CSSProperties } from 'react'

import { WowSigil } from '../cards/WowSigil'

/**
 * WOW page backdrop — the faction wallpaper (kit §14, #900).
 *
 * Gilt checker rail along the top edge, plum court-glow off the upper right, a
 * 135° gilt hatch, the watermark crest bled off the lower right, and six ✦
 * twinkles drifting across the field. The ground, glow, hatch and rail all live
 * in the `.wow-backdrop` rule in index.css so both themes come from the
 * `[data-theme="dark"]` cascade; only the two figures are drawn here, because
 * the crest is a React component and the twinkles need per-element delays.
 *
 * QUIET ON PURPOSE. A page is a composition of INDEPENDENTLY-THEMED surfaces
 * (ADR-0002), not one faction block — another faction's card can and will sit on
 * this ground, and the frosted sidebar lets it bleed through. So the kit's
 * swatch-scale values are dialled down here: the court-glow from .24/.34 to
 * .13/.19 in the token, the watermark from the kit's .15 to .09, and the whole
 * twinkle layer capped at .5. That is the same order as UaBackdrop's stated
 * 6–8% ceiling, and for the same reason — the backdrop's job is to be felt and
 * not seen.
 *
 * It themes a page only when WOW is that page's single context; a mixed or
 * neutral page keeps the global rainbow watercolour, and the dispatcher makes
 * that call, not this file.
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
      {/* the twinkle field, capped so the stars never compete with content */}
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
                // ornament: the ✦ is a drawn star used as an icon, and the kit
                // sizes the six of them 12–22px to give the field depth. A
                // --text-* token names a TIER, and these are not text.
                // eslint-disable-next-line local/no-raw-style-values -- ornament: drawn twinkle glyph, sized for the composition (§4 ornament hatch)
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
