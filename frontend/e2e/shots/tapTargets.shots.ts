import { test, expect } from '@playwright/test'
import { settle } from './settle'

/**
 * #3756: on a 375px touch phone every listed control's HIT box is >= 44 both ways.
 * The hit box is the element grown by its ::before; four inset corners of the 44px
 * square around its centre must also land on it, which catches an overlap.
 *
 *   npx playwright test --config playwright.shots.config.ts tapTargets
 */
const API = process.env.E2E_API_URL ?? 'http://localhost:8000'
const CASES: Array<[route: string, selectors: string[]]> = [
  ['/settings', ['[role=switch]', 'header a', 'footer a']],
  ['/praxis/{draft}/edit', ['[role=toolbar] button', '[role=tab]', 'nav[aria-label] a', 'footer a']],
  ['/leaderboard', ['button[aria-expanded]', 'main button.hit-box']],
  ['/factions/snide', ['button[aria-expanded]']],
  ['/updates', ['[data-feed-bulk]']],
]

test.use({ hasTouch: true, viewport: { width: 375, height: 800 } })

for (const [route, selectors] of CASES) {
  test(`${route} · tap targets`, async ({ page }) => {
    const res = await page.request.post(`${API}/auth/dev-login?key=shots&name=Shot%20Bot&level=3&faction=snide&draft_praxis=true`)
    const draft = (await res.json()).draft_praxis_id
    // Local CORS allows :3000/:5173 only; set E2E_WEB_PORT elsewhere and this lets the API answer.
    await page.route(`${API}/**`, async (r) => {
      const cors = { 'access-control-allow-origin': `http://localhost:${process.env.E2E_WEB_PORT ?? '3000'}`, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors })
      const res = await r.fetch()
      return r.fulfill({ response: res, headers: { ...res.headers(), ...cors } })
    })
    await page.goto(route.replace('{draft}', String(draft)))
    await settle(page)
    for (const selector of selectors) {
      await page.locator(selector).first().waitFor({ timeout: 8000 })
      const bad = await page.$$eval(selector, (els) =>
        els.flatMap((el) => {
          if (el.getBoundingClientRect().width === 0 || el.closest('[hidden]')) return []
          el.scrollIntoView({ block: 'center' })
          const r = el.getBoundingClientRect()
          const before = getComputedStyle(el, '::before')
          const w = Math.max(r.width, before.position === 'absolute' ? parseFloat(before.width) : 0)
          const h = Math.max(r.height, before.position === 'absolute' ? parseFloat(before.height) : 0)
          const cx = r.left + r.width / 2
          const cy = r.top + r.height / 2
          const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => {
            const x = cx + sx * (Math.max(w, 44) / 2 - 2)
            const y = cy + sy * (Math.max(h, 44) / 2 - 2)
            const hit = document.elementFromPoint(x, y)
            return !!hit && (el.contains(hit) || hit.contains(el))
          })
          const short = w < 43.5 || h < 43.5
          return short || corners.includes(false)
            ? [`${(el.textContent ?? '').trim().slice(0, 20)} ${Math.round(w)}x${Math.round(h)} corners=${corners}`]
            : []
        }),
      )
      expect(bad, `${route} ${selector}`).toEqual([])
    }
  })
}
