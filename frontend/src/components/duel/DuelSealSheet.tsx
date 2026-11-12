/**
 * The duel seal chassis (#1313): the shell every seal sheet hangs in, and the ONE
 * place the seal reads `useFormFactor()`. Owns overlay, dialog contract, scrim and
 * width bound; no faction chrome. Skins pass:
 *  - `ground` — paper, ink, face, full-bleed edges; applied at BOTH widths.
 *  - `card` — floating chrome (border, radius, clip, shadow); desktop only, since
 *    on a phone the sheet IS the screen.
 * The phone keeps `--color-bg-page` under `ground` so inner-painted skins stay
 * opaque. Both shells are flex columns: a pinned action band = middle `flex: 1`.
 */
import type { CSSProperties, ReactNode } from 'react'
import { drawAtRoot } from '../ui/drawAtRoot'
import { useFormFactor } from '../../hooks/useFormFactor'

/** Default desktop scrim; Snide, Singularity and WOW pass their own. */
export const SEAL_SCRIM = 'radial-gradient(circle, rgba(0,0,0,0.55), rgba(0,0,0,0.75))'

interface DuelSealSheetProps {
  /** Accessible name (`copy.heading`). */
  label: string
  scrim?: string
  ground: CSSProperties
  card?: CSSProperties
  /**
   * Phone-shell-only class; sole consumer WOW's `.wow-seal-actions--mobile` (#895).
   * ponytail: inline styles can't do media queries; wrap that rule in a
   * `@media (max-width: 767px)` in CSS and this prop can go.
   */
  phoneClassName?: string
  children: ReactNode
}

export default function DuelSealSheet({
  label,
  scrim = SEAL_SCRIM,
  ground,
  card,
  phoneClassName,
  children,
}: DuelSealSheetProps) {
  const isMobile = useFormFactor() === 'mobile'

  // Both branches draw at the root (#2244), or the phone's tab bar paints over the
  // action band. See `drawAtRoot`.
  if (isMobile) {
    return drawAtRoot(
      <div
        data-testid="duel-seal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`fixed inset-0 z-50 flex flex-col justify-end overflow-y-auto ${
          phoneClassName ?? ''
        }`}
        style={{ background: 'var(--color-bg-page)', ...ground }}
      >
        {children}
      </div>,
    )
  }

  return drawAtRoot(
    <div
      // Found by slot, not heading, for the nightly (#2453).
      data-testid="duel-seal-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ padding: 'var(--space-lg)', background: scrim }}
    >
      <div className="w-full max-w-[460px] flex flex-col" style={{ ...ground, ...card }}>
        {children}
      </div>
    </div>,
  )
}
