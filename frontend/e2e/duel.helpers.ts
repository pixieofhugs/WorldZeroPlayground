import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

import type { Scenario } from '../src/utils/e2eScenario'

/**
 * The duel specs' UI ACTIONS — every duel move, through a real clicked button.
 *
 * THIS FILE DECIDES NOTHING (#2888, finishing #1780 — Molly's ruling of
 * 2026-08-18: *"move `e2e/`'s logic into plain modules under the app's build
 * graph, keep the spec as a thin Playwright driver"*). What a duel fixture IS
 * — which task drives a real faction skin, what level each side needs, what a
 * seeded challenge consists of — now lives in `src/utils/duelScenario.ts` and
 * `src/utils/e2eScenario.ts`, under the app's own build graph, where
 * `tsc --noEmit`, `eslint src` and vitest reach it in a PR rather than a
 * browser reaching it at 3am. Read those two before changing anything here.
 *
 * What is left is acquisition: pressing buttons and waiting for the page. It
 * stays here because it cannot move — it needs `Page` and `expect` — and
 * because `src/__tests__/e2eAnchors.test.ts` derives the guarded slot list from
 * `frontend/e2e/` itself, so a `getByTestId` that left this directory would
 * leave that guard's sight.
 *
 * Split point (#953): only ACCOUNT + TASK + solo-draft scaffolding uses the
 * API. Every DUEL action — challenge, accept, seal — goes through a real
 * clicked button below, so a missing or unreachable control fails the test
 * instead of passing silently.
 *
 * Why a faction-skinned task is picked at all is documented on
 * `selectDuelTask`; the seeder that creates that task is
 * `seed.py::ensure_duel_fixture_task`. This suite steers around no faction's
 * copy — #1909 deleted the last per-faction seal override, so every skin, WOW
 * included, renders the shared `useDuelSealCopy` (#2999).
 *
 * Prereqs: backend (seeded dev DB at head) + frontend, via frontend/e2e/run-e2e.sh.
 */

const API = process.env.E2E_API_URL ?? 'http://localhost:8000'

// Unique per run so every test gets fresh accounts — no cross-run state bleed
// (a character that already holds a praxis on the task can't duel on it again).
export const RUN = Date.now().toString(36)

/** The acquired half of a fixture: the test's browser, the backend, this run. */
export const scenarioFor = (browser: Browser): Scenario<BrowserContext> => ({
  browser,
  api: API,
  run: RUN,
})

/**
 * Issue a challenge through the composer UI. `page` must already be at the
 * challenger's /praxis/:id/edit. Flips to duel mode via the mode chip, searches
 * the opponent, and picks them from the dropdown — picking is what issues the
 * challenge (controls.tsx onPick = state.sendChallenge). Asserts the attached
 * opponent chip so the challenge is confirmed before returning.
 */
export async function challengeViaUi(page: Page, opponentName: string): Promise<void> {
  // The duel mode chip. It is NOT per-archetype copy (#1676): every composer
  // builds its mode options from the shared `editPraxis.composer.modeDuel`
  // ("Duel", forms.json), and the `editPraxis.ua.*` block the old locator quoted
  // does not exist anywhere in the catalog — so that name matched nothing and
  // this helper could never get past here. `exact` keeps it off the longer
  // duel-related labels elsewhere on the page. The chip only renders at level ≥ 2.
  const duelChip = page.getByRole('button', { name: 'Duel', exact: true })
  await expect(duelChip).toBeVisible()
  await duelChip.click()
  await expect(duelChip).toHaveAttribute('aria-pressed', 'true')

  // InviteSearch (duel mode). By SLOT, not by its aria-label: one box serves
  // both the collab invite and the duel challenge, and which of the two catalog
  // labels it wears is a fact about copy (#2453). In duel mode the box is open
  // from the start — the `+ invite` disclosure is the collab's alone.
  const search = page.getByTestId('composer-invite-search')
  await search.fill(opponentName)

  // Results dropdown (role=listbox) auto-opens once the query (≥ 2 chars) returns
  // a match. Each result is a button carrying the character's display name.
  const option = page.getByRole('listbox').getByText(opponentName, { exact: false })
  await option.click()

  // Challenge attached: the search input is replaced by the facing pair (#1417).
  // Anchored on the pair itself and on the opponent's own NAME — never on the
  // badge's words. This line used to read `getByText('challenged')`, which was
  // `editPraxis.invite.statusChallenged` until #1417 rewrote it to "Challenge
  // sent" on 2026-08-01; the helper has failed here on every nightly since, and
  // #1676 (08-15) fixed the two locators ABOVE without ever reaching this one.
  await expect(pair(page)).toBeVisible()
  await expect(pair(page).getByText(opponentName)).toBeVisible()
}

/** The composer's attached-duel block — proof `praxis.duel_id` is set. */
function pair(page: Page) {
  return page.getByTestId('composer-duel-pair')
}

/**
 * Accept a pending challenge through the opponent's updates feed. Lands the
 * opponent on their freshly-created opponent-praxis composer (feed card
 * landOnPraxis → /praxis/:id/edit). Accept/Decline live only on /updates.
 */
export async function acceptDuelViaUi(page: Page): Promise<void> {
  await page.goto('/updates')
  const accept = page.getByRole('button', { name: 'Accept Duel' })
  await expect(accept).toBeVisible()
  await accept.click()
  await page.waitForURL(/\/praxis\/\d+\/edit/)
}

/**
 * Wait until the composer has loaded the attached duel — the opponent chip shows
 * the opponent's name (proof state.duel is non-null, so the seal button opens the
 * confirm dialog rather than publishing as a plain solo praxis).
 */
export async function waitForDuelAttached(page: Page, opponentName: string): Promise<void> {
  // The pair only draws its two sides once `state.duel` has landed, so the
  // opponent's name INSIDE it is the proof — a bare page-wide getByText would
  // also be satisfied by a roster or a feed card elsewhere on the composer.
  await expect(pair(page).getByText(opponentName)).toBeVisible()
}

/**
 * Seal a duel side through the composer UI: the primary submit opens the seal
 * confirm when a duel is attached (controls.tsx sealsADuel → requestDuelSeal),
 * then confirm inside the dialog.
 *
 * BY SLOT, NOT BY LABEL (#2453). Both halves of this step have been re-anchored
 * on wording once already and both broke again:
 *  - the composer submit was "Seal it" (#954), then the shared "Submit" (#1676),
 *    and `PublishButton` swaps that label again for the collab gate and the duel
 *    pull-back — three strings for one slot;
 *  - the dialog was `getByRole('dialog', { name: 'Seal the duel?' })` with a
 *    /seal it/i confirm, and #1928 renamed both to "Lock the duel?" / "Lock it"
 *    the day after #1676 landed.
 * `composer-primary`, `duel-seal-sheet` and `duel-seal-confirm` name the slots,
 * so a copy edit cannot reach them.
 */
export async function sealViaUi(page: Page, title = `Duel entry ${RUN}`): Promise<void> {
  // NAME THE ENTRY FIRST. `accept_duel` (services/duel.py) mints the opponent's
  // praxis with no title, and `useEditPraxis.publish()` refuses an untitled
  // praxis — `errors.titleRequired`, client-side, before any request. So the
  // opponent's seal never left the browser, and the OLD post-condition here
  // could not tell: `publish()` closes the seal sheet on its very first line, on
  // purpose, so an error lands in plain sight rather than behind the overlay —
  // which made `toBeHidden()` green on a submit that never happened. The duel
  // then stayed `active`, `DuelCard` drew nothing, and the failure surfaced four
  // steps later as a missing rail (#2453). A real opponent types a title too.
  await page.getByTestId('praxis-title').fill(title)

  // The composer's primary — it opens the seal sheet rather than publishing,
  // because a duel is attached (controls.tsx sealsADuel).
  await page.getByTestId('composer-primary').click()
  const sheet = page.getByTestId('duel-seal-sheet')
  await expect(sheet).toBeVisible()
  await sheet.getByTestId('duel-seal-confirm').click()
  await expect(sheet).toBeHidden()

  // Proof the seal LANDED, not merely that the overlay went. A submitted praxis
  // has no editor on it either way: the first sealer gets the waiting surface
  // (ADR-0059) and the second gets redirected to the read page, and neither
  // draws a write-up box. An untitled refusal, by contrast, leaves the composer
  // exactly where it was.
  await expect(page.locator('.cm-content')).toHaveCount(0)
}
