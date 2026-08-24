import { test, expect } from '@playwright/test'

// Run logged OUT — drop the shared auth state from the setup project.
test.use({ storageState: { cookies: [], origins: [] } })

test('marketing home renders for a guest', async ({ page }) => {
  await page.goto('/')
  // Anchored on the hero CTA's test id, never on its copy. This used to read
  // /sign up here/i, which was home.json `hero.cta.loggedOut` ("Sign Up Here")
  // until #1862 deleted the key outright and #1899 re-added it pointing at the
  // onboarding arc, with the literal placeholder string it still carries. The
  // slot is awaiting final wording, so a text anchor here is a third regression
  // already scheduled (#2452).
  //
  // `data-testid="home-hero-cta"` is on Home.tsx and nowhere else, and
  // `pages/__tests__/homeLoginNotice.test.tsx` already pins it, so its presence
  // is proof the marketing Home rendered rather than the FieldDesk.
  const cta = page.getByTestId('home-hero-cta')
  await expect(cta).toBeVisible()
  // ...and that it is the GUEST variant. One CTA renders either way, but signed
  // out it leads into the arc at /start (#1861) and signed in it goes to
  // /tasks. Behaviour, not wording: a route is a contract, copy is not.
  await cta.click()
  await expect(page).toHaveURL(/\/start$/)
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
  //
  // The marketing hero is gone by its test id for the same reason: this line
  // named /sign up here/i too, and had been passing vacuously against copy that
  // no longer existed anywhere in the app.
  await expect(page.getByTestId('home-hero-cta')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /logout/i })).toBeVisible()
})
