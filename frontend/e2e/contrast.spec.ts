import { test, expect, type Page } from '@playwright/test'

import { RENDERED_BASELINE, baselineKey, type BaselineEntry } from './contrastBaseline'
import { scanPageForContrast, type Finding } from './contrastScan'

/**
 * Part B of the contrast foundation (#651) — the RENDERED contrast sweep.
 *
 * Part A (`src/utils/__tests__/factionContrast.test.ts`) measures token
 * *values*. It cannot catch the other half of this bug family: a component
 * reaching for the wrong token — `--everymen-ink` (structure: borders, rules,
 * text on gold elements) used as body text on `--everymen-paper` (the surface
 * that FLIPS in dark). That pairing is 1.16:1 in dark, and it only exists once
 * rendered. #595 fixed one instance of it by hand; siblings survived. This
 * walks all of them.
 *
 * Coverage: 7 factions x 2 themes x 2 viewports. Both viewports because the
 * mobile archetypes are separate files and diverge (#565) — a desktop-only
 * sweep would report green over half the app.
 *
 * Nightly, not per-PR: `.github/workflows/e2e.yml` already stands up Postgres
 * + backend + seed + Playwright. No new CI job.
 */

const API = process.env.E2E_API_URL ?? 'http://localhost:8000'

const FACTIONS = ['ua', 'everymen', 'wow', 'snide', 'ephemerists', 'singularity', 'albescent'] as const
const THEMES = ['light', 'dark'] as const
const VIEWPORTS = {
  // Matches useFormFactor's single 767px breakpoint (#494) — no tablet tier.
  mobile: { width: 375, height: 812 },
  desktop: { width: 1280, height: 800 },
} as const

type Theme = (typeof THEMES)[number]
type Faction = (typeof FACTIONS)[number]
type ViewportName = keyof typeof VIEWPORTS

/**
 * Routes whose chrome is skinned by the viewer's faction. `/factions/${slug}`
 * is added per-faction — it is the faction's own bespoke surface.
 */
const SHARED_ROUTES = ['/', '/tasks', '/praxes', '/leaderboard', '/factions']

// This spec opts out of the shared bot's saved cookie: it re-logs per faction
// against its own dev account so it can't leave other specs' bot in Snide.
test.use({ storageState: { cookies: [], origins: [] } })

async function loginAs(page: Page, faction: Faction): Promise<void> {
  const response = await page.request.post(
    `${API}/auth/dev-login?key=contrast&name=Contrast%20Bot&faction=${faction}`,
  )
  expect(response.ok(), `dev-login?faction=${faction} failed — is the backend up on ${API}?`).toBeTruthy()
  expect((await response.json()).faction_slug).toBe(faction)
}

async function useTheme(page: Page, theme: Theme): Promise<void> {
  // The theme is bootstrapped from localStorage in index.html before React
  // hydrates, so it must be seeded before the first navigation — not toggled
  // after, which would measure a repaint rather than the real first paint.
  await page.addInitScript((value) => {
    window.localStorage.setItem('wz-theme', value as string)
  }, theme)
}

function describeFinding(finding: Finding): string {
  const size = `${finding.fontSizePx}px/${finding.fontWeight}`
  if (finding.background === null) {
    return `  UNRESOLVED BACKDROP — ${finding.where} (${size})\n    "${finding.sample}"\n    ${finding.unresolved}`
  }
  return `  ${finding.ratio.toFixed(2)}:1 (needs ${finding.required}:1) — ${finding.text} on ${finding.background}\n    ${finding.where} (${size}) "${finding.sample}"`
}

/** Everything the sweep saw, for the audit comment on #651. */
const auditLog = new Map<string, { finding: Finding; seenAt: Set<string> }>()

function record(theme: Theme, route: string, finding: Finding): string {
  const key =
    finding.background === null
      ? `${theme} | UNRESOLVED | ${finding.where}`
      : baselineKey(theme, finding.text, finding.background)
  const existing = auditLog.get(key)
  if (existing) existing.seenAt.add(route)
  else auditLog.set(key, { finding, seenAt: new Set([route]) })
  return key
}

test.afterAll(() => {
  if (auditLog.size === 0) return
  // Printed, not asserted: this is the audit list #651 asks to be posted as a
  // comment so it can be triaged into children.
  const kinds = new Map<string, number>()
  for (const { finding } of auditLog.values()) {
    const kind = finding.background === null ? `unresolved:${finding.unresolvedKind}` : 'measured-fail'
    kinds.set(kind, (kinds.get(kind) ?? 0) + 1)
  }
  const breakdown = [...kinds].map(([kind, count]) => `${kind}: ${count}`).join('\n')
  console.log(`\n===== #651 breakdown =====\n${breakdown}\n`)
  const lines = [...auditLog.entries()]
    .sort(([, a], [, b]) => a.finding.ratio - b.finding.ratio)
    .map(([key, { finding, seenAt }]) => `${key}\n${describeFinding(finding)}\n    seen on: ${[...seenAt].join(', ')}`)
  console.log(`\n===== #651 rendered contrast audit (${auditLog.size} distinct failing pairs) =====\n${lines.join('\n')}\n`)
})

for (const faction of FACTIONS) {
  for (const theme of THEMES) {
    for (const viewport of Object.keys(VIEWPORTS) as ViewportName[]) {
      test(`${faction} · ${theme} · ${viewport} clears WCAG AA`, async ({ page }) => {
        test.setTimeout(120_000)
        await page.setViewportSize(VIEWPORTS[viewport])
        await useTheme(page, theme)
        await loginAs(page, faction)

        const routes = [...SHARED_ROUTES, `/factions/${faction}`]
        const failures: string[] = []
        const passing: string[] = []

        for (const route of routes) {
          await page.goto(route)
          // The skin depends on the viewer's faction, which arrives with
          // /auth/me — measuring before it lands would measure the default.
          await page.waitForLoadState('networkidle')
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

          const findings = (await page.evaluate(scanPageForContrast)) as Finding[]
          for (const finding of findings) {
            const resolved = finding.background !== null && finding.ratio >= finding.required
            const key = resolved ? baselineKey(theme, finding.text, finding.background!) : record(theme, route, finding)
            const allowed: BaselineEntry | undefined = RENDERED_BASELINE[key]

            if (resolved) {
              // A pair that now passes but is still allowlisted is debt that
              // got fixed without the list being updated. Catch it: an
              // allowlist that outlives its bug stops being a ratchet.
              if (allowed) passing.push(`${key} now measures ${finding.ratio.toFixed(2)}:1 (owned by #${allowed.issue})`)
              continue
            }
            if (allowed) continue
            failures.push(describeFinding(finding))
          }
        }

        expect(
          failures,
          `${faction}/${theme}/${viewport}: ${failures.length} text nodes below WCAG AA.\n` +
            `An UNRESOLVED BACKDROP is a failure, not a skip — text over a gradient/image cannot be measured, ` +
            `so it must be given a solid backdrop (or the gradient hoisted behind an opaque card).\n\n` +
            [...new Set(failures)].join('\n\n'),
        ).toHaveLength(0)

        expect(
          [...new Set(passing)],
          `These pairs are in RENDERED_BASELINE but now clear AA — delete their entries in contrastBaseline.ts. ` +
            `The list only ever shrinks.`,
        ).toHaveLength(0)
      })
    }
  }
}
