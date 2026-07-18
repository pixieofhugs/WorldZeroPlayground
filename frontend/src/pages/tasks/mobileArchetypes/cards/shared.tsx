import type { CSSProperties } from 'react'

/**
 * Shared MOBILE task-card slots (#589).
 *
 * Mirrors the split the mobile praxis cards established in #573
 * (`components/praxisCard/mobile/shared.tsx`): each faction's mobile task card
 * owns a bespoke FRAME — chrome, fonts, fills, dot geometry, footer anatomy —
 * and composes the genuinely-repeated STRUCTURAL pieces from here.
 *
 * Only one piece earned extraction. The description excerpt repeats its clamp
 * mechanics identically in all 8 cards; it lives here. The faction tag row (6
 * of 8) and the points/level footer (7 of 8 share only the wrapper) did NOT:
 * their dot geometry, typography and footer order differ per faction, so every
 * meaningful value would become a prop and the "shared" component would cost
 * more lines than the call sites it replaced. Those stay bespoke on purpose —
 * each faction keeps its own card archetype.
 *
 * This file is NOT on the `.eslint-legacy-raw-styles` allowlist (new files may
 * never be added to it), so it carries no raw fontSize/padding/margin/gap
 * numbers. Every faction-specific value — including the `margin` and font size
 * the originals set inline — arrives through `style` from the calling card,
 * which keeps the rendered output byte-for-byte what it was.
 */

/**
 * Slot: the task description excerpt, clamped to two lines.
 *
 * Holds only the clamp mechanics that all 8 cards repeat verbatim
 * (`-webkit-box` + `WebkitLineClamp: 2` + `WebkitBoxOrient` + `overflow`) and
 * the "render nothing without a description" guard. Typography, colour and
 * margin stay with the faction card and come in through `className` / `style`,
 * which is spread last so a card can still override anything it needs.
 */
export function MobileTaskDescription({
  text,
  className,
  style,
}: {
  text: string | null | undefined
  className?: string
  style?: CSSProperties
}) {
  if (!text) return null
  return (
    <p
      className={className}
      style={{
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        ...style,
      }}
    >
      {text}
    </p>
  )
}
