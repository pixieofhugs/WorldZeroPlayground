/**
 * The e2e suite's ACCOUNT + PRAXIS scaffolding (#2888, finishing #1780).
 *
 * Molly's ruling of 2026-08-18: *"move `e2e/`'s logic into plain modules under
 * the app's build graph, keep the spec as a thin Playwright driver."* #1780
 * applied it to the contrast scanner only (`contrastScan.ts` /
 * `contrastSweep.ts`); the two lifecycle specs kept theirs. This is that half.
 *
 * NOTHING HERE IMPORTS `@playwright/test`, and nothing here may — the same rule
 * `contrastSweep.ts` states. That import is the line between a module and a
 * spec; on this side of it `tsc --noEmit`, `eslint src` and vitest all reach
 * the code in a PR, instead of a browser reaching it at 3am. The Playwright RUN
 * is unchanged and still nightly-only (`e2e.yml`'s own header) — what became
 * PR-reachable is the deciding, not the browsing.
 *
 * HOW IT TALKS TO PLAYWRIGHT WITHOUT IMPORTING IT. `E2ERequest` / `E2EContext`
 * / `E2EBrowser` are the narrow shape these builders actually use, and
 * Playwright's `APIRequestContext`, `BrowserContext` and `Browser` satisfy them
 * structurally — the spec passes the real objects and TypeScript checks the
 * fit at the call site. The builders stay generic in `Ctx` so a spec keeps the
 * REAL context back (it still needs `newPage()` / `close()`, which are
 * acquisition and belong to the spec). The same shape is what lets
 * `__tests__/e2eScenario.test.ts` drive every builder in milliseconds against a
 * recording fake, with no browser and no backend.
 *
 * NO `any`, ANYWHERE (#2889 bans it in `e2e/**` next). Every response is read
 * as the app's own generated contract — `TaskOut`, `PraxisOut`, `DevLoginOut`
 * — so `scripts/regen_api_client.py` renaming a field reds this file in the
 * PR-blocking typecheck rather than in a nightly nobody reads. The `as T` in
 * `readJson` is the one cast, at the one trust boundary, and it is why the
 * checks below it exist.
 */
import type { components } from '../api/generated/schema'
import type { PraxisCreate, PraxisInviteOut, PraxisOut } from '../api/praxis'
import type { TaskOut } from '../api/tasks'

type DevLoginOut = components['schemas']['DevLoginOut']
type InviteResponseOut = components['schemas']['InviteResponseOut']

/** The slice of Playwright's `APIResponse` these builders read. */
export interface E2EResponse {
  ok(): boolean
  status(): number
  text(): Promise<string>
  json(): Promise<unknown>
}

/** The slice of Playwright's `APIRequestContext` these builders drive. */
export interface E2ERequest {
  get(url: string): Promise<E2EResponse>
  post(url: string, options?: { data?: unknown }): Promise<E2EResponse>
}

/** The slice of Playwright's `BrowserContext`: one player's cookie jar. */
export interface E2EContext {
  readonly request: E2ERequest
}

/** The slice of Playwright's `Browser`: a source of fresh cookie jars. */
export interface E2EBrowser<Ctx extends E2EContext> {
  newContext(): Promise<Ctx>
}

/**
 * Everything a builder needs that is ACQUIRED rather than decided: the browser
 * the test was handed, where the backend is, and an id unique to this run.
 *
 * `api` and `run` are read from `process.env` / the clock in the spec, on
 * purpose. Reaching for either here would make these builders unrunnable in
 * vitest, which is the whole point of the move.
 */
export interface Scenario<Ctx extends E2EContext> {
  readonly browser: E2EBrowser<Ctx>
  readonly api: string
  readonly run: string
}

/** A logged-in character: their cookie jar, their id, their display name. */
export interface Player<Ctx extends E2EContext = E2EContext> {
  readonly ctx: Ctx
  /** The deployment this player's cookies belong to — see `Scenario.api`. */
  readonly api: string
  readonly characterId: number
  readonly name: string
}

/**
 * Read a response as `T`, or throw with the status AND the body.
 *
 * The specs used to write `expect(res.ok(), await res.text()).toBeTruthy()`
 * around every call. A thrown Error fails a Playwright test just as loudly,
 * costs no `@playwright/test` import, and is what lets the unit tests assert
 * that a 4xx is reported rather than silently destructured into `undefined`.
 */
export async function readJson<T>(response: E2EResponse, what: string): Promise<T> {
  if (!response.ok()) {
    throw new Error(`${what} failed (HTTP ${response.status()}): ${await response.text()}`)
  }
  return (await response.json()) as T
}

/**
 * How many leading characters of a display name must already be distinct.
 *
 * The backend derives an @handle by truncating the display name, so two
 * fixture characters whose names agree for this long collide on it — which
 * surfaces four steps later as an invite that lands on the wrong character.
 * `playerName` puts the distinguishing token FIRST for exactly this reason.
 */
export const HANDLE_PREFIX_LENGTH = 14

/** Fixture display name: role + sequence + run, distinguishing token first. */
export function playerName(role: string, seq: number, run: string): string {
  const name = `${role.toUpperCase()}${seq}-${run}`
  if (name.length > HANDLE_PREFIX_LENGTH) {
    throw new Error(
      `fixture name "${name}" is longer than the ${HANDLE_PREFIX_LENGTH}-character ` +
        'handle prefix, so it can collide with another player — shorten the role code',
    )
  }
  return name
}

// Every login in a worker takes the next number, so no two fixture characters
// share a login key or a display name however the tests are ordered or skipped.
let loginSeq = 0

/**
 * Bot-login in a fresh browser context; returns the context + seeded character.
 *
 * The dev-only `POST /auth/dev-login` mints an account and a character at a
 * given level in one call (`?key=&name=&level=`). Level matters: collab
 * creation needs `era.collaboration_level_required` and a duel needs
 * `era.duel_level_required`, so a fixture at the wrong level fails on a chip
 * that never renders.
 */
export async function loginPlayer<Ctx extends E2EContext>(
  scenario: Scenario<Ctx>,
  role: string,
  level: number,
): Promise<Player<Ctx>> {
  const seq = loginSeq++
  const name = playerName(role, seq, scenario.run)
  const ctx = await scenario.browser.newContext()
  const response = await ctx.request.post(
    `${scenario.api}/auth/dev-login` +
      `?key=${encodeURIComponent(`${role}-${scenario.run}-${seq}`)}` +
      `&name=${encodeURIComponent(name)}&level=${level}`,
  )
  const body = await readJson<DevLoginOut>(
    response,
    `dev-login for ${role} — is the backend up on ${scenario.api}?`,
  )
  if (body.character_id === null) {
    // `DevLoginOut.character_id` is nullable: the account may exist with no
    // character. Every fixture below invites, submits or duels BY id, so this
    // has to fail here rather than as a null in a request body later.
    throw new Error(`dev-login for ${name} returned an account with no character`)
  }
  return { ctx, api: scenario.api, characterId: body.character_id, name }
}

/** Every task the API lists for this player, in its own order. */
export async function fetchTasks(player: Player): Promise<TaskOut[]> {
  return readJson<TaskOut[]>(await player.ctx.request.get(`${player.api}/tasks`), 'GET /tasks')
}

/** The praxis as this player sees it — members, status, flushed `body_text`. */
export async function fetchPraxis(player: Player, praxisId: number): Promise<PraxisOut> {
  return readJson<PraxisOut>(
    await player.ctx.request.get(`${player.api}/praxes/${praxisId}`),
    `GET /praxes/${praxisId}`,
  )
}

/**
 * Create a praxis (solo or collab) as this player.
 *
 * SCAFFOLDING, not a tested action: the specs' UI blocks reach the composer by
 * clicking a real sign-up control instead. This is how a test that is about
 * something else gets a draft to work on.
 */
export async function createPraxis(player: Player, data: PraxisCreate): Promise<PraxisOut> {
  return readJson<PraxisOut>(
    await player.ctx.request.post(`${player.api}/praxes`, { data }),
    `create ${data.type} praxis`,
  )
}

/** Invite a character to a collab praxis; returns the pending invite. */
export async function invite(
  player: Player,
  praxisId: number,
  inviteeId: number,
): Promise<PraxisInviteOut> {
  return readJson<PraxisInviteOut>(
    await player.ctx.request.post(`${player.api}/praxes/${praxisId}/invite`, {
      data: { invitee_id: inviteeId },
    }),
    `invite ${inviteeId} to praxis ${praxisId}`,
  )
}

/** Accept or decline an invite as the invitee. */
export async function respondToInvite(
  player: Player,
  praxisId: number,
  inviteId: number,
  accept: boolean,
): Promise<InviteResponseOut> {
  return readJson<InviteResponseOut>(
    await player.ctx.request.post(
      `${player.api}/praxes/${praxisId}/invite/${inviteId}/respond`,
      { data: { accept } },
    ),
    `respond to invite ${inviteId}`,
  )
}

/** Submit this player's side of a praxis; returns the praxis as it now stands. */
export async function submitPraxis(player: Player, praxisId: number): Promise<PraxisOut> {
  return readJson<PraxisOut>(
    await player.ctx.request.post(`${player.api}/praxes/${praxisId}/submit`),
    `submit praxis ${praxisId}`,
  )
}
