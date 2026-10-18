import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { useFormFactor } from '../../hooks/useFormFactor'

/**
 * The letter CHASSIS (#3294) -- the one place an invitation letter reads
 * `useFormFactor()`, the way `DuelSealSheet` is for the seals.
 *
 * `ground` is the faction's paper, ink and the ornaments' base: applied at BOTH
 * widths. `card` is the floating-card chrome (border, radius, shadow, rotation,
 * frame outline): DESKTOP ONLY, because full-bleed on a phone the sheet is the
 * screen and a frame or a drop shadow at the viewport edge is a card pretending
 * it still floats. `InvitationLetterPopup` zeroes the scrim padding on a phone
 * so this can fill it.
 */
export default function LetterSheet({
  ground,
  card,
  children,
  ...rest
}: {
  ground: CSSProperties
  card?: CSSProperties
  children: ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'children'>) {
  const mobile = useFormFactor() === 'mobile'
  const base: CSSProperties = {
    position: 'relative',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
  }
  return (
    <div
      data-letter-sheet={mobile ? 'phone' : 'card'}
      {...rest}
      style={
        mobile
          ? { ...base, width: '100%', minHeight: '100dvh', ...ground }
          : { ...base, width: 520, maxWidth: '100%', ...ground, ...card }
      }
    >
      {children}
    </div>
  )
}
