import { test, expect } from '@playwright/test'

// These run authenticated via the saved bot-login state (see playwright.config.ts).

test('authed root shows the FieldDesk, not the marketing Home', async ({ page }) => {
  await page.goto('/')
  // NOT the <h1>, and NOT "Whose shoes today?" (#1676). #1560 gates the roster
  // behind `rosterOffersAChoice`, and the seeded bot carries one life below the
  // second-character level, so the gate is shut and that string never renders.
  // #1794/#1815 then moved the <h1> outside the gate but made its text
  // data-dependent — it reads the character's own name — so it is not an anchor
  // either. This <h2> (home.json `signedIn.browse.headings.tasks`) is what
  // #1560's own unit test anchors on for "the gate hides the roster, not the
  // page", and it is proof the FieldDesk rendered rather than the marketing Home.
  await expect(page.getByRole('heading', { name: /tasks you can sign up for/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /sign up here/i })).toHaveCount(0)
})

test('leaderboard loads', async ({ page }) => {
  await page.goto('/leaderboard')
  await expect(page.getByRole('heading', { name: /players/i })).toBeVisible()
})

test('tasks list loads', async ({ page }) => {
  await page.goto('/tasks')
  await expect(page.getByRole('heading', { name: /^tasks$/i })).toBeVisible()
})

test('factions page loads', async ({ page }) => {
  await page.goto('/factions')
  await expect(page.getByRole('heading', { name: /^factions$/i })).toBeVisible()
})

test('no uncaught console errors on the leaderboard', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/leaderboard')
  await expect(page.getByRole('heading', { name: /players/i })).toBeVisible()
  expect(errors, errors.join('\n')).toHaveLength(0)
})
