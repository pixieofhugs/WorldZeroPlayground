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
import { appendFile } from 'node:fs/promises'
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

/**
 * Routes to measure. `needsData` ones are the faction-skinned pages.
 * `authenticate: true` logs the measuring context into a dev bot account via
 * POST /auth/dev-login (ADR-none — same dev-only seam the e2e suite uses,
 * see frontend/e2e/auth.setup.ts) before navigating, so RootLanding renders
 * FieldDesk instead of the marketing Home. That endpoint 404s outside
 * ENVIRONMENT=development, so this route is skipped (not faked) if it does.
 */
const ROUTES = [
  { path: '/', name: 'home (guest)' },
  { path: '/', name: 'home (logged in — FieldDesk)', authenticate: true },
  { path: '/tasks', name: 'tasks list' },
  { path: '/praxis', name: 'praxis list' },
  { path: '/factions', name: 'factions' },
  // Bespoke-skin slug, not `na`: faction-skinned routes pull a per-faction
  // chunk on demand, which is the interesting case for this measurement.
  { path: '/factions/coven', name: 'faction detail (coven)' },
  { path: '/leaderboard', name: 'leaderboard' },
  { path: '/about', name: 'about (static)' },
]

async function discoverIds() {
  const found = { task: null, praxis: null, character: null }
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
  try {
    const characters = await (await fetch(`${API}/characters?limit=50`)).json()
    const list = Array.isArray(characters) ? characters : (characters.items ?? [])
    found.character = list[0]?.id ?? null
  } catch {
    /* as above */
  }
  return found
}

/**
 * Dev-only bot login (see ROUTES comment above). Shares cookie storage with
 * pages created from the same context, so calling this before `page.goto`
 * is enough to make the load authenticated. Returns false — never throws —
 * so a production build (where the endpoint 404s) or a down API degrades
 * into "skip this route" rather than a crashed run.
 */
async function authenticate(context) {
  try {
    const res = await context.request.post(`${API}/auth/dev-login?key=measure-nightly&name=Measure%20Bot`)
    return res.ok()
  } catch {
    return false
  }
}

/**
 * LCP for one cold load. Fresh context each time so nothing is cached.
 * Returns `{ skipped: true }` if `requireAuth` was set and dev-login didn't
 * succeed — the caller decides how to report that, this function never
 * silently measures a guest load and calls it authenticated.
 */
async function measureOnce(browser, url, { requireAuth = false } = {}) {
  const context = await browser.newContext()
  if (requireAuth && !(await authenticate(context))) {
    await context.close()
    return { skipped: true }
  }
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
if (ids.praxis) ROUTES.push({ path: `/praxis/${ids.praxis}`, name: 'PRAXIS DETAIL (faction)' })
if (ids.character) ROUTES.push({ path: `/characters/${ids.character}`, name: 'CHARACTER DETAIL' })

const browser = await chromium.launch()
const headerLine = `Load time — ${PROFILE_NAME} (${PROFILE.throughputMbps} Mbps, ${PROFILE.latency}ms RTT) + ${CPU_SLOWDOWN}x CPU slowdown, median of ${RUNS}`
console.log(`\n${headerLine}`)
console.log(`Metric: Largest Contentful Paint. Budget ${BUDGET_MS}ms, hard fail ${FAIL_MS}ms.\n`)

const rows = []
const skipped = []
for (const route of ROUTES) {
  const samples = []
  let last = null
  let routeSkipped = false
  for (let run = 0; run < RUNS; run++) {
    last = await measureOnce(browser, BASE + route.path, { requireAuth: route.authenticate })
    if (last.skipped) {
      routeSkipped = true
      break
    }
    samples.push(last.content || Number.POSITIVE_INFINITY)
  }
  if (routeSkipped) {
    skipped.push(route.name)
    console.log(`  SKIP        —         ${route.name.padEnd(24)} dev-login unavailable (down, or ENVIRONMENT=production disables it)`)
    continue
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
if (skipped.length > 0) {
  console.log(`${skipped.length} route(s) skipped, not measured: ${skipped.join(', ')}\n`)
}

// GitHub job summary: append so a regression trend is visible on the run
// page without re-running the job. `$GITHUB_STEP_SUMMARY` only exists inside
// Actions — a local run leaves this whole block a no-op.
if (process.env.GITHUB_STEP_SUMMARY) {
  const summaryLines = [
    '## Page load',
    '',
    headerLine,
    '',
    'Metric: time-to-route-content (not raw LCP — the shell paints before the route does; see script header).',
    '',
    '| Route | Median (ms) | Budget (ms) | Verdict |',
    '| --- | --- | --- | --- |',
    ...rows.map((row) => {
      const shown = Number.isFinite(row.content) ? row.content : 'NO CONTENT'
      return `| ${row.name} | ${shown} | ${BUDGET_MS} | ${row.verdict.toUpperCase()} |`
    }),
  ]
  if (skipped.length > 0) {
    summaryLines.push('', `Skipped (not measured): ${skipped.join(', ')}`)
  }
  await appendFile(process.env.GITHUB_STEP_SUMMARY, summaryLines.join('\n') + '\n')
}

process.exit(rows.some((row) => row.verdict === 'FAIL') ? 1 : 0)
