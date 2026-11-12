import type { CSSProperties } from 'react'

/**
 * The feed body's click target (#1893), `.stretched-link` style: an existing
 * anchor grows an overlay over the body's positioned root; other controls lift
 * above it. (Wrapping in `<Link>` would nest anchors and add a tab stop.) A
 * child span instead of `::after` keeps it inline-styled like the tree.
 *
 * Use-site rules:
 *   - the body root is `position: relative`; the band is a sibling, outside it.
 *   - the overlay-carrying anchor is NOT positioned (else the overlay shrinks).
 *   - every other link/control takes {@link FEED_BODY_LIFTED}.
 */

/** Beats the overlay, which has no z-index; hit testing follows paint order. */
export const FEED_BODY_LIFTED: CSSProperties = { position: 'relative', zIndex: 1 }

/**
 * Last child of the owning anchor. The inherited cursor is the only hover
 * affordance; each chassis owns its own hover treatment.
 *
 * ponytail: cursor-only hover; a chassis wanting a body-hover tell adds it in
 * its own CSS off the card's `:hover`.
 */
export function FeedBodyOverlay() {
  return <span aria-hidden style={{ position: 'absolute', inset: 0 }} />
}
