import DefaultFeedFrame from './DefaultFeedFrame'
import type { FeedFrameProps } from './feedFrameProps'

/**
 * Albescent — the feed card's tell (#1203, ADR-0048). NOT a ninth chassis:
 * `albescent ≡ na + drift`, a secret society with no identity of its own
 * (ADR-0027, §3). It renders {@link DefaultFeedFrame} whole and washes light over
 * it, so chassis changes reach it with no edit, and all four slots (incl. a
 * `null` archive) arrive drawn.
 *
 * Hands down `'albescent'`, not `null`: `CSS_KEY` maps it to `default` (#783), and
 * `null` would claim no faction, which is `era_announcement`'s case.
 *
 * The edge span goes THROUGH the chassis as `children` (#1942): `.sidebar-card`'s
 * `backdrop-filter` makes it a stacking context, so an outside wash could never let
 * the actor's photo rise above it (#1646). The wash is a ground, not a span
 * (#2499): `.alb-prism` sets `--faction-default-card-sheet`, which `factionSheet`
 * already composes. index.css owns both classes, both themes and the
 * reduced-motion gate (no injected stylesheet, #911).
 *
 * No `AlbescentComment`, no word of the design sheet (a per-faction word identifies
 * as much as a hue), no mobile twin.
 */
export default function AlbescentFeedFrame({ children, ...frame }: FeedFrameProps) {
  return (
    <div className="alb-feed alb-prism">
      <DefaultFeedFrame slug="albescent" {...frame}>
        {children}
        <span aria-hidden="true" className="alb-feed-edge" />
      </DefaultFeedFrame>
    </div>
  )
}
