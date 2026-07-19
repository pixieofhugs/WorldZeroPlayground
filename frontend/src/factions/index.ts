/**
 * The faction manifest index — the one list a new faction joins.
 *
 * Adding a faction is: write `./<slug>.ts`, add one line to
 * {@link FACTION_MANIFESTS}. No dispatcher is touched, and every surface the
 * faction does not declare falls through to that surface's `Default*` archetype.
 * `factionManifest.test.tsx` proves this end to end with a fake faction.
 *
 * WHY `surfaceMap()` IS LAZY (do not "simplify" this into a module-level const)
 * ---------------------------------------------------------------------------
 * This module transitively imports every faction component, and several of those
 * components import a *dispatcher* module back:
 *
 *     components/TaskCard.tsx  →  factions/index.ts  →  factions/ua.ts
 *       →  pages/factionDetail/archetypes/UaFactionBody.tsx
 *       →  components/TaskCard.tsx        (default value import, not type-only)
 *
 * That is a genuine ES-module cycle. It is harmless *provided nothing reads
 * across it while the modules are still evaluating*. A dispatcher that did
 *
 *     const MAP = { ua: FACTION_MANIFESTS[0].taskCard }   // ← eval-time read
 *
 * would hit `FACTION_MANIFESTS` in its temporal dead zone whenever TaskCard.tsx
 * happened to be the module that entered the cycle first, and throw at import
 * time. Resolving inside `surfaceMap()` — which dispatchers call during render,
 * long after every module has finished evaluating — sidesteps that entirely.
 */
import type { FactionManifest, FactionSurface } from './manifest'

import { ALBESCENT_MANIFEST } from './albescent'
import { EPHEMERISTS_MANIFEST } from './ephemerists'
import { EVERYMEN_MANIFEST } from './everymen'
import { SINGULARITY_MANIFEST } from './singularity'
import { SNIDE_MANIFEST } from './snide'
import { UA_MANIFEST } from './ua'
import { WOW_MANIFEST } from './wow'

export type { FactionManifest, FactionSurface } from './manifest'
export { SURFACE_KEYS } from './manifest'

/**
 * Every faction that ships a manifest, in canonical rainbow order (#352) so any
 * consumer that iterates gets the house order for free. `na` / unaffiliated is a
 * state rather than a faction and deliberately has no manifest: it falls through
 * to the neutral `Default*` skins everywhere (ADR-0039).
 */
export const FACTION_MANIFESTS: readonly FactionManifest[] = [
  EVERYMEN_MANIFEST,
  UA_MANIFEST,
  SNIDE_MANIFEST,
  EPHEMERISTS_MANIFEST,
  SINGULARITY_MANIFEST,
  ALBESCENT_MANIFEST,
  WOW_MANIFEST,
]

/** A slug-keyed map of one surface, in the shape `pickVariant` consumes. */
export type SurfaceMap<K extends FactionSurface> = Record<
  string,
  NonNullable<FactionManifest[K]>
>

/**
 * Build a surface map from an arbitrary manifest list. Pure — exported so the
 * add-a-faction test can register a fake faction without mutating the real
 * index. Production code wants {@link surfaceMap}.
 */
export function buildSurfaceMap<K extends FactionSurface>(
  manifests: readonly FactionManifest[],
  surface: K,
): SurfaceMap<K> {
  const map: SurfaceMap<K> = {}
  for (const manifest of manifests) {
    const variant = manifest[surface]
    if (variant) map[manifest.slug] = variant as NonNullable<FactionManifest[K]>
  }
  return map
}

/**
 * The slug→component map for one surface, ready to hand to `pickVariant`.
 * Memoised: the manifest list is static, and dispatchers call this on every
 * render (a feed renders one card per item).
 *
 * Called at RENDER time, never at module-evaluation time — see the cycle note
 * at the top of this file.
 */
const surfaceMapCache = new Map<FactionSurface, SurfaceMap<FactionSurface>>()

export function surfaceMap<K extends FactionSurface>(surface: K): SurfaceMap<K> {
  const cached = surfaceMapCache.get(surface)
  if (cached) return cached as SurfaceMap<K>
  const built = buildSurfaceMap(FACTION_MANIFESTS, surface)
  surfaceMapCache.set(surface, built as SurfaceMap<FactionSurface>)
  return built
}
