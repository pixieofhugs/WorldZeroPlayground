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

Nothing else has to change. `surfaceMap()` and `resolveVariant()` don't know the
difference, no dispatcher is touched, and the chunk is fetched only when a
surface for that faction actually renders. Adding a skin to all nine factions
adds nine chunks that load for at most one faction at a time.

Pages are the same story: every route in `App.tsx` is behind `React.lazy` under
one `<Suspense>`. A new page is one more `lazy(() => import(...))` line and
costs the entry chunk nothing.

**So the guidance is not "remember to optimise". It is "register through the
manifest, add routes the way the neighbours do, and you get this for free."**

## The four ways to break it

Every regression will be one of these.

**1. A static import from something eager.** The original bug. `factions/index.ts`
imports all nine manifests, so anything a manifest imported *statically* landed
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

**4. A new font family.** The 18 families are self-hosted since #1977:
`scripts/fetch-fonts.mjs` writes `src/assets/fonts/*.woff2` and **two**
stylesheets, and the woff2 files are content-hashed into `/assets` where
render.yaml serves them `immutable`. Which sheet a family lands in is what
decides whether it costs critical-path bytes (#2079), and it is decided by
`SHELL_FAMILIES` in that script: `src/fonts.css` is `@import`ed by index.css and
holds the three families the shell renders in, so its rules block first paint;
`src/fonts.faction.css` is imported only by `src/factionFaces.ts` across a chunk
boundary, so Vite emits it as a separate CSS asset that `dist/index.html` never
references. Adding a faction family therefore costs a woff2 in the repo and
nothing on the critical path — adding a **shell** family costs both. Before
adding one, check that the one you want isn't already there, and add it to
`FACES` in the script rather than hand-editing the generated CSS.

`factionFaceSplit.test.ts` is the guard on that boundary, and it is worth knowing
why it reads the module graph rather than the sheets: a family in the wrong sheet
fails nothing in either direction. Stranded, it paints its `font-display: swap`
fallback forever; imported eagerly, all 62 rules rejoin the blocking stylesheet
with the build green and only the budget number moving.

`fontsLoaded.test.ts` guards this in three directions: a family named in source
but not shipped renders as a silent fallback (#839); a family shipped but named
nowhere is weight nobody uses — which matters most when a surface is *deleted*,
because the card goes and the font stays behind; and since self-hosting, a
`src:` path that does not match a file on disk, which is the same silent
fallback wearing the delivery mechanism's clothes.

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

## Slow is not always bytes

The most expensive load problem found so far had nothing to do with the bundle.
An axios interceptor redirected to `/` on **any** 401, and `/auth/me` returns 401
for a logged-out visitor — so every guest opening any URL other than `/` was
bounced to the homepage by `window.location.href`, a full document navigation.
They downloaded the entire app, the fonts and every API response **twice**, and
landed somewhere they had not asked for.

No bundle work would ever have found that, and no byte budget would have flagged
it. When a page feels slow, check what it actually *did* — a waterfall showing
the document requested twice is a different bug from a waterfall that is simply
wide. `shouldReturnToLanding` in `api/sessionRedirect.ts` is now unit-tested for it.

## Preloading can make things much worse

Chunks are split so they are not on the critical path. Pulling them down early
"to have them ready" puts them back on it. Warming all ~180 archetype chunks
right after mount took every route from ~2.5s to **~8.5s** on Slow 4G: 250
requests saturated the link and starved the API calls that the page actually
needed. It was reverted the same hour it was written.

If a cascade genuinely needs collapsing, the fix is fewer chunks, not earlier
requests — and prove it with a measurement, because this one looked obviously
correct right up until it was measured.

## Measuring

- `npm run budget` — bytes on the critical path. Deterministic, runs per-PR,
  warns on growth and fails past a ceiling. Thresholds live in
  `frontend/scripts/bundle-budget.mjs` and are a **ratchet**: when you move
  weight off the entry path, lower the warn line to match so the win is locked in.
- `npm run measure` — real page-load timing, under emulated throttling. Runs
  nightly (`scripts/measure-nightly.sh`, wired into `e2e.yml`), not per-PR: a
  stopwatch on a shared runner flaps, and a check that flaps gets muted.
  **Throttle or do not bother.** Against localhost every round trip is ~1ms, so a
  waterfall thirty levels deep still finishes in 150ms and looks perfect.
  The same build measured across profiles:
  broadband ~0.2-0.7s, fast 4G ~0.5-1.1s, slow 4G ~1.5-2.9s. Which of those you
  quote is a decision about who you are building for, so the script takes
  `--profile` and prints which one it used.
- It measures **time-to-content**, not LCP. On this app the nav and hero paint
  almost immediately, so LCP settles on them and reports ~1.5s while the page is
  still empty.
- To see what a page actually costs, load the built app (`npm run preview`) and
  read `performance.getEntriesByType('resource')`. That distinguishes the
  blocking payload from chunks fetched afterwards, which the budget number alone
  does not tell you.
