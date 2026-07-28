#!/usr/bin/env node
/**
 * Throttled page-load measurement — the feedback loop for the 2-second rule.
 *
 * WHY NOT `load` OR `domContentLoaded`
 * ------------------------------------
 * This is a client-rendered SPA. `load` fires as soon as the shell is up, long
 * before the API has answered and anything readable is on screen — it reports
 * ~50ms and proves nothing. Largest Contentful Paint is the first metric here
 * that means "the user can see the page".
 *
 * WHY THROTTLING IS NOT OPTIONAL
 * ------------------------------
 * Against localhost every round trip is ~1ms, so a waterfall thirty levels deep
 * still finishes in 150ms and looks perfect. Real users pay ~150ms per level.
 * Every number this prints is under an emulated Slow-4G profile with a 4x CPU
 * slowdown; an unthrottled run is not a measurement, it is a reassurance.
 *
 * Usage:
 *   node scripts/measure-load.mjs [--runs 3] [--base http://localhost:5173]
 *   Requires the BUILT app being served (npm run preview) and the API up.
 */
import { chromium } from '@playwright/test'

const args = process.argv.slice(2)
const argValue = (flag, fallback) => {
  const index = args.indexOf(flag)
  return index === -1 ? fallback : args[index + 1]
}

const BASE = argValue('--base', 'http://localhost:5173')
const API = argValue('--api', 'http://localhost:8000')
const RUNS = Number(argValue('--runs', '3'))
const BUDGET_MS = 2000
const FAIL_MS = 4000

/**
 * Network profiles. `slow4g` is the pessimistic case Lighthouse scores against;
 * `fast4g` is closer to a typical phone on a good signal, and `broadband` is a
 * desktop on home internet — which is what most of this game's players are on.
 * Optimising only against slow4g would be optimising for a user who may not
 * exist; reporting only broadband would be flattering ourselves. Measure both.
 */
const PROFILES = {
  slow4g: { throughputMbps: 1.6, latency: 150, cpu: 4 },
  fast4g: { throughputMbps: 9, latency: 60, cpu: 2 },
  broadband: { throughputMbps: 30, latency: 20, cpu: 1 },
}
const PROFILE_NAME = argValue('--profile', 'slow4g')
const PROFILE = PROFILES[PROFILE_NAME]
if (!PROFILE) throw new Error(`unknown profile: ${PROFILE_NAME}`)
const SLOW_4G = {
  offline: false,
  downloadThroughput: (PROFILE.throughputMbps * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
  latency: PROFILE.latency,
}
const CPU_SLOWDOWN = PROFILE.cpu

/** Routes to measure. `needsData` ones are the faction-skinned pages. */
const ROUTES = [
  { path: '/', name: 'home (guest)' },
  { path: '/tasks', name: 'tasks list' },
  { path: '/praxes', name: 'praxis list' },
  { path: '/factions', name: 'factions' },
  { path: '/leaderboard', name: 'leaderboard' },
  { path: '/about', name: 'about (static)' },
]

async function discoverIds() {
  const found = { task: null, praxis: null }
  try {
    const tasks = await (await fetch(`${API}/tasks?status=active&limit=50`)).json()
    const list = Array.isArray(tasks) ? tasks : (tasks.items ?? [])
    // Prefer a faction-skinned task: those pull an archetype chunk, which is
    // the case this whole exercise is about.
    const skinned = list.find((task) => task.primary_faction_slug && task.primary_faction_slug !== 'na')
    found.task = (skinned ?? list[0])?.id ?? null
  } catch {
    /* API down — the route is simply skipped below. */
  }
  try {
    const praxes = await (await fetch(`${API}/praxes?status=submitted&limit=10`)).json()
    const list = Array.isArray(praxes) ? praxes : (praxes.items ?? [])
    found.praxis = list[0]?.id ?? null
  } catch {
    /* as above */
  }
  return found
}

/** LCP for one cold load. Fresh context each time so nothing is cached. */
async function measureOnce(browser, url) {
  const context = await browser.newContext()
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', SLOW_4G)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN })

  await page.addInitScript(() => {
    window.__lcp = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__lcp = entry.startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })

    // TIME TO CONTENT. LCP alone lies on this app: the nav bar and hero paint
    // almost immediately, so LCP settles on them and reports ~1.5s while the
    // page is still empty. What matters is when the ROUTE's own content lands,
    // which only happens after the API answers and the skin chunk arrives.
    // Poll for the body growing past the shell and stamp the moment it does.
    window.__contentAt = 0
    const SHELL_CHARS = 260
    const tick = () => {
      if (!window.__contentAt && (document.body?.innerText?.length ?? 0) > SHELL_CHARS) {
        window.__contentAt = performance.now()
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  let requests = 0
  page.on('request', () => { requests += 1 })

  await page.goto(url, { waitUntil: 'load', timeout: 60_000 })
  // Wait for real content rather than a fixed sleep — a fixed sleep both
  // under-measures (content arrives later) and hides failure (content never
  // arrives, and the run still reports a number).
  await page
    .waitForFunction(() => window.__contentAt > 0, undefined, { timeout: 25_000 })
    .catch(() => {})
  const result = await page.evaluate(() => ({
    lcp: Math.round(window.__lcp),
    content: Math.round(window.__contentAt),
    text: document.body.innerText.length,
  }))
  await context.close()
  return { ...result, requests }
}

const median = (numbers) => [...numbers].sort((a, b) => a - b)[Math.floor(numbers.length / 2)]

const ids = await discoverIds()
if (ids.task) ROUTES.push({ path: `/tasks/${ids.task}`, name: 'TASK DETAIL (faction)' })
if (ids.praxis) ROUTES.push({ path: `/praxes/${ids.praxis}`, name: 'PRAXIS DETAIL (faction)' })

const browser = await chromium.launch()
console.log(`\nLoad time — Slow 4G (1.6 Mbps, 150ms RTT) + ${CPU_SLOWDOWN}x CPU slowdown, median of ${RUNS}`)
console.log(`Metric: Largest Contentful Paint. Budget ${BUDGET_MS}ms, hard fail ${FAIL_MS}ms.\n`)

const rows = []
for (const route of ROUTES) {
  const samples = []
  let last = null
  for (let run = 0; run < RUNS; run++) {
    last = await measureOnce(browser, BASE + route.path)
    samples.push(last.content || Number.POSITIVE_INFINITY)
  }
  const content = median(samples)
  const verdict = content > FAIL_MS ? 'FAIL' : content > BUDGET_MS ? 'OVER' : 'ok'
  rows.push({ ...route, content, verdict, requests: last.requests, text: last.text })
  const shown = Number.isFinite(content) ? `${content}ms` : 'NO CONTENT'
  console.log(
    `  ${verdict.padEnd(4)} ${shown.padStart(10)}  ${route.name.padEnd(24)} ` +
      `${String(last.requests).padStart(3)} reqs  lcp ${String(last.lcp).padStart(5)}ms  ${last.text} chars`,
  )
}
await browser.close()

const over = rows.filter((row) => row.verdict !== 'ok')
console.log('')
if (over.length === 0) {
  console.log(`All ${rows.length} routes within ${BUDGET_MS}ms.\n`)
} else {
  console.log(`${over.length}/${rows.length} routes over ${BUDGET_MS}ms: ${over.map((r) => r.name).join(', ')}\n`)
}
process.exit(rows.some((row) => row.verdict === 'FAIL') ? 1 : 0)
