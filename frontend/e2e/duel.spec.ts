import { test, expect, type Browser, type BrowserContext } from '@playwright/test'

import feed from '../src/locales/en/feed.json' with { type: 'json' }
import forms from '../src/locales/en/forms.json' with { type: 'json' }
import { seedDuelChallenge, type DuelChallenge } from '../src/utils/duelScenario'
import {
  RUN,
  scenarioFor,
  challengeViaUi,
  acceptDuelViaUi,
  waitForDuelAttached,
  sealViaUi,
} from './duel.helpers'

/**
 * Duel praxis lifecycle, every duel action through a real button (#953).
 * Fixture logic: `src/utils/duelScenario.ts`; clicks: `duel.helpers.ts`.
 * D3 (resolved rail) is in zzz-duel-resolved.spec.ts: it needs a global era reset.
 *
 * Prereqs: backend (seeded dev DB at head) + frontend, via frontend/e2e/run-e2e.sh.
 */

// Serial: shared dev DB (one praxis per task per character, duel uniqueness).
test.describe.configure({ mode: 'serial' })

// A character that already duelled on the task can't sign up again.
let duelSeq = 0

async function seedChallenge(browser: Browser): Promise<DuelChallenge<BrowserContext>> {
  return seedDuelChallenge(scenarioFor(browser), ['da', 'db'], `Duel ${RUN}-${duelSeq++}`)
}

async function closeSeed(seed: DuelChallenge<BrowserContext>): Promise<void> {
  await seed.challenger.ctx.close()
  await seed.opponent.ctx.close()
}

test.describe('duel lifecycle', () => {
  test('challenge → accept → both seal → the settled rail shows both sides', async ({ browser }) => {
    const seed = await seedChallenge(browser)
    const { challenger, opponent, challengerPraxisId } = seed
    try {
      const challengerPage = await challenger.ctx.newPage()
      await challengerPage.goto(`/praxis/${challengerPraxisId}/edit`)
      await challengeViaUi(challengerPage, opponent.name)

      const opponentPage = await opponent.ctx.newPage()
      await acceptDuelViaUi(opponentPage)

      await waitForDuelAttached(opponentPage, challenger.name)
      await sealViaUi(opponentPage)

      // Reload: the challenger's page still shows the pre-accept state.
      await challengerPage.goto(`/praxis/${challengerPraxisId}/edit`)
      await waitForDuelAttached(challengerPage, opponent.name)
      await sealViaUi(challengerPage)

      await challengerPage.goto(`/praxis/${challengerPraxisId}`)
      const main = challengerPage.getByRole('main')
      await expect(main.getByText(/The duel/i).first()).toBeVisible()
      await expect(main.getByText(opponent.name).first()).toBeVisible()
      // Settled tally is live until era reset; D3 asserts it freezes.
      await expect(main.getByText(/floats with the votes/i)).toBeVisible()
    } finally {
      await closeSeed(seed)
    }
  })

  // D1 (#956): either participant can dissolve an active duel (no forfeit).
  // /praxis/{id} redirects an in_progress praxis to the composer, where the control lives.
  test('D1: an active duel can be neutrally dissolved by a participant', async ({ browser }) => {
    const seed = await seedChallenge(browser)
    const { challenger, opponent, challengerPraxisId } = seed
    try {
      const challengerPage = await challenger.ctx.newPage()
      await challengerPage.goto(`/praxis/${challengerPraxisId}/edit`)
      await challengeViaUi(challengerPage, opponent.name)

      const opponentPage = await opponent.ctx.newPage()
      await acceptDuelViaUi(opponentPage)

      await challengerPage.goto(`/praxis/${challengerPraxisId}`)
      await challengerPage
        .getByRole('main')
        .getByRole('button', { name: forms.editPraxis.invite.dissolveDuelAria })
        .click()
      await challengerPage.getByTestId('confirm-accept').click()
      await expect(challengerPage.getByTestId('composer-duel-pair')).toBeHidden()
    } finally {
      await closeSeed(seed)
    }
  })

  // D2 (#956): scoped to the challenge card's action row so an unrelated
  // "cancel" on /updates can't satisfy it.
  test('D2: the opponent can withdraw a pending challenge', async ({ browser }) => {
    const seed = await seedChallenge(browser)
    const { challenger, opponent, challengerPraxisId } = seed
    try {
      const challengerPage = await challenger.ctx.newPage()
      await challengerPage.goto(`/praxis/${challengerPraxisId}/edit`)
      await challengeViaUi(challengerPage, opponent.name) // pending, not accepted

      const opponentPage = await opponent.ctx.newPage()
      await opponentPage.goto('/updates')
      const accept = opponentPage.getByRole('button', { name: 'Accept Duel' })
      await expect(accept).toBeVisible()

      const actionRow = accept.locator('..')
      await actionRow.getByRole('button', { name: feed.duelChallenge.withdraw }).click()
      await expect(opponentPage.getByText(feed.duelChallenge.withdrawn)).toBeVisible()
    } finally {
      await closeSeed(seed)
    }
  })
})
