import { useEffect, useState, type ComponentProps, type ComponentType } from 'react'

/**
 * Code-splitting seam for faction archetypes (#1045): keeps every manifest's
 * archetypes out of the entry chunk (the index imports all manifests).
 *
 * Not `React.lazy`: tests render via synchronous `renderToStaticMarkup`, which
 * can never resolve a lazy component. `preload()` parks the module in a closure
 * so it then renders synchronously; `src/test/preloadArchetypes.ts` awaits it
 * once. Unloaded archetypes render `null` for a frame, so no `<Suspense>` needed.
 *
 * ponytail: hand-rolled only for the sync path after preload; with an awaiting
 * DOM test harness, switch to React.lazy + Suspense.
 */

/**
 * Generic over the COMPONENT, not its props: inferring `P` from the
 * `ComponentType` union collapses to `never` for the named-export form. Props
 * are still checked at the `FactionManifest` field.
 */
type AnyArchetype = ComponentType<any>

type LazyArchetype<C extends AnyArchetype> = C & {
  preload: () => Promise<void>
  resolved: () => C | undefined
}

/** Filled as manifests evaluate; importing `factions/index.ts` fills it completely. */
const REGISTRY: Array<() => Promise<void>> = []

export function lazyArchetype<C extends AnyArchetype>(
  load: () => Promise<{ default: C }>,
): LazyArchetype<C> {
  let Resolved: C | undefined
  let inflight: Promise<void> | undefined

  const preload = (): Promise<void> => {
    if (Resolved) return Promise.resolve()
    // Faction @font-face sheet, off the critical path (#2079); dynamic because a
    // static import would make it render-blocking. Never awaited: a failed CSS
    // fetch must not strand the surface at `null`. Vite dedupes the request.
    void import('../factionFaces')
    // Cache the promise: sibling cards mount together.
    inflight ??= load().then((module) => {
      Resolved = module.default
    })
    return inflight
  }

  function Archetype(props: ComponentProps<C>) {
    const [, bumpVersion] = useState(0)

    useEffect(() => {
      if (Resolved) return
      let cancelled = false
      void preload().then(() => {
        if (!cancelled) bumpVersion((version) => version + 1)
      })
      return () => {
        cancelled = true
      }
    }, [])

    // Under renderToStaticMarkup (no effects) this needs preload() to have run.
    if (!Resolved) return null
    const Loaded = Resolved as ComponentType<ComponentProps<C>>
    return <Loaded {...props} />
  }

  Archetype.preload = preload
  Archetype.resolved = () => Resolved
  REGISTRY.push(preload)
  return Archetype as unknown as LazyArchetype<C>
}

/** Import `factions/index.ts` first, or this warms only what is loaded. */
export async function preloadAllArchetypes(): Promise<void> {
  await Promise.all(REGISTRY.map((preload) => preload()))
}

/**
 * Start an archetype's chunk before it mounts, for pages that know their faction
 * a round trip early (#1379). No-op for a plain component.
 */
export function preloadArchetype(component: AnyArchetype): void {
  const deferred = component as Partial<LazyArchetype<AnyArchetype>>
  void deferred.preload?.()
}

/**
 * Unwraps a deferred archetype so wiring tests can assert identity
 * (`toBe(SnideScoreStamp)`). Plain components pass through; `na` is deferred
 * too (#2530).
 */
export function resolvedArchetype<P>(component: ComponentType<P>): ComponentType<P> | undefined {
  const deferred = component as Partial<LazyArchetype<ComponentType<P>>>
  return typeof deferred.resolved === 'function' ? deferred.resolved() : component
}
