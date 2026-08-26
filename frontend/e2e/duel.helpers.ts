import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

/**
 * Shared fixtures + UI actions for the duel e2e specs (duel.spec.ts and the
 * isolated duel-zzz-resolved.spec.ts). Mirrors the conventions in
 * collaboration.spec.ts: per-run unique dev-login keys, a fresh browser context
 * per player, everything serial.
 *
 * Split point (#953): only ACCOUNT + TASK + solo-draft scaffolding uses the API.
 * Every DUEL action — challenge, accept, seal — goes through a real clicked
 * button (challengeViaUi / acceptDuelViaUi / sealViaUi below), so a missing or
 * unreachable control fails the test instead of passing silently.
 *
 * Why a faction-skinned task (pickDuelTask): the composer archetype, the seal
 * dialog and the praxis-detail page (which mounts the duel rail) are each
 * dispatched by the TASK's faction, not the player's — so a task belonging to a
 * real faction drives three real archetypes instead of the Default fall-through
 * an `na` task would give. A level-2 player (duels need era.duel_level_required
 * = 2) can sign up for such tasks at level ≤ 2.
 *
 * CORRECTED (#1676) — an old note here claimed a UA task yields the *Default*
 * seal dialog and rail. It does not: `factions/ua.ts` registers both `duelSeal`
 * and `praxisDetail`. What is actually true, and what makes any skin safe to
 * assert against, is that the COPY is faction-invariant — every skin takes the
 * heading and confirm label from the shared `useDuelSealCopy`, and all eight
 * praxis-detail archetypes render the same `duelCrossLink` strings. The one
 * faction that does override them is `wow` ("Take the Field", praxis.json
 * `duelSeal.wow`), so this helper must not drift onto a wow task — which is a
 * property of the copy catalog, and the only faction this file names.
 *
 * CORRECTED again (#2710) — this used to select on `primary_faction_slug ===
 * 'ua'`, matching a literal that `seed.py` also named. Under an era without UA
 * the seeder's guard fired, the fixture task was never created, and the failure
 * surfaced here as a missing task with nothing in it about eras. Both sides now
 * name no faction: the seeder reads the era, and this picks on the properties
 * the specs actually need.
 *
 * The task itself is dev-seeded — `seed.py::ensure_duel_fixture_task`. Era 1
 * declares no tasks (#1398), so before that this filter matched nothing and the
 * whole duel suite failed here on every nightly it ever ran.
 */

export const API = process.env.E2E_API_URL ?? 'http://localhost:8000'

// Unique per run so every test gets fresh accounts — no cross-run state bleed
// (a character that already holds a praxis on the task can't duel on it again).
export const RUN = Date.now().toString(36)

// Duels are gated on era.duel_level_required (2 in Era 1, backend/eras/era_1.py),
// so the challenger must be seeded at level ≥ 2 for the duel mode chip to show.
export const DUEL_LEVEL = 2

export interface Player {
  ctx: BrowserContext
  characterId: number
  name: string
}

/** Bot-login in a fresh browser context; returns the context + seeded character. */
export async function login(
  browser: Browser,
  key: string,
  name: string,
  level: number,
): Promise<Player> {
  const ctx = await browser.newContext()
  const res = await ctx.request.post(
    `${API}/auth/dev-login?key=${encodeURIComponent(key)}&name=${encodeURIComponent(name)}&level=${level}`,
  )
  expect(res.ok(), `dev-login failed for ${key} — is the backend up on ${API}?`).toBeTruthy()
  const body = await res.json()
  return { ctx, characterId: body.character_id, name }
}

/**
 * The cross-faction sentinel: a task belonging to no faction (`faction_slugs.py`).
 * The only slug this file may rely on existing, because it is the one an era is
 * structurally required to carry — it is the FK target for cross-faction tasks.
 * The onboarding task and every collaboration fixture task wear it, and they are
 * exactly the tasks this helper must skip: they render the Default archetypes.
 */
const CROSS_FACTION_SLUG = 'na'

/** The faction that overrides the duel-seal copy this suite asserts on (see header). */
const SEAL_COPY_OVERRIDING_SLUG = 'wow'

/**
 * First task the level-2 challenger may attempt that drives a real faction skin.
 *
 * Selects on properties, never on a slug (#2710): at or below the duel level, so
 * the challenger can sign up; belonging to some faction, so the composer, seal
 * dialog and duel rail dispatch to a real archetype rather than the Default; and
 * not the one faction that rewrites the seal copy the specs assert on.
 */
export async function pickDuelTask(player: Player): Promise<{ id: number; title: string }> {
  const res = await player.ctx.request.get(`${API}/tasks`)
  const tasks = await res.json()
  const task = tasks.find(
    (t: any) =>
      (t.level_required ?? 0) <= DUEL_LEVEL &&
      t.primary_faction_slug &&
      t.primary_faction_slug !== CROSS_FACTION_SLUG &&
      t.primary_faction_slug !== SEAL_COPY_OVERRIDING_SLUG,
  )
  expect(
    task,
    `no faction-skinned task at level ≤ ${DUEL_LEVEL} in the seeded DB — run ` +
      `backend/seed.py, which creates one for whichever faction the live era carries ` +
      `(seed.py::ensure_duel_fixture_task)`,
  ).toBeTruthy()
  return { id: task.id, title: task.title }
}

/**
 * Create a solo praxis draft (scaffolding — NOT a duel action, so it uses the
 * API, exactly as collaboration.spec.ts creates its collab praxis). Returns the
 * draft id; the caller then drives the duel via the composer UI.
 */
export async function createSoloDraft(
  player: Player,
  taskId: number,
  title: string,
): Promise<number> {
  const res = await player.ctx.request.post(`${API}/praxes`, {
    data: { task_id: taskId, type: 'solo', title, body_text: 'draft' },
  })
  expect(res.ok(), `solo create failed: ${await res.text()}`).toBeTruthy()
  return (await res.json()).id as number
}

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
