/**
 * The faction manifest index. New faction: `./<slug>.ts` + one line in
 * {@link FACTION_MANIFESTS}; `addAFaction.test.tsx` proves it end to end.
 *
 * `surfaceMap()` IS LAZY ON PURPOSE (not a module-level const): faction
 * components import dispatchers back (TaskCard → index → ua → UaFactionBody →
 * TaskCard), so an eval-time read hits `FACTION_MANIFESTS` in its TDZ and throws.
 */
import type { FactionManifest, FactionSurface } from './manifest'

import { ALBESCENT_MANIFEST } from './albescent'
import { COVEN_MANIFEST } from './coven'
import { DEFAULT_MANIFEST } from './default'
import { EPHEMERISTS_MANIFEST } from './ephemerists'
import { EVERYMEN_MANIFEST } from './everymen'
import { SINGULARITY_MANIFEST } from './singularity'
import { SNIDE_MANIFEST } from './snide'
import { UA_MANIFEST } from './ua'
import { WOW_MANIFEST } from './wow'

export type { FactionManifest, FactionSurface } from './manifest'
export { SURFACE_KEYS } from './manifest'

/**
 * Canonical rainbow order (#352), `na` last. na is listed for the registry only;
 * it is still a state, not a faction (ADR-0039).
 */
export const FACTION_MANIFESTS: readonly FactionManifest[] = [
  EVERYMEN_MANIFEST,
  UA_MANIFEST,
  WOW_MANIFEST,
  SNIDE_MANIFEST,
  EPHEMERISTS_MANIFEST,
  SINGULARITY_MANIFEST,
  ALBESCENT_MANIFEST,
  COVEN_MANIFEST,
  DEFAULT_MANIFEST,
]

type SurfaceMap<K extends FactionSurface> = Record<
  string,
  ReturnType<NonNullable<FactionManifest[K]>>
>

/** Exported for the add-a-faction test; production code wants {@link surfaceMap}. */
export function buildSurfaceMap<K extends FactionSurface>(
  manifests: readonly FactionManifest[],
  surface: K,
): SurfaceMap<K> {
  const map: SurfaceMap<K> = {}
  for (const manifest of manifests) {
    const variant = manifest[surface]
    // Thunk called at render time; see ./manifest.ts.
    if (variant) map[manifest.slug] = (variant as () => SurfaceMap<K>[string])()
  }
  return map
}

/** Memoised per surface; call at render time only (see top of file). */
const surfaceMapCache = new Map<FactionSurface, SurfaceMap<FactionSurface>>()

export function surfaceMap<K extends FactionSurface>(surface: K): SurfaceMap<K> {
  const cached = surfaceMapCache.get(surface)
  if (cached) return cached as SurfaceMap<K>
  const built = buildSurfaceMap(FACTION_MANIFESTS, surface)
  surfaceMapCache.set(surface, built as SurfaceMap<FactionSurface>)
  return built
}
