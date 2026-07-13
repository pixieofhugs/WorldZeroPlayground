/**
 * Faction archetype dispatch — the single place that turns a faction slug into a
 * bespoke component, falling back to a default when no variant is registered.
 *
 * Before this helper, ~10 dispatchers (TaskCard, PraxisCard, EditPraxis,
 * TaskDetail, VoteUI, FactionAvatar, FactionBackdrop,
 * FactionDetail heroes) each spelled "look up slug, else
 * default" three different ways and none of them handled faction-identity
 * aliases (then albescent→ua and aged_out→ua, both since retired). Routing
 * every dispatcher through `pickVariant` makes
 * slug-normalization, alias handling, and unknown-slug behaviour live in one
 * place, and means a new page dispatcher is one map + one call.
 */
import type { ComponentType } from 'react'

import { FACTION_ALIASES } from './factions'

/**
 * Resolve a faction slug to its archetype component.
 *
 * Lookup order: an explicit entry for the slug wins; then its alias's entry
 * (a derived slug inherits its canonical faction's variant without a duplicate
 * map row — the seam the retired aged_out→ua alias used; FACTION_ALIASES in
 * factions.ts is currently empty); then the supplied fallback. A
 * null/undefined/empty slug goes straight to the fallback.
 *
 * The fallback is optional: with one, you always get a component (the
 * "every faction renders something" page case); without one, you get
 * `undefined` when nothing is registered (the "render a bespoke variant if it
 * exists, otherwise inline default chrome" case, e.g. faction-page heroes) —
 * and the alias rule still applies either way.
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
  const alias = FACTION_ALIASES[slug]
  return map[slug] ?? (alias ? map[alias] : undefined) ?? fallback
}
