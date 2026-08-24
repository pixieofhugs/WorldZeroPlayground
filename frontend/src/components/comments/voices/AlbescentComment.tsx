/**
 * Albescent's comment voice (#2531) — A PASS-THROUGH WRAPPER. It renders
 * `DefaultComment` and changes not one pixel; `renderToStaticMarkup` here is
 * byte-identical to the na sheet in both modes, and
 * `albescentWrapperKinds.test.tsx` asserts it.
 *
 * THE ISSUE ASKED FOR THE FINDING FIRST — "check whether na has a comment voice
 * at all before assuming a wrapper is possible" — SO HERE IT IS. na has one: the
 * spectrum bubble in `CommentThread.tsx`, and it carries two na marks. Neither
 * can be re-cut from out here, for two different reasons, and both are
 * pre-existing rulings rather than anything this issue decided.
 *
 *  1. THE SHEET'S HAIRLINE IS CONDITIONAL, so it has no class. The 3px stripe
 *     across the top of every sheet is `factionFill(slug, 'bar')` inline — the
 *     ramp is COMPUTED FROM THE SLUG (a rainbow for na, a solid hue for a themed
 *     slug that registered no voice), and `.spectrum-rule` may not be conditional.
 *     `spectrumClasses.test.tsx` already names that exact hold-out for the
 *     praxis-detail rung dots. So the dresser `.alb-moves` feeds — the whole
 *     mechanism by which nine other Albescent surfaces move — reaches nothing on
 *     this one. Classing it would mean editing na's own conditional paint, which
 *     is a change to `na`, not a wrapper over it.
 *
 *  2. THE OTHER MARK IS TEXT. Resolved @mentions are gradient-clipped spectrum
 *     ink (`.rainbow-ink`, #970). The epic's technique ruling is a PRE-PAINTED
 *     `::before` slid by `transform` (#2498, enforced by
 *     `spectrumRingCollapse.test.ts`); a `background-clip: text` fill cannot be
 *     dressed that way at all — the only thing that would move it is walking a
 *     gradient parameter, which is the one technique the epic forbids. It is
 *     also a player's own words, which is the last ink in the app that should
 *     start moving under them.
 *
 * AND THE DECISION WAS ALREADY MADE, twice, in the same direction. Epic #1192
 * decision 13: Albescent keeps `DefaultComment`, because its feed CARD is
 * sufficiently distinct once the light is on it. `CommentThread`'s own docblock
 * says the same from the other side — "Albescent renders through it too and
 * stays that way". This file changes neither ruling; it records them in the
 * manifest so the map stops answering "does Albescent dress this?" with silence.
 *
 * No class, no colour, no copy, no motion. Strip nothing — there is nothing to
 * strip — and na is byte-identical, which is the invariant all four of #2531's
 * registrations keep.
 */
import { DefaultComment } from '../CommentThread'
import type { CommentProps } from '../shared'

export default function AlbescentComment(props: CommentProps) {
  return <DefaultComment {...props} />
}
