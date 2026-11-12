import { test, expect } from '@playwright/test'

// Run logged OUT — drop the shared auth state from the setup project.
test.use({ storageState: { cookies: [], origins: [] } })

test('marketing home renders for a guest', async ({ page }) => {
  await page.goto('/')
  // Test id, not copy (#2452): the CTA wording is still a placeholder.
  // Only Home.tsx carries it, so it proves Home rendered, not the FieldDesk.
  const cta = page.getByTestId('home-hero-cta')
  await expect(cta).toBeVisible()
  // Guest variant: leads to /start (#1861); signed in it goes to /tasks.
  await cta.click()
  await expect(page).toHaveURL(/\/start$/)
})

test('the dev-login button logs a bot in', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /dev login/i }).click()
  // The seeded dev account (key "1") has a character, so this lands on the
  // FieldDesk (#1676). Assert the session, not destination copy.
  await expect(page.getByTestId('home-hero-cta')).toHaveCount(0)
  // `nav-settings` renders only inside `{user && }`, so it proves a session
  // (#2761; pinned by `navSettingsSlot.test.tsx`).
  const settings = page.getByTestId('nav-settings')
  await expect(settings).toBeVisible()
  await expect(settings).toHaveRole('link')
})
