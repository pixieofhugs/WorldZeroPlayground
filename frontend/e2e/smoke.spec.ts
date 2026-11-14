import { test, expect } from '@playwright/test'

// Authenticated via the saved bot-login state.

test('authed root shows the FieldDesk, not the marketing Home', async ({ page }) => {
  await page.goto('/')
  // Not the <h1> (shows the character's name) nor the roster heading (gated
  // shut for the bot, #1676); this <h2> always renders on the FieldDesk.
  await expect(page.getByRole('heading', { name: /tasks you can sign up for/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /sign up here/i })).toHaveCount(0)
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
