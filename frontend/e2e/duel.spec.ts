import { test, expect, type Browser, type BrowserContext } from '@playwright/test'

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
 * Duel praxis lifecycle - two real logged-in characters, driven through the UI.
 *
 * THIS FILE DECIDES NOTHING (#2888, finishing #1780). It acquires pages and
 * asserts; what a duel fixture IS lives in `src/utils/duelScenario.ts`, where
 * `tsc --noEmit`, `eslint src` and vitest reach it in a PR. The button-pressing
 * that cannot leave Playwright lives in `duel.helpers.ts`.
 *
 * Unlike the API-driven half of collaboration.spec.ts (which would pass even
 * with every button missing), every DUEL action here goes through a real
 * clicked button: challenge (composer opponent picker), accept (updates feed
 * card), and seal (composer submit -> confirm dialog). Only account + task +
 * solo-draft scaffolding uses the API. See #953/#954.
 *
 * Happy path (steps buttons exist for today -> GREEN, or expose a real bug):
 *   challenge -> accept -> both seal -> settled rail.
 *
 * Dissolve steps (were red until #956 added the controls, now GREEN):
 *   D1 (dissolve an active duel)          -> #956
 *   D2 (opponent withdraws a pending one) -> #956
 * D3 (resolved rail) lives in the isolated duel-zzz-resolved.spec.ts because it
 * needs a destructive global era reset - see that file.
 *
 * Prereqs: backend (seeded dev DB at head) + frontend, via frontend/e2e/run-e2e.sh.
 */

// Serial: these tests mutate one shared dev DB (one-praxis-per-task-per-character,
// duel uniqueness). Parallel workers race on that shared state.
test.describe.configure({ mode: 'serial' })

// Distinct accounts per test - a character that already duelled on the task
// can't be signed up again. `seedDuelChallenge` numbers each login itself.
let duelSeq = 0

/** Two duel-level challengers, a faction-skinned task, and Alice's solo draft. */
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
      // 1. Challenge (UI): the challenger flips to duel mode and picks the
      //    opponent → duel pending.
      const challengerPage = await challenger.ctx.newPage()
      await challengerPage.goto(`/praxis/${challengerPraxisId}/edit`)
      await challengeViaUi(challengerPage, opponent.name)

      // 2. Accept (UI): the opponent accepts on their updates feed → duel
      //    active, and they land on their freshly-created opponent-praxis
      //    composer.
      const opponentPage = await opponent.ctx.newPage()
      await acceptDuelViaUi(opponentPage)

      // 3a. The opponent seals their side (UI).
      await waitForDuelAttached(opponentPage, challenger.name)
      await sealViaUi(opponentPage)

      // 3b. The challenger reloads (their page still shows the pre-accept
      //     state) and seals → both sides submitted → duel settled.
      await challengerPage.goto(`/praxis/${challengerPraxisId}/edit`)
      await waitForDuelAttached(challengerPage, opponent.name)
      await sealViaUi(challengerPage)

      // 4. The duel card (praxisDetail/DuelCard, settled reading): both sides + a
      //    live tally. Backend analogue: test_duel_detail_returns_both_sides_with_tallies.
      //    #1090 replaced the "⚔ Duel vs …" rail headline with the card's own
      //    label, so the anchor is the label rather than the old glyph.
      await challengerPage.goto(`/praxis/${challengerPraxisId}`)
      const main = challengerPage.getByRole('main')
      await expect(main.getByText(/The duel/i).first()).toBeVisible()
      await expect(main.getByText(opponent.name).first()).toBeVisible()
      // The settled tally is deliberately LIVE (floats with the votes until era
      // reset) — this is exactly what D3 asserts should FREEZE once resolved.
      await expect(main.getByText(/floats with the votes/i)).toBeVisible()
    } finally {
      await closeSeed(seed)
    }
  })

  // D1 (#956, GREEN): after accept, EITHER participant can neutrally cancel the
  // ACTIVE duel (→ declined, no forfeit penalty). Backend already allowed it
  // (services/duel.py); #956 added the composer-chip "dissolve duel" control
  // (aria-label "dissolve the duel") reachable while the duel is active. The
  // challenger's in_progress praxis redirects /praxis/{id} → the edit composer, where the chip
  // (and its dissolve button) live.
  test('D1: an active duel can be neutrally dissolved by a participant', async ({ browser }) => {
    const seed = await seedChallenge(browser)
    const { challenger, opponent, challengerPraxisId } = seed
    try {
      const challengerPage = await challenger.ctx.newPage()
      await challengerPage.goto(`/praxis/${challengerPraxisId}/edit`)
      await challengeViaUi(challengerPage, opponent.name)

      const opponentPage = await opponent.ctx.newPage()
      await acceptDuelViaUi(opponentPage) // duel now active

      // Intended: a dissolve/cancel control is reachable to a participant on the
      // active-duel view. None exists today.
      await challengerPage.goto(`/praxis/${challengerPraxisId}`)
      await expect(
        challengerPage.getByRole('main').getByRole('button', { name: /dissolve|call off the duel|cancel the duel/i }),
      ).toBeVisible()
    } finally {
      await closeSeed(seed)
    }
  })

  // D2 (#956, GREEN): the OPPONENT can cancel/withdraw a still-PENDING challenge,
  // not only Decline. #956 added a "Withdraw" button to the opponent's challenge
  // card action row (FeedCardDuelChallenge), hitting the same /duels/{id}/cancel
  // endpoint. Scoped to the challenge card (the Accept button's action row) so an
  // unrelated "cancel" elsewhere on /updates can't satisfy it.
  test('D2: the opponent can withdraw a pending challenge', async ({ browser }) => {
    const seed = await seedChallenge(browser)
    const { challenger, opponent, challengerPraxisId } = seed
    try {
      const challengerPage = await challenger.ctx.newPage()
      await challengerPage.goto(`/praxis/${challengerPraxisId}/edit`)
      await challengeViaUi(challengerPage, opponent.name) // pending — NOT accepted

      const opponentPage = await opponent.ctx.newPage()
      await opponentPage.goto('/updates')
      const accept = opponentPage.getByRole('button', { name: 'Accept Duel' })
      await expect(accept).toBeVisible()

      // The challenge card's action row today holds only Accept + Decline.
      const actionRow = accept.locator('..')
      await expect(actionRow.getByRole('button', { name: /withdraw|cancel/i })).toBeVisible()
    } finally {
      await closeSeed(seed)
    }
  })
})
