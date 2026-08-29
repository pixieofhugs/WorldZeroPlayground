import { useEffect, useState, type ComponentProps, type ComponentType } from 'react'

/**
 * Code-splitting seam for faction archetypes (#1045).
 *
 * THE PROBLEM
 * -----------
 * `factions/index.ts` statically imports all eight manifests, and each manifest
 * statically imported ~23 archetype components. Any dispatcher that called
 * `surfaceMap()` therefore dragged all ~184 archetypes into the entry chunk, so
 * a logged-out visitor on the marketing homepage downloaded every faction's
 * edit-praxis composer and task-detail page before anything painted. Measured:
 * 420 KB gzip of critical path, of which ~270 KB was archetypes nobody on that
 * page could see. Route-level splitting alone only recovered 58 KB — the barrel,
 * not the routes, was holding the weight.
 *
 * WHY NOT `React.lazy`
 * --------------------
 * `React.lazy` is the obvious tool and it is the wrong one HERE, for one
 * specific reason: every test in this repo renders through
 * `renderToStaticMarkup`, which is synchronous. A `React.lazy` component can
 * never resolve inside a synchronous render — even when its module is already
 * in the ES module cache, React still has to travel Pending → microtask →
 * Resolved, and the static renderer does not await. Adopting `React.lazy` would
 * mean rewriting the ~20 test files that dispatch through the manifest, or
 * reaching into React's private `_payload` to pre-warm it.
 *
 * `preload()` below is the whole difference: it parks the module in an ordinary
 * closure variable, so once it has run the component renders SYNCHRONOUSLY and
 * `renderToStaticMarkup` is satisfied. One setup file awaits it once
 * (`src/test/preloadArchetypes.ts`) and all 246 existing render assertions keep
 * working untouched.
 *
 * The second payoff is that no `<Suspense>` boundary is needed at ~30 dispatch
 * sites: an unloaded archetype renders `null` for one frame and swaps itself in,
 * which is what a `<Suspense fallback={null}>` would have shown anyway.
 *
 * ponytail: hand-rolled instead of React.lazy purely to get a synchronous path
 * after preload. If this repo ever gains a DOM-based test harness that can
 * await, delete this and use React.lazy + Suspense.
 */

/**
 * Any component a manifest can name. The generic is deliberately over the whole
 * COMPONENT rather than over its props: inferring `P` out of
 * `ComponentType<P>` collapses to `never` for the named-export form
 * (`import(...).then((m) => ({ default: m.WowSigil }))`), because
 * `ComponentType` is itself a union and TypeScript cannot pick a branch. The
 * prop contract is not lost — `FactionManifest` declares the exact type each
 * surface accepts, so a mis-typed archetype still fails at the manifest field.
 */
type AnyArchetype = ComponentType<any>

/** A deferred archetype that can be forced to resolve ahead of render. */
type LazyArchetype<C extends AnyArchetype> = C & {
  preload: () => Promise<void>
  /** The component this resolved to, or undefined before `preload()` has run. */
  resolved: () => C | undefined
}

/**
 * Every archetype built by {@link lazyArchetype}, so the test harness can warm
 * all of them in one call without enumerating them by hand. Registration
 * happens when a manifest module evaluates, and `factions/index.ts` imports all
 * eight, so importing that index populates this completely.
 */
const REGISTRY: Array<() => Promise<void>> = []

export function lazyArchetype<C extends AnyArchetype>(
  load: () => Promise<{ default: C }>,
): LazyArchetype<C> {
  let Resolved: C | undefined
  let inflight: Promise<void> | undefined

  const preload = (): Promise<void> => {
    if (Resolved) return Promise.resolve()
    // The faction @font-face sheet is off the critical path (#2079), and this is
    // the one funnel every faction archetype's chunk comes through — so it is
    // where the sheet gets asked for. Dynamic because this module lives in the
    // ENTRY chunk: a static import would put all 62 rules back in the
    // render-blocking stylesheet, which is the whole thing #2079 undid.
    //
    // Deliberately not awaited, and deliberately not part of `inflight`. A face
    // must never gate a render: `font-display: swap` means the worst case is one
    // frame of fallback type, whereas awaiting a stylesheet would let a failed
    // CSS fetch strand the surface at `null` forever. Vite dedupes the request,
    // so calling it once per archetype costs nothing.
    void import('../factionFaces')
    // Cache the promise, not just the result: several cards of the same faction
    // mount together, and without this each one fires its own import().
    inflight ??= load().then((module) => {
      Resolved = module.default
    })
    return inflight
  }

  function Archetype(props: ComponentProps<C>) {
    // Counter rather than a boolean: a boolean already `true` bails out of the
    // re-render, which is fine, but the counter makes the intent ("force one
    // more render once the chunk lands") impossible to misread.
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

    // Null for the frame before the chunk lands. Effects never run under
    // renderToStaticMarkup, so in tests this is null unless preload() ran —
    // which is exactly what the setup file guarantees.
    if (!Resolved) return null
    const Loaded = Resolved as ComponentType<ComponentProps<C>>
    return <Loaded {...props} />
  }

  Archetype.preload = preload
  Archetype.resolved = () => Resolved
  REGISTRY.push(preload)
  return Archetype as unknown as LazyArchetype<C>
}

/**
 * Resolve every registered archetype. Import `factions/index.ts` first so all
 * eight manifests have registered, or this warms only what happens to be loaded.
 */
export async function preloadAllArchetypes(): Promise<void> {
  await Promise.all(REGISTRY.map((preload) => preload()))
}

/**
 * Start a dispatched archetype's chunk without rendering it.
 *
 * The wrapper requests its chunk from an effect, so the download cannot begin
 * until the archetype is on screen — and a page that knows which faction it
 * will wear before it is ready to draw (the composer: the praxis payload names
 * the task's faction a round trip before `getTask` answers) would otherwise
 * spend that whole round trip not downloading it (#1379).
 *
 * A plain component passes through as a no-op, which is what the `Default*`
 * fall-through needs: it is in the caller's chunk already.
 */
export function preloadArchetype(component: AnyArchetype): void {
  const deferred = component as Partial<LazyArchetype<AnyArchetype>>
  void deferred.preload?.()
}

/**
 * The component a dispatched archetype actually resolves to.
 *
 * A manifest entry is now a loader, so `surfaceMap()` hands back the deferred
 * wrapper rather than the archetype itself, and a bare
 * `expect(pickVariant(...)).toBe(SnideScoreStamp)` compares the wrapper to the
 * module and fails. This unwraps it, so a wiring test still asserts exactly
 * "this slug is wired to this component" rather than being softened into a
 * looser markup check.
 *
 * A plain component passes straight through, which is what a test that names a
 * `Default*` module directly needs. Note it no longer covers the na dispatch
 * itself: since #2530 `na` is a manifest row like the other eight, so
 * `resolveVariant(map, 'na')` hands back a DEFERRED wrapper and an identity
 * comparison must be unwrapped here first.
 */
export function resolvedArchetype<P>(component: ComponentType<P>): ComponentType<P> | undefined {
  const deferred = component as Partial<LazyArchetype<ComponentType<P>>>
  return typeof deferred.resolved === 'function' ? deferred.resolved() : component
}
