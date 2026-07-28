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
 * Next levers, if this needs to go lower: the markdown stack (~568 KB
 * unminified, serving one preview component) and react-easy-crop (one modal)
 * are still eager, and axios does what fetch does.
 *
 * WARN sits just above today's number so any real growth speaks up immediately,
 * while the build stays green. Ratchet WARN downward each time a chunk moves
 * off the entry path — the budget is a ledger of progress, not a fixed wall.
 */
const BUDGETS = {
  js: { warn: 150_000, fail: 180_000, target: 120_000 },
  css: { warn: 20_000, fail: 25_000, target: 20_000 },
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
