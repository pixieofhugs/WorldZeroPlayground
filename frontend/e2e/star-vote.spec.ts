import { test, expect, type BrowserContext, type Page } from '@playwright/test'

import type { components } from '../src/api/generated/schema'
import { createPraxis, fetchTasks, loginPlayer, submitPraxis, type Player } from '../src/utils/e2eScenario'
import { MULTI_INVITE_LEVEL, selectDistinctTasks } from '../src/utils/collabScenario'
import { scenarioFor } from './duel.helpers'

type VoteCastOut = components['schemas']['VoteCastOut']

// The UI never prints the budget: read it from the page's own vote response, relative, so no era value is hardcoded.
const AUTHOR_LEVEL = MULTI_INVITE_LEVEL
const VOTER_LEVEL = 1

test.describe.configure({ mode: 'serial', retries: 0 })

test.describe('star vote', () => {
  let author: Player<BrowserContext>
  let voter: Player<BrowserContext>
  let praxes: { id: number; title: string }[]

  test.beforeAll(async ({ browser }) => {
    author = await loginPlayer(scenarioFor(browser), 'va', AUTHOR_LEVEL)
    voter = await loginPlayer(scenarioFor(browser), 'vb', VOTER_LEVEL)
    const tasks = selectDistinctTasks(await fetchTasks(author), 2)
    praxes = []
    for (const [index, task] of tasks.entries()) {
      const title = `Vote ${index} ${author.name}`
      const praxis = await createPraxis(author, {
        task_id: task.id,
        type: 'solo',
        title,
        body_text: 'rate me',
      })
      await submitPraxis(author, praxis.id)
      praxes.push({ id: praxis.id, title })
    }
  })

  test.afterAll(async () => {
    await author.ctx.close()
    await voter.ctx.close()
  })

  async function rate(page: Page, praxis: { id: number; title: string }, stars: number) {
    await page.goto(`/praxis/${praxis.id}`)
    await expect(page.getByRole('heading', { name: praxis.title })).toBeVisible()
    const cast = page.waitForResponse(
      (res) => res.request().method() === 'POST' && res.url().endsWith(`/praxes/${praxis.id}/vote`),
    )
    const star = page.getByRole('button', { name: new RegExp(`^Rate ${stars}\\b`) })
    await star.click()
    const response = await cast
    expect(response.ok()).toBe(true)
    await expect(star).toHaveAttribute('aria-pressed', 'true')
    return (await response.json()) as VoteCastOut
  }

  test('a new vote spends one from the budget; a re-rate is free', async () => {
    const page = await voter.ctx.newPage()

    const first = await rate(page, praxes[0], 4)
    expect(first.viewer_vote).toBe(4)

    const second = await rate(page, praxes[1], 3)
    expect(second.viewer_stats.votes_available).toBe(first.viewer_stats.votes_available - 1)

    const rerate = await rate(page, praxes[0], 5)
    expect(rerate.viewer_vote).toBe(5)
    expect(rerate.viewer_stats.votes_available).toBe(second.viewer_stats.votes_available)
  })

  test("the author's own praxis shows no vote control", async () => {
    const page = await author.ctx.newPage()
    await page.goto(`/praxis/${praxes[0].id}`)
    await expect(page.getByRole('heading', { name: praxes[0].title })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Rate \d/ })).toHaveCount(0)
  })
})
