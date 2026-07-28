# Shipping a surface without slowing the site down

Written after the #1045 pass, which cut the initial JavaScript payload by two
thirds. Almost none of that was clever optimisation. It was undoing one
structural mistake — every faction's every surface being reachable from the
entry chunk — and the same mistake will come back the moment a new surface is
wired up the wrong way.

The point of this document is that the next twenty surfaces should cost
**nothing** at load time, and that you should find out within one CI run if one
of them didn't.

## The one rule

**A new surface must not enlarge the initial payload.**

The initial payload is what a browser must download before it can paint
anything: the entry chunk plus everything Vite `modulepreload`s for it. A new
faction skin, a new page, a new card archetype — none of these should move that
number, because none of them are needed by a visitor who hasn't navigated to
them yet.

Concretely: `npm run budget` prints that number and warns when it grows. That
job runs in CI after the build. If your PR moves it, something got wired into
the eager path.

## Why most new surfaces are already free

The architecture does the work, provided you use it.

A faction archetype registered in `frontend/src/factions/<slug>.ts` is
code-split automatically. The manifest entry is a **loader**, not an import:

```ts
const CovenTaskDetail = lazyArchetype(() => import('../pages/taskDetail/archetypes/CovenTaskDetail'))
// ...
taskDetail: () => CovenTaskDetail,
```

Nothing else has to change. `surfaceMap()` and `pickVariant()` don't know the
difference, no dispatcher is touched, and the chunk is fetched only when a
surface for that faction actually renders. Adding a skin to all eight factions
adds eight chunks that load for at most one faction at a time.

Pages are the same story: every route in `App.tsx` is behind `React.lazy` under
one `<Suspense>`. A new page is one more `lazy(() => import(...))` line and
costs the entry chunk nothing.

**So the guidance is not "remember to optimise". It is "register through the
manifest, add routes the way the neighbours do, and you get this for free."**

## The four ways to break it

Every regression will be one of these.

**1. A static import from something eager.** The original bug. `factions/index.ts`
imports all eight manifests, so anything a manifest imported *statically* landed
in the entry chunk — all ~184 archetypes of it. If you find yourself writing
`import Foo from './heavy'` at the top of a manifest, or importing an archetype
directly from a dispatcher, you have re-created it.

**2. A barrel.** `export * from './everything'` pulls the whole directory into
whatever chunk touches one symbol. The faction manifest index gets away with it
only because its contents are loaders.

**3. Splitting the routes but not the weight.** Worth knowing because it looks
like progress: making all 23 pages lazy on its own recovered only 58 KB of 420,
because the manifest barrel still anchored every archetype in the shared chunk.
If a split doesn't move the budget number, the weight is being held somewhere
else — find out where before shipping the split.

**4. A new font family.** `index.html` requests a Google Fonts stylesheet that
is render-blocking and on a third-party origin. Every family added to that URL
adds `@font-face` blocks to a file that must download before first paint. At the
time of writing that request names families nothing in the codebase uses. Before
adding one, check that the one you want isn't already there.

## Assets

**Vector is not automatically the light choice.** The ensō was 211 KB gzipped as
an SVG and 31 KB as a WebP, and the vector cost more than bytes: its
`feTurbulence` filter re-ran over 284 paths on every render, so a list of twenty
UA cards paid for it twenty times. Rasterising baked the filter in.

Rules of thumb:

- **A mark used as a CSS mask only needs its alpha channel.** Colour in the
  source is discarded. Flatten RGB before encoding — that alone roughly halves
  the file, because the alpha plane is stored losslessly regardless of quality.
- **Size the raster to the largest render that anyone can actually read**, not
  the largest render that exists. A watermark at 0.06 opacity does not need
  pixel parity.
- **Keep SVG where the drawing needs to stay resolution-independent or carry
  gradients a mask can't** (`Lotus` is inline for exactly this reason).
- **A filter that runs per-render is a paint cost no byte budget will catch.**
  If a mark has `feTurbulence`, `feDisplacementMap`, or a big blur and it
  appears once per card, rasterise it.
- Source files that exist only to regenerate an asset live in `src/` beside
  their component, never in `public/` — anything in `public/` is deployed
  whether or not it is used.

## Caching

Everything under `/assets/` is content-hashed by Vite, so it is served
`immutable` in `render.yaml`. `index.html` is not hashed and stays `no-cache`,
because it is what points at the current bundle.

Do not reach for `no-cache` on the static site to make data look fresher. It
can't: the API is a separate Render service on another origin, and the frontend's
headers never touch it. That mistake was in `render.yaml` for a while and cost
every visitor a revalidation round-trip before first paint.

## The one thing to know before touching the split

The test harness renders through `renderToStaticMarkup`, which is **synchronous**
and runs no effects. `React.lazy` can never resolve inside a synchronous render,
which is why faction archetypes use `lazyArchetype` (a preload that parks the
module in a closure so it renders synchronously afterwards) rather than
`React.lazy`, and why routes — which no unit test renders — can use `React.lazy`
directly.

Two consequences worth internalising:

- `src/test/preloadArchetypes.ts` resolves every archetype in a `beforeAll`.
  It must stay in a hook, not at module scope: importing the faction graph at
  setup-module scope loads the real implementations before any test's `vi.mock`
  registers, which silently breaks tests that have nothing to do with factions.
- A dispatch test that asserts identity (`expect(surfaceMap('x').coven).toBe(CovenThing)`)
  needs `resolvedArchetype()` to unwrap the deferred component. Without it the
  assertion compares a wrapper to a module and fails. This is the one recurring
  edit new faction surfaces need.

## Measuring

- `npm run budget` — bytes on the critical path. Deterministic, runs per-PR,
  warns on growth and fails past a ceiling. Thresholds live in
  `frontend/scripts/bundle-budget.mjs` and are a **ratchet**: when you move
  weight off the entry path, lower the warn line to match so the win is locked in.
- Real page-load *timing* is measured nightly, not per-PR — a stopwatch in PR CI
  measures the runner's mood. See the nightly e2e workflow.
- To see what a page actually costs, load the built app (`npm run preview`) and
  read `performance.getEntriesByType('resource')`. That distinguishes the
  blocking payload from chunks fetched afterwards, which the budget number alone
  does not tell you.
