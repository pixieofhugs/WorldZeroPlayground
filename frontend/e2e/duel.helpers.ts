import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

import type { Scenario } from '../src/utils/e2eScenario'

/**
 * Duel UI actions, each through a real clicked button (#953); only account,
 * task and solo-draft scaffolding use the API. Fixture logic lives in
 * `src/utils/duelScenario.ts` / `e2eScenario.ts`. Kept in `e2e/` so
 * `e2eAnchors.test.ts` sees its `getByTestId`s.
 *
 * Prereqs: backend (seeded dev DB at head) + frontend, via frontend/e2e/run-e2e.sh.
 */

const API = process.env.E2E_API_URL ?? 'http://localhost:8000'

// Fresh accounts per run: a character holding a praxis on a task can't duel on it again.
export const RUN = Date.now().toString(36)

export const scenarioFor = (browser: Browser): Scenario<BrowserContext> => ({
  browser,
  api: API,
  run: RUN,
})

/**
 * Issue a challenge from the challenger's /praxis/:id/edit. Picking the
 * opponent from the dropdown is what sends it (controls.tsx onPick).
 */
export async function challengeViaUi(page: Page, opponentName: string): Promise<void> {
  // Shared `editPraxis.composer.modeDuel` key (#1676); renders at level ≥ 2.
  const duelChip = page.getByRole('button', { name: 'Duel', exact: true })
  await expect(duelChip).toBeVisible()
  await duelChip.click()
  await expect(duelChip).toHaveAttribute('aria-pressed', 'true')

  // By slot (#2453): one box serves collab and duel. Open from the start in duel mode.
  const search = page.getByTestId('composer-invite-search')
  await search.fill(opponentName)

  const option = page.getByRole('listbox').getByText(opponentName, { exact: false })
  await option.click()

  // Attached: the search is replaced by the facing pair (#1417). Anchor on the
  // name, never the badge copy.
  await expect(pair(page)).toBeVisible()
  await expect(pair(page).getByText(opponentName)).toBeVisible()
}

/** The composer's attached-duel block — proof `praxis.duel_id` is set. */
function pair(page: Page) {
  return page.getByTestId('composer-duel-pair')
}

/** Accept from /updates (the only place it lives); lands on the opponent's new composer. */
export async function acceptDuelViaUi(page: Page): Promise<void> {
  await page.goto('/updates')
  const accept = page.getByRole('button', { name: 'Accept Duel' })
  await expect(accept).toBeVisible()
  await accept.click()
  await page.waitForURL(/\/praxis\/\d+\/edit/)
}

/**
 * Wait for `state.duel` to load, else the seal button publishes as plain solo.
 * Scoped to the pair: the name appears elsewhere on the composer.
 */
export async function waitForDuelAttached(page: Page, opponentName: string): Promise<void> {
  await expect(pair(page).getByText(opponentName)).toBeVisible()
}

/**
 * Seal a side: with a duel attached the primary opens the seal sheet
 * (controls.tsx sealsADuel). By slot, not label (#2453): these labels have
 * been reworded repeatedly.
 */
export async function sealViaUi(page: Page, title = `Duel entry ${RUN}`): Promise<void> {
  // Title first: `accept_duel` mints an untitled praxis and publish() refuses it
  // client-side, after closing the sheet, so `toBeHidden()` alone is a false green (#2453).
  await page.getByTestId('praxis-title').fill(title)

  await page.getByTestId('composer-primary').click()
  const sheet = page.getByTestId('duel-seal-sheet')
  await expect(sheet).toBeVisible()
  await sheet.getByTestId('duel-seal-confirm').click()
  await expect(sheet).toBeHidden()

  // Proof it landed: a submitted praxis has no editor (waiting surface, ADR-0059,
  // or read page); a refusal leaves the composer.
  await expect(page.locator('.cm-content')).toHaveCount(0)
}
