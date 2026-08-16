import type { CSSProperties } from 'react'

/**
 * THE FEED BODY'S CLICK TARGET (#1893).
 *
 * A feed card links specific words — the actor's name, the headline — and the
 * rest of the body was inert. This is the two halves of making the whole body
 * one target without adding a second interactive element to the DOM.
 *
 * The mechanism the ruling settled on is Bootstrap's `.stretched-link`: an
 * anchor that ALREADY exists in the body grows an overlay stretched across the
 * body's positioned root, and every other link and control is lifted above it.
 * The alternative — wrapping the body in a `<Link>` — nests anchors, adds a tab
 * stop, and swallows the inner links whole.
 *
 * WHY A CHILD `<span>` AND NOT AN `::after`. The ruling names a pseudo-element,
 * and functionally this IS that pseudo-element: same box, same containing
 * block, same stacking, same single anchor, same tab order. But a pseudo-element
 * needs a rule in `index.css`, and this whole component tree is inline-styled —
 * the class would be a stylesheet entry that only ever means "the thing the
 * component next to it already says". An empty, out-of-flow child span says it
 * where it happens, costs no layout, and keeps the branch (`stretched or not`)
 * in the one place that decides it.
 *
 * WHAT MUST BE TRUE AT EACH USE SITE:
 *   - the BODY's root carries `position: relative`, and the BAND does not sit
 *     inside it. The band (kicker · tag · time · archive ×) must never
 *     navigate, and it is a SIBLING of the body inside every faction chassis —
 *     so it is out of reach structurally rather than by a rule.
 *   - the anchor carrying the overlay is NOT itself positioned. Give it
 *     `position: relative` and the overlay collapses to the anchor's own box.
 *   - every other link and control takes {@link FEED_BODY_LIFTED}.
 */

/**
 * The lift an inner control takes to stay clickable through the overlay.
 *
 * `z-index: 1` beats the overlay because the overlay declares no z-index at
 * all: it is positioned, so it paints above the body's static text, and any
 * positioned sibling with a real z-index paints above it in turn. Hit testing
 * follows paint order, so this is the same statement about clicks.
 */
export const FEED_BODY_LIFTED: CSSProperties = { position: 'relative', zIndex: 1 }

/**
 * The stretched overlay. Renders as the last child of the one anchor that owns
 * the body, and covers the nearest positioned ancestor — the body's root.
 *
 * `cursor` is inherited, so sitting inside an `<a href>` is what makes the whole
 * body read as clickable. That is deliberately the ONLY hover affordance here:
 * each faction chassis owns its own hover treatment, and a shared background or
 * border change would fight all nine.
 *
 * ponytail: cursor-only hover. If a chassis wants a body-hover tell of its own
 * it belongs in that frame's CSS keyed off `:hover` on the card, not here.
 */
export function FeedBodyOverlay() {
  return <span aria-hidden style={{ position: 'absolute', inset: 0 }} />
}
