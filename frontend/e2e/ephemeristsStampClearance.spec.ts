import { test, expect } from '@playwright/test'

import { attachProof, createPraxis, loginPlayer, submitPraxis } from '../src/utils/e2eScenario'
import { scenarioFor } from './duel.helpers'

/*
 * #2820: the Ephemerists crown hangs 13px above its panel, so a host that
 * states its gap to the panel leaves the crown cramped. Geometry's home is the
 * rendered sweep (#2864). Fixture: `fixture_tasks.py`'s level-9 Ephemerists task;
 * the crown needs this to be the task's only submitted praxis (fresh e2e DB).
 */
const TASK_TITLE = 'E2E fixture: Ephemerists Stamp Clearance'
const TITLE = 'Stamp clearance'
/* S.N.I.D.E.'s clearance above its stamp (--space-xl), the owner's target. */
const CARD_CLEARANCE = 24
/* Measured on the S.N.I.D.E. rail: 8-10px from the heading to the crown. */
const RAIL_CLEARANCE = 8

/* Composer task slip, measured the same way: S.N.I.D.E. 38px from the status row to the stamp (desktop). */
const SLIP_CLEARANCE = 38
/* Phone: the stamp stacks under the copy, a `--space-lg` flex gap. */
const SLIP_STACK_GAP = 16

test.use({ storageState: { cookies: [], origins: [] } })

const VIEWPORTS = [
  { name: 'desktop', size: { width: 1280, height: 900 }, touch: false },
  { name: 'mobile', size: { width: 375, height: 800 }, touch: true },
  { name: 'narrow', size: { width: 320, height: 800 }, touch: true },
] as const

test.describe('Ephemerists stamp clearance (#2820)', () => {
  test.describe.configure({ mode: 'serial', retries: 0 })
  let praxisId: number
  let draftId: number
  let draftState: Awaited<ReturnType<import('@playwright/test').BrowserContext['storageState']>>
  let storageState: Awaited<ReturnType<import('@playwright/test').BrowserContext['storageState']>>

  test.beforeAll(async ({ browser }) => {
    const author = await loginPlayer(scenarioFor(browser), 'ec', 9)
    const response = await author.ctx.request.get(`${author.api}/tasks?faction=ephemerists&limit=200`)
    const tasks = (await response.json()) as { id: number; title: string }[]
    const task = tasks.find((candidate) => candidate.title === TASK_TITLE)
    expect(task, `${TASK_TITLE} missing: run e2e/fixture_tasks.py`).toBeTruthy()
    const praxis = await createPraxis(author, { task_id: task!.id, type: 'solo', title: TITLE, body_text: 'x' })
    await attachProof(author, praxis.id)
    await submitPraxis(author, praxis.id)
    praxisId = praxis.id
    storageState = await author.ctx.storageState()
    await author.ctx.close()

    // A second author's unsubmitted draft on the same task: no crown, no vote on the first.
    const drafter = await loginPlayer(scenarioFor(browser), 'ed', 9)
    draftId = (await createPraxis(drafter, { task_id: task!.id, type: 'solo', title: TITLE, body_text: 'x' })).id
    draftState = await drafter.ctx.storageState()
    await drafter.ctx.close()
  })

  for (const { name, size, touch } of VIEWPORTS) {
    test(`${name} · card, rail and composer slip keep the stamp clear`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: size, hasTouch: touch, storageState })
      const page = await context.newPage()

      await page.goto('/praxis')
      await page.waitForLoadState('networkidle')
      await page.evaluate(() => document.fonts.ready.then(() => undefined))
      const card = await page.evaluate((title) => {
        const h2 = Array.from(document.querySelectorAll('h2')).find((h) => h.textContent === title)!
        const row = h2.closest('[style*=overflow-wrap]')!.parentElement!
        const root = row.querySelector('[style*="top: -13px"]')!.parentElement!
        return {
          stampAboveTitle: h2.getBoundingClientRect().top - root.getBoundingClientRect().top,
          fromLeaf: root.getBoundingClientRect().top - row.parentElement!.getBoundingClientRect().top,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        }
      }, TITLE)
      expect(card.stampAboveTitle, 'the stamp hangs above the title').toBeLessThanOrEqual(0.5)
      expect(card.fromLeaf, `card: stamp panel to leaf top (${CARD_CLEARANCE} = S.N.I.D.E.)`).toBeGreaterThanOrEqual(
        CARD_CLEARANCE - 0.5,
      )
      expect(card.overflow, 'card overflows the viewport').toBe(false)

      await page.goto(`/praxis/${praxisId}`)
      await page.waitForLoadState('networkidle')
      await page.evaluate(() => document.fonts.ready.then(() => undefined))
      const rail = await page.evaluate(() => {
        const heading = Array.from(document.querySelectorAll('h2')).find((h) => h.textContent === 'Score')!
        const crown = document.querySelector('[style*="top: -13px"]')!
        return {
          gap: crown.getBoundingClientRect().top - heading.getBoundingClientRect().bottom,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        }
      })
      expect(rail.gap, 'rail: Score heading to crown').toBeGreaterThanOrEqual(RAIL_CLEARANCE)
      expect(rail.overflow, 'rail overflows the viewport').toBe(false)
      await context.close()

      const slipContext = await browser.newContext({ viewport: size, hasTouch: touch, storageState: draftState })
      const slipPage = await slipContext.newPage()
      await slipPage.goto(`/praxis/${draftId}/edit`)
      await slipPage.waitForLoadState('networkidle')
      await slipPage.evaluate(() => document.fonts.ready.then(() => undefined))
      const slip = await slipPage.evaluate(() => {
        const link = Array.from(document.querySelectorAll('a')).find(
          (a) => a.getAttribute('href')?.startsWith('/tasks/') && a.closest('div[style*=flex-wrap]'),
        )!
        const slipRow = link.closest('div[style*=flex-wrap]')!
        const stamp = slipRow.lastElementChild!.getBoundingClientRect()
        return {
          fromStatus: stamp.top - slipRow.previousElementSibling!.getBoundingClientRect().bottom,
          fromCopy: stamp.top - slipRow.firstElementChild!.getBoundingClientRect().bottom,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        }
      })
      if (touch) {
        expect(slip.fromCopy, 'slip: copy to stacked stamp').toBeGreaterThanOrEqual(SLIP_STACK_GAP - 0.5)
      } else {
        expect(slip.fromStatus, 'slip: status row to stamp (S.N.I.D.E.)').toBeGreaterThanOrEqual(SLIP_CLEARANCE - 0.5)
      }
      expect(slip.overflow, 'slip overflows the viewport').toBe(false)
      await slipContext.close()
    })
  }
})
