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
  // The button logs into the ONE dev account — `dev_login`'s `key` defaults to
  // "1", i.e. provider_user_id "dev-user-1" — and `seed.py`'s `seed_dev_demo`
  // gives that account a character ("Molly"). That was #464's fix for an earlier
  // red nightly, so the old comment here ("this bot has no character") has been
  // false since. It lands on the FieldDesk, not character creation (#1676).
  //
  // Assert being logged in, which is what this test's name actually claims. A
  // destination heading re-breaks every time the FieldDesk's copy moves, which
  // is how its sibling in smoke.spec.ts broke.
  await expect(page.getByRole('button', { name: /sign up here/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /logout/i })).toBeVisible()
})
