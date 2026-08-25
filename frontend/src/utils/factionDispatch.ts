/**
 * Faction archetype dispatch — the single place that turns a faction slug into
 * the component that draws it.
 *
 * Before this helper, ~10 dispatchers (TaskCard, PraxisCard, EditPraxis,
 * TaskDetail, VoteUI, FactionAvatar, FactionBackdrop,
 * FactionDetail heroes) each spelled "look up slug, else
 * default" three different ways. Routing every dispatcher through here makes
 * slug-normalization and unknown-slug behaviour live in one place, and means a
 * new page dispatcher is one map + one call.
 *
 * THE FALLBACK ARGUMENT IS GONE (#2530). `pickVariant(map, slug, DefaultX)` had
 * a third parameter because `na` was not in the registry: eight factions
 * declared their archetypes in a manifest and the ninth was named by hand at
 * every call site, which meant the unknown-slug rule was re-stated ~20 times by
 * whichever `Default*` the author happened to import. `factions/default.ts`
 * registers all twenty na surfaces now, so the rule is one line —
 * {@link resolveSlug} — and the dispatchers take {@link resolveVariant}.
 *
 * There is no cross-faction path: a slug renders its own variant or na's, never
 * a sibling faction's. The alias branch that used to sit here served
 * albescent→ua and aged_out→ua, both retired (#232, #428), and left an empty map
 * behind it.
 *
 * The registration test is own-property-only (#1821). A bracket read reaches
 * `Object.prototype`, and `??` only catches null/undefined, so
 * `pickVariant(map, "constructor", Default)` handed the `Object` function back
 * as the archetype for React to render. Every surface dispatches through here,
 * which is what makes this the one place worth guarding rather than ~10.
 */
import type { ComponentType } from 'react'
import { hasOwnKey } from './hasOwnKey'
import { UNAFFILIATED_FACTION_SLUG } from './factions'

/**
 * The slug a surface map will actually be read at: the given one if it has a
 * row, otherwise `na`.
 *
 * This is the whole unknown-slug rule, and `na` is not a fallback in it — it is
 * the ninth faction's own row (`factions/default.ts`). A null, empty or
 * unregistered slug is an unaffiliated one, which is the same statement
 * `resolveCssKey` makes about colour in `utils/factions.ts` (ADR-0039).
 */
export function resolveSlug(
  map: Record<string, unknown>,
  slug: string | null | undefined,
): string {
  return hasOwnKey(map, slug) ? slug : UNAFFILIATED_FACTION_SLUG
}

/**
 * Resolve a faction slug to the archetype that draws it. Always a component:
 * every surface map has an `na` row, and `defaultManifest.test.tsx` is what
 * holds it there.
 *
 * This is what a dispatcher wants. `pickVariant` below is for the one other
 * question — "is there a BESPOKE variant for this slug" — which is a different
 * thing and has a different answer for `na`.
 */
export function resolveVariant<P>(
  map: Record<string, ComponentType<P>>,
  slug: string | null | undefined,
): ComponentType<P> {
  return map[resolveSlug(map, slug)]
}

/**
 * The variant registered for `slug`, or `undefined` if none is.
 *
 * NOT the dispatcher's question — this one asks about the slug itself and
 * answers `undefined` for an unregistered one rather than reaching for na's row.
 * Keep it for the cases that genuinely want "a bespoke variant if one exists":
 * the surface-dispatch table asserts registration CONTENTS with it, and the
 * prototype-key guard proves a `constructor` slug resolves to nothing.
 */
export function pickVariant<P>(
  map: Record<string, ComponentType<P>>,
  slug: string | null | undefined,
): ComponentType<P> | undefined {
  return hasOwnKey(map, slug) ? map[slug] : undefined
}
