/**
 * Faction archetype dispatch: the single place a slug becomes the component
 * that draws it. A slug renders its own variant or na's (`factions/default.ts`),
 * never a sibling's. Own-property reads only (#1821): a bracket read of
 * "constructor" would hand React the `Object` function.
 */
import type { ComponentType } from 'react'
import { hasOwnKey } from './hasOwnKey'
import { UNAFFILIATED_FACTION_SLUG } from './factions'

/** The whole unknown-slug rule: unregistered means unaffiliated (ADR-0039). */
export function resolveSlug(
  map: Record<string, unknown>,
  slug: string | null | undefined,
): string {
  return hasOwnKey(map, slug) ? slug : UNAFFILIATED_FACTION_SLUG
}

/** What a dispatcher wants. Always a component: `defaultManifest.test.tsx` holds every `na` row. */
export function resolveVariant<P>(
  map: Record<string, ComponentType<P>>,
  slug: string | null | undefined,
): ComponentType<P> {
  return map[resolveSlug(map, slug)]
}
