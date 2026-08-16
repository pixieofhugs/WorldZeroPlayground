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
 * Why a UA task specifically (pickUaDuelTask): the composer archetype, the seal
 * dialog and the praxis-detail page (which mounts the duel rail) are each
 * dispatched by the TASK's faction, not the player's — so a UA task drives three
 * real archetypes (UaEditPraxis / UaDuelSealConfirm / UaPraxisDetail) instead of
 * the Default fall-through an `na` task would give. A level-2 player (duels need
 * era.duel_level_required = 2) can sign up for UA tasks at level ≤ 2.
 *
 * CORRECTED (#1676) — the old note here claimed a UA task yields the *Default*
 * seal dialog and rail. It does not: `factions/ua.ts` registers both `duelSeal`
 * and `praxisDetail`. What is actually true, and what makes UA safe to assert
 * against, is that the COPY is faction-invariant — every skin takes the heading
 * and confirm label from the shared `useDuelSealCopy`, and all eight
 * praxis-detail archetypes render the same `duelCrossLink` strings. The one
 * faction that does override them is `wow` ("Take the Field", praxis.json
 * `duelSeal.wow`), so this helper must not drift onto a wow task.
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

/** First active UA task the level-2 challenger may attempt (see header for why UA). */
export async function pickUaDuelTask(player: Player): Promise<{ id: number; title: string }> {
  const res = await player.ctx.request.get(`${API}/tasks`)
  const tasks = await res.json()
  const task = tasks.find(
    (t: any) => t.primary_faction_slug === 'ua' && (t.level_required ?? 0) <= DUEL_LEVEL,
  )
  expect(task, 'no UA task at level ≤ 2 in the seeded DB — run backend/seed.py').toBeTruthy()
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

  // InviteSearch (duel mode) is a SHARED control: this aria-label is stable
  // across every archetype (controls.tsx searchAriaDuel, not skin-overridable).
  const search = page.getByLabel('search an opponent')
  await search.fill(opponentName)

  // Results dropdown (role=listbox) auto-opens once the query (≥ 2 chars) returns
  // a match. Each result is a button carrying the character's display name.
  const option = page.getByRole('listbox').getByText(opponentName, { exact: false })
  await option.click()

  // Challenge attached: the search input is replaced by the opponent chip showing
  // "⚔ <name> · challenged" (statusChallenged). Prove it landed before returning.
  await expect(page.getByText(opponentName)).toBeVisible()
  await expect(page.getByText('challenged')).toBeVisible()
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
  await expect(page.getByText(opponentName)).toBeVisible()
}

/**
 * Seal a duel side through the composer UI: the primary submit opens the seal
 * confirm when a duel is attached (controls.tsx sealsADuel → requestDuelSeal),
 * then confirm inside the dialog.
 *
 * CORRECTED (#1676): the composer submit is NOT "Seal it". `PublishButton` only
 * replaces its idle label for the collab consensus gate and the duel PULL-BACK;
 * an unsealed duel side falls through to the archetype's own `idleLabel`, which
 * is the shared `editPraxis.composer.submit` ("Submit") in all eight composers.
 * "Seal it" exists only as the DIALOG's confirm (praxis.json duelSeal.confirm),
 * so the old pre-dialog locator matched nothing.
 */
export async function sealViaUi(page: Page): Promise<void> {
  // The composer submit — it opens the seal dialog rather than publishing,
  // because a duel is attached (controls.tsx sealsADuel).
  await page.getByRole('button', { name: 'Submit', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Seal the duel?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: /seal it/i }).click()
  await expect(dialog).toBeHidden()
}
