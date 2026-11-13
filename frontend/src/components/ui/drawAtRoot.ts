import { createPortal } from 'react-dom'
import type { ReactElement } from 'react'

/**
 * Portal an overlay to `document.body` (#1591). The shell's content region is
 * a stacking context at 5, under chrome at 10, so an in-place sheet sits under
 * the mobile tab bar whatever its z-index. The bands must stay; the overlay
 * leaves.
 *
 * Root ladder: backdrop 0 < content 5 < chrome 10 < sheets 39/40 <
 * `ConfirmDialog` 50 < modals 1000 < copy editor 1100 (#3094).
 *
 * With no `document` (SSR tests) it renders inline.
 */
export function drawAtRoot(overlay: ReactElement): ReactElement {
  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body)
}
