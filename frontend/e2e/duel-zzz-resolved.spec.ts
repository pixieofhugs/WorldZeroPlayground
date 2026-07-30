import { test, expect } from '@playwright/test'
import {
  API,
  DUEL_LEVEL,
  RUN,
  login,
  pickUaDuelTask,
  createSoloDraft,
  challengeViaUi,
  acceptDuelViaUi,
  waitForDuelAttached,
  sealViaUi,
} from './duel.helpers'

/**
 * D3 — a RESOLVED duel's rail shows the FROZEN final points + winner, not a live
 * vote tally (fix issue #957).
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ HAZARD 1 — GLOBAL DESTRUCTIVE ERA RESET. Ordered LAST on purpose.         │
 * │ The only way a duel reaches `resolved` is apply_era_reset (ADR-0052), i.e.│
 * │ closing the era — which resets EVERY character's score + level across the  │
 * │ whole shared e2e DB. The filename sorts after duel.spec.ts / collaboration │
 * │ .spec.ts (Playwright runs files alphabetically), so nothing that asserts   │
 * │ scores runs after this. Do NOT add score/level assertions to a file that   │
 * │ sorts after "duel-zzz-".                                                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ HAZARD 2 — THE ERA RESET IS NOT REACHABLE FROM THIS HARNESS (yet).         │
 * │ PUT /admin/era/reset is guarded by require_admin (dependencies.py). Admin  │
 * │ is granted ONLY to the seeded Pixie *google* account (backend/seed.py);    │
 * │ dev-login always mints a NON-admin `dev-*@localhost` account and offers no  │
 * │ admin/level/faction seam for the admin role, and there is no HTTP path for │
 * │ a dev-login account to acquire it (role grants are admin-gated + direct-DB  │
 * │ only). So a Playwright-authenticated player CANNOT trigger the reset, and   │
 * │ the duel cannot be driven to `resolved` from here today.                    │
 * │                                                                            │
 * │ Consequence: this test is test.fixme() (skipped), NOT test.fail(). A       │
 * │ test.fail() would "pass" today for the WRONG reason (a 403 on the reset,    │
 * │ unrelated to the rail bug) and would NOT flip green when #957 lands, which  │
 * │ breaks the red→green contract. #957 (the resolved path) needs a dev-only    │
 * │ admin seam to make `resolved` reachable from the harness; once that exists, │
 * │ delete `test.fixme()` and the era-reset guard below, and this becomes the   │
 * │ real red baseline #957 turns green.                                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Everything up to the reset (challenge → accept → both seal → settled) is
 * reachable and shared with duel.spec.ts, so the body is written in full and
 * ready to run the moment an admin seam lands.
 */

test.describe.configure({ mode: 'serial' })

test.describe('duel resolved rail (isolated — triggers a destructive era reset)', () => {
  // See HAZARD 2. Skipped until an admin seam makes the era reset reachable.
  test.fixme(
    'D3: a resolved duel freezes its points + declares a winner (needs admin era-reset seam — #957)',
    async ({ browser }) => {
      const alice = await login(browser, `ra-${RUN}`, `RA-${RUN}`, DUEL_LEVEL)
      const bob = await login(browser, `rb-${RUN}`, `RB-${RUN}`, DUEL_LEVEL)
      try {
        // Reach `settled` through the UI (same flow as the happy path).
        const task = await pickUaDuelTask(alice)
        const alicePraxisId = await createSoloDraft(alice, task.id, `Duel resolved ${RUN}`)

        const alicePage = await alice.ctx.newPage()
        await alicePage.goto(`/praxis/${alicePraxisId}/edit`)
        await challengeViaUi(alicePage, bob.name)

        const bobPage = await bob.ctx.newPage()
        await acceptDuelViaUi(bobPage)
        await waitForDuelAttached(bobPage, alice.name)
        await sealViaUi(bobPage)

        await alicePage.goto(`/praxis/${alicePraxisId}/edit`)
        await waitForDuelAttached(alicePage, bob.name)
        await sealViaUi(alicePage) // → settled

        // Close the era → apply_era_reset freezes the settled duel into `resolved`
        // (winner + frozen outcome, ADR-0052). GUARD: this needs an admin account
        // the harness cannot currently obtain — see HAZARD 2. Left as the literal
        // intended call so the fix author only has to supply admin auth.
        const reset = await alice.ctx.request.put(`${API}/admin/era/reset`)
        expect(
          reset.ok(),
          'era reset needs admin — see HAZARD 2 in this file; #957 must add a dev admin seam',
        ).toBeTruthy()

        // The resolved duel card must show the FROZEN result, not the live "floats
        // with the votes" tally the settled reading renders. `DuelCard` (#1090)
        // has an explicit `resolved` reading, so this is a live contract now — it
        // stays fixme only because the era reset above needs admin auth.
        await alicePage.goto(`/praxis/${alicePraxisId}`)
        const main = alicePage.getByRole('main')
        await expect(main.getByText(/floats with the votes/i)).toBeHidden()
        await expect(main.getByText(/winner|won|final/i)).toBeVisible()
      } finally {
        await alice.ctx.close()
        await bob.ctx.close()
      }
    },
  )
})
