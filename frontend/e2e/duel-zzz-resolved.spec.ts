import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'
import { seedDuelChallenge } from '../src/utils/duelScenario'
import {
  RUN,
  scenarioFor,
  challengeViaUi,
  acceptDuelViaUi,
  waitForDuelAttached,
  sealViaUi,
} from './duel.helpers'

/**
 * D3 — a RESOLVED duel's rail shows the FROZEN final points + winner, not a live
 * vote tally. The rendering half of that shipped (#957, #1090); what is still
 * missing is a way to DRIVE a duel to `resolved` from this harness — see HAZARD 2.
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
 * │ HAZARD 2 — THE ERA RESET IS A SCRIPT, NOT A ROUTE. There is NO HTTP call  │
 * │ to make here. `PUT /admin/era/reset` was deleted in #1667 and is pinned    │
 * │ deleted by backend/tests/test_deleted_routes_stay_deleted.py; the only     │
 * │ entry point is `backend/scripts/era_reset.py <admin-username> --yes`. So   │
 * │ this is not an "add admin auth" problem, and re-adding the route is the    │
 * │ one fix that is out of bounds — the deleted-routes guard exists so that    │
 * │ argument gets ANSWERED rather than quietly reverted.                       │
 * │                                                                            │
 * │ The seam that does exist: shell out to that script (resetEraViaScript      │
 * │ below). It needs the ISOLATED runner — `bash frontend/e2e/run-e2e.sh`,     │
 * │ which seeds admin @pixie and exports DATABASE_URL=…/worldzero_e2e — so the │
 * │ helper refuses any other database rather than roll over the dev one. An    │
 * │ ad-hoc `npm run e2e` against :8000 has nothing safe to reset.               │
 * │                                                                            │
 * │ Why still test.fixme() and not test.fail(): the shell-out below has never  │
 * │ been run green, and on the ad-hoc flow it cannot run at all. To finish     │
 * │ this: run the spec under run-e2e.sh, confirm the rollover drives the duel  │
 * │ to `resolved`, then delete the test.fixme(). If you would rather have a    │
 * │ dev-only HTTP seam than a subprocess (what #957 was originally asked for), │
 * │ that is a NEW route and owes the deleted-routes guard an argument first.   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Everything up to the reset (challenge → accept → both seal → settled) is
 * reachable and shared with duel.spec.ts, so the body is written in full.
 */

/** backend/, from frontend/e2e/ — the script's cwd (it imports backend modules). */
const BACKEND_DIR = fileURLToPath(new URL('../../backend', import.meta.url))

/**
 * Close the era from the shell — the rollover's only entry point since #1667.
 *
 * Guarded on the isolated e2e database, matching scripts/reset_e2e_db.py's own
 * rule: this is the most destructive operation in the system and there is no
 * undo. run-e2e.sh exports both env vars read here; pydantic-settings lets that
 * exported DATABASE_URL win over backend/.env, so the script hits the same DB
 * the backend under test does.
 */
function resetEraViaScript(): void {
  const db = process.env.DATABASE_URL ?? ''
  expect(
    /_e2e(\?|$)/.test(db),
    `refusing the era reset: DATABASE_URL is not the isolated e2e database (${db || 'unset'}). ` +
      'Run this spec via `bash frontend/e2e/run-e2e.sh` — see HAZARD 2.',
  ).toBeTruthy()
  // @pixie is the admin seed.py bootstraps; era_reset.py refuses a non-admin
  // because Era.started_by records who opened the era.
  execFileSync(process.env.E2E_PYTHON ?? 'python', ['scripts/era_reset.py', 'pixie', '--yes'], {
    cwd: BACKEND_DIR,
    stdio: 'inherit',
  })
}

test.describe.configure({ mode: 'serial' })

test.describe('duel resolved rail (isolated — triggers a destructive era reset)', () => {
  // See HAZARD 2. Skipped until the era-reset shell-out has been run green.
  test.fixme(
    'D3: a resolved duel freezes its points + declares a winner (needs the era-reset script run under run-e2e.sh)',
    async ({ browser }) => {
      // Its own role codes ('ra'/'rb'): this spec runs in its own Playwright
      // worker, so its run id and login sequence are its own, and the role code
      // is what keeps its fixtures apart from duel.spec.ts's if the two run ids
      // ever agree. Same flow as the happy path, up to the reset.
      const seed = await seedDuelChallenge(scenarioFor(browser), ['ra', 'rb'], `Duel resolved ${RUN}`)
      const { challenger: alice, opponent: bob, challengerPraxisId: alicePraxisId } = seed
      try {
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
        // (winner + frozen outcome, ADR-0052). Runs the script, not a route — see
        // HAZARD 2. Throws (failing the test) if the script exits non-zero.
        resetEraViaScript()

        // The resolved duel card must show the FROZEN result, not the live "floats
        // with the votes" tally the settled reading renders. `DuelCard` (#1090)
        // has an explicit `resolved` reading, so this is a live contract now — it
        // stays fixme only because the reset above has never been run green here.
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
