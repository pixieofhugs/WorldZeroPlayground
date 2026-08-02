import { createPortal } from 'react-dom'
import type { ReactElement } from 'react'

/**
 * Draw an overlay at the document root instead of where it was mounted.
 *
 * WHY (#1591) — the shell composites in three deliberate bands: backdrop `0`
 * (`WatercolorBackground`), content `5` (`ShellContent`'s two regions and
 * `SiteFooter`), chrome `10` (`MobileHeader`, `MobileTabBar`). That is the
 * right order, and it is also the trap: `position: relative` + `z-index: 5` on
 * the content region OPENS A STACKING CONTEXT, so everything rendered inside
 * page content composites at 5 and can never rise above the chrome — whatever
 * z-index it declares for itself. The mobile tab bar therefore painted OVER an
 * open bottom sheet and stayed tappable behind its scrim, which breaks the one
 * promise a scrim makes: nothing behind it is available.
 *
 * The bands must stay. Deleting the content region's z-index drops content
 * behind the backdrop; raising it lifts ordinary content over the chrome. The
 * overlay is what has to leave, and a portal to `document.body` is how it
 * leaves — the same escape `ConfirmDialog` (#1082) and `FeedBankFullModal`
 * (#1148) already make. Factored here so the two bottom sheets that needed it
 * next did not become copies three and four of the same ternary.
 *
 * ALTITUDE, once out: an overlay portalled to `document.body` competes in the
 * ROOT stacking context, where its own z-index finally means something. The
 * ladder there reads backdrop `0` < content `5` < chrome `10` < bottom sheets
 * `39`/`40` < `ConfirmDialog` `50` < the full-screen modals at `1000`. A sheet
 * belongs below a confirm raised from inside it, so the sheets keep their
 * existing numbers rather than joining the `1000` band — those numbers were
 * only ever fiction because of the trap, not because they were wrong.
 *
 * THE GUARD is this repo's test harness. Tests render with
 * `renderToStaticMarkup` and no DOM, and the server renderer cannot render a
 * portal at all, so with no `document` the tree stays inline and the markup
 * stays assertable. In a browser that branch is never taken.
 */
export function drawAtRoot(overlay: ReactElement): ReactElement {
  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body)
}
