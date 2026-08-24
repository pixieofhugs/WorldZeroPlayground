/**
 * Albescent's page ground (#2531) — A PASS-THROUGH WRAPPER. It renders
 * `WatercolorBackground`, the site's own watercolour, and changes not one pixel.
 * That is the point of it: `renderToStaticMarkup` here is byte-identical to the
 * na fallback, and `albescentWrapperKinds.test.tsx` asserts exactly that.
 *
 * WHY A REGISTRATION THAT DRAWS NOTHING NEW IS WORTH THE FILE. The manifest is
 * the one place that answers "does Albescent dress this?", and until now it
 * answered by saying nothing — which reads two ways (na draws no mark to re-cut,
 * or nobody got to it) with nothing in the tree saying which. Registering it
 * says the first, deliberately, where the next reader looks.
 *
 * AND THE ANSWER IS LOAD-BEARING HERE, more than on the other three. There is
 * exactly ONE route that dispatches a backdrop at all: `CharacterProfile` calls
 * `useFactionBackdrop(character.faction_slug)`, so this surface is "the ground
 * under a player's profile". Every other faction paints its own there. Albescent
 * must NOT — a secret society whose members' profiles came with a page ground of
 * their own would be visible from across the room (ADR-0027, ADR-0048), and the
 * watercolour is what an unaffiliated player's profile stands on. The absence of
 * a ground IS the dress.
 *
 * THERE IS ALSO NO MARK TO RE-CUT, which is the other half of why this kind and
 * not the other. `WatercolorBackground` is an SVG of blurred ellipses with their
 * hues written into the `fill` attributes; it carries neither `.spectrum-rule`
 * nor `.spectrum-dial`, so the dresser `.alb-moves` feeds reaches nothing here,
 * and the epic's technique — a pre-painted `::before` slid by `transform`
 * (#2498) — has no element to hang on inside someone else's `<svg>`. Setting the
 * page ground itself moving would also break "one carrier per object" (#2519) on
 * the very page whose identity band already travels (`.alb-profile-edge`).
 *
 * No class, no colour, no copy, no motion, and no `ORNAMENTED_BACKDROP_SLUGS`
 * row: the ground stays a wash, so the ornament alternation (#2195) reads the
 * same answer for an Albescent profile as it did before this file existed.
 */
import WatercolorBackground from '../layout/WatercolorBackground'

export default function AlbescentBackdrop() {
  return <WatercolorBackground />
}
