/**
 * Faction archetype dispatch — the single place that turns a faction slug into a
 * bespoke component, falling back to a default when no variant is registered.
 *
 * Before this helper, ~10 dispatchers (TaskCard, PraxisCard, EditPraxis,
 * TaskDetail, VoteUI, FactionAvatar, FactionBackdrop,
 * FactionDetail heroes) each spelled "look up slug, else
 * default" three different ways. Routing every dispatcher through `pickVariant`
 * makes slug-normalization and unknown-slug behaviour live in one place, and
 * means a new page dispatcher is one map + one call.
 */
import type { ComponentType } from 'react'
import { hasOwnKey } from './hasOwnKey'

/**
 * Resolve a faction slug to its archetype component.
 *
 * Lookup order: an explicit entry for the slug wins, then the supplied
 * fallback. A null/undefined/empty slug goes straight to the fallback.
 *
 * There is no cross-faction path: a slug renders its own variant or the
 * fallback, never a sibling faction's. The alias branch that used to sit here
 * served albescent→ua and aged_out→ua, both retired (#232, #428), and left an
 * empty map behind it.
 *
 * The fallback is optional: with one, you always get a component (the
 * "every faction renders something" page case); without one, you get
 * `undefined` when nothing is registered (the "render a bespoke variant if it
 * exists, otherwise inline default chrome" case, e.g. faction-page heroes) —
 * and the alias rule still applies either way.
 *
 * The registration test is own-property-only (#1821). A bracket read reaches
 * `Object.prototype`, and `??` only catches null/undefined, so
 * `pickVariant(map, "constructor", Default)` handed the `Object` function back
 * as the archetype for React to render. Every surface dispatches through here,
 * which is what makes this the one place worth guarding rather than ~10.
 */
export function pickVariant<P>(
  map: Record<string, ComponentType<P>>,
  slug: string | null | undefined,
  fallback: ComponentType<P>,
): ComponentType<P>
export function pickVariant<P>(
  map: Record<string, ComponentType<P>>,
  slug: string | null | undefined,
): ComponentType<P> | undefined
export function pickVariant<P>(
  map: Record<string, ComponentType<P>>,
  slug: string | null | undefined,
  fallback?: ComponentType<P>,
): ComponentType<P> | undefined {
  if (!slug) return fallback
  return hasOwnKey(map, slug) ? map[slug] : fallback
}
