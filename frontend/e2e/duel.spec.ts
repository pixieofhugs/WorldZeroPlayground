import { test, expect, type Browser } from '@playwright/test'
import {
  DUEL_LEVEL,
  RUN,
  login,
  pickDuelTask,
  createSoloDraft,
  challengeViaUi,
  acceptDuelViaUi,
  waitForDuelAttached,
  sealViaUi,
  type Player,
} from './duel.helpers'

/**
 * Duel praxis lifecycle — two real logged-in characters, driven through the UI.
 *
 * Unlike collaboration.spec.ts (which drives the lifecycle through the API and
 * would therefore pass even with every button missing), every DUEL action here
 * goes through a real clicked button: challenge (composer opponent picker),
 * accept (updates feed card), and seal (composer submit → confirm dialog). Only
 * account + task + solo-draft scaffolding uses the API. See #953/#954.
 *
 * Happy path (steps buttons exist for today → GREEN, or expose a real bug):
 *   challenge → accept → both seal → settled rail.
 *
 * Dissolve steps (were red until #956 added the controls, now GREEN):
 *   D1 (dissolve an active duel)          → #956
 *   D2 (opponent withdraws a pending one) → #956
 * D3 (resolved rail) lives in the isolated duel-zzz-resolved.spec.ts because it
 * needs a destructive global era reset — see that file.
 *
 * Prereqs: backend (seeded dev DB at head) + frontend, via frontend/e2e/run-e2e.sh.
 */

// Serial: these tests mutate one shared dev DB (one-praxis-per-task-per-character,
// duel uniqueness). Parallel workers race on that shared state.
test.describe.configure({ mode: 'serial' })

// Distinct accounts per test so no character is reused across tests (a character
// that already duelled on the task can't be signed up again).
let pairSeq = 0

/** Two level-2 challengers in fresh contexts, on one fresh faction task + Alice's draft. */
async function seedChallenge(browser: Browser) {
  const s = pairSeq++
  const alice = await login(browser, `da-${RUN}-${s}`, `A${s}-${RUN}`, DUEL_LEVEL)
  const bob = await login(browser, `db-${RUN}-${s}`, `B${s}-${RUN}`, DUEL_LEVEL)
  const task = await pickDuelTask(alice)
  const alicePraxisId = await createSoloDraft(alice, task.id, `Duel ${RUN}-${s}`)
  return { alice, bob, task, alicePraxisId }
}

async function closeSeed(seed: { alice: Player; bob: Player }) {
  await seed.alice.ctx.close()
  await seed.bob.ctx.close()
}

test.describe('duel lifecycle', () => {
  test('challenge → accept → both seal → the settled rail shows both sides', async ({ browser }) => {
    const seed = await seedChallenge(browser)
    const { alice, bob, alicePraxisId } = seed
    try {
      // 1. Challenge (UI): Alice flips to duel mode and picks Bob → duel pending.
      const alicePage = await alice.ctx.newPage()
      await alicePage.goto(`/praxis/${alicePraxisId}/edit`)
      await challengeViaUi(alicePage, bob.name)

      // 2. Accept (UI): Bob accepts on his updates feed → duel active, and Bob
      //    lands on his freshly-created opponent-praxis composer.
      const bobPage = await bob.ctx.newPage()
      await acceptDuelViaUi(bobPage)

      // 3a. Bob seals his side (UI).
      await waitForDuelAttached(bobPage, alice.name)
      await sealViaUi(bobPage)

      // 3b. Alice reloads (her page still shows the pre-accept state) and seals →
      //     both sides submitted → duel settled.
      await alicePage.goto(`/praxis/${alicePraxisId}/edit`)
      await waitForDuelAttached(alicePage, bob.name)
      await sealViaUi(alicePage)

      // 4. The duel card (praxisDetail/DuelCard, settled reading): both sides + a
      //    live tally. Backend analogue: test_duel_detail_returns_both_sides_with_tallies.
      //    #1090 replaced the "⚔ Duel vs …" rail headline with the card's own
      //    label, so the anchor is the label rather than the old glyph.
      await alicePage.goto(`/praxis/${alicePraxisId}`)
      const main = alicePage.getByRole('main')
      await expect(main.getByText(/The duel/i).first()).toBeVisible()
      await expect(main.getByText(bob.name).first()).toBeVisible()
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
  // (aria-label "dissolve the duel") reachable while the duel is active. Alice's
  // in_progress praxis redirects /praxis/{id} → the edit composer, where the chip
  // (and its dissolve button) live.
  test('D1: an active duel can be neutrally dissolved by a participant', async ({ browser }) => {
    const seed = await seedChallenge(browser)
    const { alice, bob, alicePraxisId } = seed
    try {
      const alicePage = await alice.ctx.newPage()
      await alicePage.goto(`/praxis/${alicePraxisId}/edit`)
      await challengeViaUi(alicePage, bob.name)

      const bobPage = await bob.ctx.newPage()
      await acceptDuelViaUi(bobPage) // duel now active

      // Intended: a dissolve/cancel control is reachable to a participant on the
      // active-duel view. None exists today.
      await alicePage.goto(`/praxis/${alicePraxisId}`)
      await expect(
        alicePage.getByRole('main').getByRole('button', { name: /dissolve|call off the duel|cancel the duel/i }),
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
    const { alice, bob, alicePraxisId } = seed
    try {
      const alicePage = await alice.ctx.newPage()
      await alicePage.goto(`/praxis/${alicePraxisId}/edit`)
      await challengeViaUi(alicePage, bob.name) // pending — NOT accepted

      const bobPage = await bob.ctx.newPage()
      await bobPage.goto('/updates')
      const accept = bobPage.getByRole('button', { name: 'Accept Duel' })
      await expect(accept).toBeVisible()

      // The challenge card's action row today holds only Accept + Decline.
      const actionRow = accept.locator('..')
      await expect(actionRow.getByRole('button', { name: /withdraw|cancel/i })).toBeVisible()
    } finally {
      await closeSeed(seed)
    }
  })
})
