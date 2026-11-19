import { test, expect } from '@playwright/test'

// Run logged OUT — drop the shared auth state from the setup project.
test.use({ storageState: { cookies: [], origins: [] } })

test('a guest at / and at /start meets the welcome flow', async ({ page }) => {
  for (const path of ['/', '/start']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: /welcome, player/i })).toBeVisible()
    await expect(page.getByTestId('nav-settings')).toHaveCount(0)
  }
})
