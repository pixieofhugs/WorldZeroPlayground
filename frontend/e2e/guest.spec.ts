import { test, expect } from '@playwright/test'

// Run logged OUT — drop the shared auth state from the setup project.
test.use({ storageState: { cookies: [], origins: [] } })

test('marketing home renders for a guest', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: /sign up here/i })).toBeVisible()
})

test('the dev-login button logs a bot in', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /dev login/i }).click()
  // This bot has no character (clicked the real button, not the seeded fixture),
  // so it correctly redirects to character creation rather than the FieldDesk.
  await expect(page.getByRole('button', { name: /sign up here/i })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /who are you becoming/i })).toBeVisible()
})
