import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'
import praxisCopy from '../src/locales/en/praxis.json' with { type: 'json' }
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
 * D3: a resolved duel shows frozen final points + winner, not a live tally.
 *
 * HAZARD 1: GLOBAL DESTRUCTIVE ERA RESET. Only apply_era_reset (ADR-0052)
 * resolves a duel, resetting every score in the shared e2e DB. "zzz" sorts this
 * file last ("duel-zzz-" sorted before "duel.spec.ts": "-" < "."). Never add
 * score/level assertions to a file sorting after "zzz-".
 *
 * HAZARD 2: THE ERA RESET IS A SCRIPT, NOT A ROUTE. `PUT /admin/era/reset` was
 * deleted (#1667) and is pinned by test_deleted_routes_stay_deleted.py; don't
 * re-add it. We shell out to `backend/scripts/era_reset.py`, which needs the
 * isolated runner (`bash frontend/e2e/run-e2e.sh`, DATABASE_URL=…/worldzero_e2e).
 */

const BACKEND_DIR = fileURLToPath(new URL('../../backend', import.meta.url))

/** Refuses any DB but the isolated e2e one: no undo. */
function resetEraViaScript(): void {
  const db = process.env.DATABASE_URL ?? ''
  expect(
    /_e2e(\?|$)/.test(db),
    `refusing the era reset: DATABASE_URL is not the isolated e2e database (${db || 'unset'}). ` +
      'Run this spec via `bash frontend/e2e/run-e2e.sh` — see HAZARD 2.',
  ).toBeTruthy()
  // era_reset.py requires an admin (Era.started_by); seed.py makes @pixie one.
  execFileSync(process.env.E2E_PYTHON ?? 'python', ['scripts/era_reset.py', 'pixie', '--yes'], {
    cwd: BACKEND_DIR,
    stdio: 'inherit',
  })
}

test.describe.configure({ mode: 'serial' })

test.describe('duel resolved rail (isolated — triggers a destructive era reset)', () => {
  test(
    'D3: a resolved duel freezes its points + declares a winner (needs the era-reset script run under run-e2e.sh)',
    async ({ browser }) => {
      // Own role codes keep fixtures apart from duel.spec.ts if run ids collide.
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

        resetEraViaScript()

        await alicePage.goto(`/praxis/${alicePraxisId}`)
        const main = alicePage.getByRole('main')
        await expect(main.getByText(/floats with the votes/i)).toBeHidden()
        await expect(main.getByText(praxisCopy.duelCrossLink.final.replace('{{standing}} · ', ''))).toBeVisible()
      } finally {
        await alice.ctx.close()
        await bob.ctx.close()
      }
    },
  )
})
