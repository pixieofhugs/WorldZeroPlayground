/**
 * The faction manifest index — the one list a new faction joins.
 *
 * Adding a faction is: write `./<slug>.ts`, add one line to
 * {@link FACTION_MANIFESTS}. No dispatcher is touched, and every surface the
 * faction does not declare falls through to that surface's `Default*` archetype.
 * `addAFaction.test.tsx` proves this end to end with a fake faction.
 *
 * WHY `surfaceMap()` IS LAZY (do not "simplify" this into a module-level const)
 * ---------------------------------------------------------------------------
 * This module transitively imports every faction component, and several of those
 * components import a *dispatcher* module back:
 *
 *     components/taskCard/TaskCard.tsx  →  factions/index.ts  →  factions/ua.ts
 *       →  pages/factionDetail/archetypes/UaFactionBody.tsx
 *       →  components/taskCard/TaskCard.tsx  (default value import, not type-only)
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
 * Every faction that ships a manifest, in canonical rainbow order (#352) so any
 * consumer that iterates gets the house order for free, with `na` last —
 * outside the rainbow, the way it is outside `FACTION_RAINBOW_ORDER`.
 *
 * `na` HAS A MANIFEST SINCE #2530, and the sentence that used to stand here
 * ("unaffiliated is a state rather than a faction and deliberately has no
 * manifest: it falls through to the neutral `Default*` skins everywhere") was
 * true about the game and false about this file. It is still a state rather than
 * a faction — `CSS_KEY['na'] === 'default'` and `isKnownFaction('na')` is still
 * false (ADR-0039, #749) — but "falls through" described a SECOND dispatch
 * mechanism, `pickVariant`'s third argument, hand-written at ~20 call sites for
 * this one slug. `./default.ts` is the same twenty components reached the same
 * way as everyone else's; nothing about what renders changed.
 *
 * `wow` (Warriors of Whimsy) began with no manifest (#784 moved its old pink
 * identity to Cozy Coven) and then only a yellow THEME (#812). #821 gave it its
 * FIRST bespoke surfaces: the praxis card (the cream/gold/plum chronicle), its
 * mobile twin and the balloon vote widget; #840 added the score stamp and #835
 * the edit-praxis composer ("The Squire's Writ") — which #836 gave a mobile twin
 * and #1181 collapsed back to one responsive component when ADR-0065 retired the
 * `mobileEditPraxis` surface. It claims every key in `SURFACE_KEYS` now, and
 * `surfaceDispatch.test.ts` is what holds it there: that file derives the bar
 * from what the reference factions skin, so a new surface raises it by itself.
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

/** A slug-keyed map of one surface, in the shape `resolveVariant` consumes. */
export type SurfaceMap<K extends FactionSurface> = Record<
  string,
  ReturnType<NonNullable<FactionManifest[K]>>
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
    // Calling the thunk HERE — at render time, not module-evaluation time — is
    // what keeps the dispatcher/archetype cycle harmless. See ./manifest.ts.
    if (variant) map[manifest.slug] = (variant as () => SurfaceMap<K>[string])()
  }
  return map
}

/**
 * The slug→component map for one surface, ready to hand to `resolveVariant`.
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
