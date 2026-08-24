#!/usr/bin/env node
/**
 * Initial-load byte budget — the standing guard on "the site loads in under 2s".
 *
 * WHY BYTES AND NOT A STOPWATCH
 * -----------------------------
 * A real load-time assertion (Lighthouse, Playwright timing) measures the CI
 * runner's CPU and network as much as our code, so it flaps and gets muted.
 * Transfer size is deterministic, needs no browser, and is the term in the load
 * equation we actually control. On a Slow-4G phone (~200 KB/s effective) every
 * 100 KB gzipped is roughly half a second before first paint — so the budget
 * below IS the 2-second rule, expressed in the only unit CI can measure honestly.
 *
 * WHAT IT MEASURES
 * ----------------
 * Not "the biggest chunk" — the CRITICAL PATH: the entry script plus every
 * `<link rel="modulepreload">` Vite emits for it. Those are exactly the chunks a
 * browser must have in hand before it can render anything. Route-level chunks
 * pulled in later by `import()` are deliberately NOT counted, which is what
 * makes this check reward code splitting instead of being fooled by it.
 *
 * WARN vs FAIL
 * ------------
 * Over WARN prints a loud block and still exits 0 — you learn a change costs
 * weight without being blocked by it. Over FAIL exits 1, so the number cannot
 * quietly triple over a year of "just a bit more". TARGET is where we are going;
 * lower WARN toward it as code splitting lands.
 */
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')

/**
 * Gzipped bytes on the critical path.
 *
 * Ledger (#1045): the unsplit bundle was JS 420 KB. Splitting the faction
 * archetypes took it to 291 KB; making the 23 page routes lazy took it to
 * 139 KB. Verified in a browser as a 157 KB blocking load, after which only
 * the route and the archetypes actually on screen are fetched — the fully
 * populated landing page now costs 227 KB in total, less than the old entry
 * chunk on its own.
 *
 * Then #1400 took axios out of it: the whole app issues through an
 * `openapi-fetch` client over the platform's `fetch`, so the entry chunk went
 * 142.9 KB → 127.9 KB, measured on either side of the retirement. WARN comes
 * down with it (150,000 → 134,000) — a 15 KB win nobody can spend by accident
 * is the only kind that stays won.
 *
 * Next levers, if this needs to go lower: the markdown stack (~568 KB
 * unminified, serving one preview component) and react-easy-crop (one modal)
 * are still eager.
 *
 * WARN sits just above today's number so any real growth speaks up immediately,
 * while the build stays green. Ratchet WARN downward each time a chunk moves
 * off the entry path — the budget is a ledger of progress, not a fixed wall.
 *
 * CSS ledger (#1325): the CSS warn line sat at 20,000 while the stylesheet was
 * 20.7 KB, so every build printed the loud WARN block and the check stopped
 * carrying information — three separate agents in one batch each reported it as
 * "not mine", which is the tell. A check that warns unconditionally has been
 * turned off without anyone deciding to turn it off.
 *
 * Raised to 23,000 against a measured 22,362 (21.84 KiB gzipped) on `main` at
 * 7ce689b4, after epic #1361. That epic was the honest moment to re-price this:
 * it ADDED `components/ui/FilterBar/` (~518 lines, ~60 selectors) and then
 * DELETED three filter components — and the deletion moved nothing, because
 * Vite had already tree-shaken them (verified: identical bundle content hashes
 * across #1368). The stylesheet grew because a shared component replaced four
 * bespoke ones, which is the trade the epic was for.
 *
 * The alternative — shed ~700 bytes to fit the old line — was rejected: the
 * growth is real and paid for, and fitting a line the code has outgrown just
 * moves the lie. FAIL stays at 25,000, which is now only 2.6 KB away, so this
 * is a genuine wall rather than a formality. TARGET stays at 20,000 and is now
 * BELOW warn, giving CSS the same shape JS has: a number to ratchet back down
 * to, not a restatement of the warn line.
 *
 * CSS ledger (#1977): 23,000 -> 23,600, against a measured 23,371.
 *
 * READ THIS ONE AS A WIN, NOT A COST — it is the only entry here where the
 * number going up means the critical path got shorter. Self-hosting the 18 font
 * families moved 79 `@font-face` rules into `src/fonts.css`, which index.css
 * @imports, so they land in this stylesheet: 21,917 -> 23,371 gzipped, +1,454.
 * What they REPLACED was a render-blocking `<link>` to fonts.googleapis.com
 * serving 3,627 gzipped bytes of the same declarations, and this check could
 * never see it, because it parses dist/index.html for same-origin assets and a
 * third-party stylesheet is neither. Honest critical-path CSS is therefore
 * 25,544 -> 23,371: a 2,173-byte win reported as a 1,454-byte loss.
 *
 * The woff2 files themselves are NOT in this number and should not be. They are
 * fetched by the stylesheet, not by index.html, and only the `unicode-range`
 * cuts a page's glyphs fall in — the same lazy fetch Google's CDN did. Counting
 * all 1.2 MB here would price a download nobody makes as blocking weight.
 *
 * CSS ledger (#2079): 23,600 -> 23,400, against a measured 24,226 -> 23,122.
 *
 * THE NUMBER GOING DOWN IS REAL HERE, which is the case the entry above says is
 * the only honest one. The #1977 entry's 1,454 bytes bought 82 `@font-face`
 * rules, and 62 of them were for the 15 families ONLY A FACTION SURFACE renders
 * in — 19% of the blocking sheet, on 774 bytes of headroom. Those 62 now live in
 * `src/fonts.faction.css`, which nothing @imports: `src/factionFaces.ts` is its
 * only importer and is reached across a chunk boundary, so Vite emits it as a
 * second CSS asset (20,886 raw / 1,296 gzipped) attached to async chunks. The
 * shell's three families stayed in `fonts.css`.
 *
 * Two things worth carrying. The raw sheet went 140,721 -> 119,836 and NOTHING
 * WAS DELETED: the two assets sum to the same bytes, so this is a delivery
 * change, and the woff2 files are untouched — they were already lazy per
 * `unicode-range`. And the win is not visible in a passing build: the check
 * parses dist/index.html for the entry script plus every `modulepreload`, and if
 * that sheet ever lands in a preloaded chunk it counts again at full price with
 * the build still green. `factionFaceSplit.test.ts` is what asserts it cannot.
 *
 * WARN comes down to 23,400 — 278 bytes over today's number, which is the slack
 * the two entries above chose (229 and 638), and it is chosen rather than
 * pinned tighter for the reason the #1325 entry gives: a WARN a routine 100-byte
 * tweak trips is a WARN nobody reads. Deliberately NOT set above the three queued
 * task-card PRs (#2065 / #2067 / #2071, ~411 bytes between them). They will print
 * the block, at ~23,533, and they should: that is a win being spent, which is
 * exactly what this line exists to say out loud. FAIL is the wall, and it is
 * 1,878 bytes away — which is the room those three and #1609's print token were
 * actually waiting on.
 *
 * The stale 23,371 quoted in the entry above was measured at gzip's default
 * level. This check compresses at level 9, where `main` before this change read
 * 24,226 rather than the 24,568 the issue reports.
 *
 * CSS ledger (#2073): 23,400 -> 22,700, against a measured 23,383 -> 22,428.
 *
 * ORNAMENT MOTION IS NOW OFF THE CRITICAL PATH, PERMANENTLY. The entry above
 * moved 62 `@font-face` rules; this one moves the reduced-motion-gated motion of
 * the six praxis-card vote widgets, the Singularity slab's scanline and cursor,
 * the Coven watermark's turn and the UA mandala's five animations into
 * `src/motion.ornament.css`. Same mechanism, same chunk: `src/factionFaces.ts`
 * is the only importer of both sheets, so the deferred CSS asset went 1,296 ->
 * 2,550 gzipped and the blocking one 23,383 -> 22,428. Raw, 140,721 -> 116,126
 * with 25,887 alongside; nothing was deleted, this is a delivery change.
 *
 * WHY MOTION AND NOTHING ELSE. A late `@keyframes` shifts no layout and flashes
 * no unstyled content — the element is already drawn, in its final colours, at
 * its final size — and every rule moved was already behind
 * `prefers-reduced-motion: no-preference`, so a viewer who never receives the
 * sheet lands exactly where a reduced-motion viewer lands. That argument does
 * NOT extend to colour, layout or type, and the narrowness is the whole safety
 * case: `motionSplit.test.ts` asserts the sheet carries motion and nothing else,
 * and that every rule in it kept its gate.
 *
 * The invisible failure is the same one #2079 named: the win does not show up in
 * a red build. One `@import` from index.css, or one static import of
 * `factionFaces` from anything the entry reaches, folds both sheets back into the
 * blocking stylesheet with everything green. `factionFaceSplit.test.ts` guards
 * the entry-reachability half and `motionSplit.test.ts` guards the
 * only-one-importer half.
 *
 * WARN comes down to 22,700 — 272 bytes over today's number, inside the band the
 * three entries above chose (638, 229, 278) and for the reason the #1325 entry
 * gives. It is tight on purpose and it is affordable for a new reason rather
 * than an optimistic one: #2071 and #2072 write their ornament keyframes
 * straight into the deferred sheet, so the part of them that used to be priced
 * here now costs nothing at all. Only their paint and geometry lands in
 * index.css.
 *
 * FAIL stays at 25,000, now 2,572 bytes away. TARGET stays at 20,000 and is
 * 2,428 away — the closest this has been since it was set.
 *
 * CSS ledger (#2535): warn stays at 22,700, against a measured 22,852 -> 22,641.
 *
 * THE ENTRY THAT MOVES NOTHING, and it is here because the decision not to move
 * is the one worth recording. The 272-byte band the entry above chose was eaten
 * over five days of faction work, and `main` printed WARN CSS for nine straight
 * merges (#2469) — long enough that three separate agents in one batch each
 * reported it as "pre-existing, not mine", which is the same tell the #1325
 * entry names. The ruling on #2469 was: cut bytes, never raise the line, and
 * never make WARN fail. #2535 is that cut — 19 custom properties nothing reads,
 * twelve of them the illustration palette of the WOW crest #1989 retired.
 * Deleting them prints `ok CSS` again.
 *
 * WHY WARN DOES NOT FOLLOW IT DOWN. Every prior ratchet left 638, 229, 278 or
 * 272 bytes of slack. This win is 211 bytes and leaves 59, so there is nothing
 * to ratchet INTO: a line 59 bytes above the number is tripped by one selector,
 * which is the WARN-nobody-reads failure the #1325 entry exists to prevent. The
 * rule the ledger encodes is that the line follows a MEASURED win downward, and
 * a win this size does not reach the next rung. It comes down when the next cut
 * lands (#2469 lists the candidates); until then this file records that the
 * headroom is 59 bytes and the next PR to spend it will say so out loud.
 *
 * The deletion is guarded rather than merely done: `factionTokensReferenced`
 * fails on a declared `--faction-*` / `--spectrum-*` token that nothing reads,
 * which is what stops the next abandoned family from sitting here for months.
 */
const BUDGETS = {
  js: { warn: 134_000, fail: 180_000, target: 120_000 },
  css: { warn: 22_700, fail: 25_000, target: 20_000 },
}

/** Asset paths the entry HTML forces the browser to fetch before first render. */
function criticalPathAssets(html) {
  // Vite emits the entry as <script type="module" src>, and one
  // <link rel="modulepreload"> per statically-imported chunk. Both are blocking
  // work; anything reached later via import() is correctly absent from here.
  const patterns = [
    /<script[^>]+src="([^"]+)"/g,
    /<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g,
    /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g,
  ]
  const found = new Set()
  for (const pattern of patterns) {
    for (const [, href] of html.matchAll(pattern)) {
      if (href.startsWith('/')) found.add(href.slice(1))
    }
  }
  return [...found]
}

function gzippedSize(relativePath) {
  return gzipSync(readFileSync(join(DIST, relativePath)), { level: 9 }).length
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

let html
try {
  html = readFileSync(join(DIST, 'index.html'), 'utf8')
} catch {
  console.error('bundle-budget: no dist/index.html — run `npm run build` first.')
  process.exit(1)
}

const assets = criticalPathAssets(html)
if (assets.length === 0) {
  // A silent pass here would be worse than a failure: it means the check has
  // stopped seeing the bundle (renamed tags, changed Vite output) and is
  // guarding nothing.
  console.error('bundle-budget: parsed no assets from dist/index.html — the check is blind, not passing.')
  process.exit(1)
}

const totals = { js: 0, css: 0 }
const rows = []
for (const asset of assets) {
  const kind = asset.endsWith('.css') ? 'css' : asset.endsWith('.js') ? 'js' : null
  if (!kind) continue
  const size = gzippedSize(asset)
  totals[kind] += size
  rows.push([asset, kind, size])
}

console.log(`\nInitial-load budget — ${assets.length} blocking asset(s), gzipped\n`)
for (const [asset, kind, size] of rows.sort((a, b) => b[2] - a[2])) {
  console.log(`  ${kb(size).padStart(10)}  ${kind.padEnd(4)} ${asset}`)
}

let failed = false
let warned = false
console.log('')
for (const [kind, budget] of Object.entries(BUDGETS)) {
  const total = totals[kind]
  const verdict = total > budget.fail ? 'FAIL' : total > budget.warn ? 'WARN' : 'ok'
  if (verdict === 'FAIL') failed = true
  if (verdict === 'WARN') warned = true
  console.log(
    `  ${verdict.padEnd(4)} ${kind.toUpperCase().padEnd(4)} ${kb(total).padStart(10)}` +
      `   warn>${kb(budget.warn)}  fail>${kb(budget.fail)}  target ${kb(budget.target)}`,
  )
}

if (failed) {
  console.error(
    '\nBundle budget EXCEEDED. The initial payload is now big enough to push first paint past ~2s on a mid-tier phone.' +
      '\nMove work off the critical path with a dynamic import() rather than raising the ceiling.\n',
  )
  process.exit(1)
}
if (warned) {
  console.warn(
    '\nBundle budget WARNING — this change grew the initial payload past the agreed line.' +
      '\nNot blocking, but it is now on the wrong side of the 2-second rule. Prefer a lazy route/component over a bigger budget.\n',
  )
}
if (!failed && !warned) console.log('\nWithin budget.\n')
