import { test, expect } from '@playwright/test'
import { settle } from './shots/settle'

/**
 * #3756: on a 375px touch phone every listed control's HIT box is >= 44 both ways.
 * The hit box is the element grown by its ::before; four inset corners of the 44px
 * square around its centre must also land on it, which catches an overlap.
 * Runs in the E2E workflow (a changed *.spec.ts); locally: bash e2e/run-e2e.sh e2e/tapTargets.spec.ts
 */
const API = process.env.E2E_API_URL ?? 'http://localhost:8000'
const CASES: Array<[route: string, selectors: string[]]> = [
  ['/settings', ['[role=switch]', 'header a', 'footer a']],
  ['/praxis/{draft}/edit', ['[role=toolbar] button', '[role=tab]', 'nav[aria-label] a', 'footer a']],
  ['/leaderboard', ['button[aria-expanded]', 'main button.hit-box', 'button[aria-pressed]']],
  ['/praxis?faction=snide', ['.filter-bar__link']],
  ['/praxis/{praxis}', ['button:text-is("Post comment")']],
  ['/factions/snide', ['button[aria-expanded]']],
  ['/updates', ['[data-feed-bulk]', '.feed-action']],
]

test.use({ storageState: { cookies: [], origins: [] }, hasTouch: true, isMobile: true, viewport: { width: 375, height: 800 } })

for (const [route, selectors] of CASES) {
  test(`${route} · tap targets`, async ({ page }) => {
    const res = await page.request.post(`${API}/auth/dev-login?key=shots&name=Shot%20Bot&level=3&faction=snide&draft_praxis=true&received_vote=true&invited=coven`)
    const draft = (await res.json()).draft_praxis_id
    const [first] = await (await page.request.get(`${API}/praxes?limit=1`)).json()
    await page.goto(route.replace('{draft}', String(draft)).replace('{praxis}', String(first?.id)))
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
