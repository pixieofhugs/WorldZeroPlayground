/**
 * e2e account + praxis scaffolding (#2888), kept PR-reachable; never import
 * `@playwright/test` (see `contrastSweep.ts`). `E2ERequest`/`E2EContext`/
 * `E2EBrowser` are narrow shapes Playwright's objects satisfy structurally, so
 * `__tests__/e2eScenario.test.ts` can drive the builders with a fake. No `any`:
 * responses read as the generated contract; `readJson`'s `as T` is the one cast.
 */
import type { components } from '../api/generated/schema'
import type { PraxisCreate, PraxisInviteOut, PraxisOut } from '../api/praxis'
import type { TaskOut } from '../api/tasks'

type DevLoginOut = components['schemas']['DevLoginOut']
type InviteResponseOut = components['schemas']['InviteResponseOut']

/** Slice of Playwright's `APIResponse`. */
export interface E2EResponse {
  ok(): boolean
  status(): number
  text(): Promise<string>
  json(): Promise<unknown>
}

/** Slice of Playwright's `APIRequestContext`. */
export interface E2ERequest {
  get(url: string): Promise<E2EResponse>
  post(url: string, options?: { data?: unknown }): Promise<E2EResponse>
}

/** Slice of Playwright's `BrowserContext`: one cookie jar. */
export interface E2EContext {
  readonly request: E2ERequest
}

/** Slice of Playwright's `Browser`. */
export interface E2EBrowser<Ctx extends E2EContext> {
  newContext(): Promise<Ctx>
}

/** What is ACQUIRED, not decided; the spec reads `api`/`run` from env/clock so vitest can run this. */
export interface Scenario<Ctx extends E2EContext> {
  readonly browser: E2EBrowser<Ctx>
  readonly api: string
  readonly run: string
}

export interface Player<Ctx extends E2EContext = E2EContext> {
  readonly ctx: Ctx
  readonly api: string
  readonly characterId: number
  readonly name: string
}

/** Read a response as `T`, or throw with the status AND the body. */
export async function readJson<T>(response: E2EResponse, what: string): Promise<T> {
  if (!response.ok()) {
    throw new Error(`${what} failed (HTTP ${response.status()}): ${await response.text()}`)
  }
  return (await response.json()) as T
}

/** The backend derives @handles by truncating display names; names must differ within this. */
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

// Per-worker sequence: unique login keys and names regardless of test order.
let loginSeq = 0

/**
 * Dev-only `POST /auth/dev-login` in a fresh context, minting a character at
 * `level` (collab/duel chips only render at their `era.*_level_required`).
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
    // Nullable in the contract; fail here, not as a null in a later request body.
    throw new Error(`dev-login for ${name} returned an account with no character`)
  }
  return { ctx, api: scenario.api, characterId: body.character_id, name }
}

export async function fetchTasks(player: Player): Promise<TaskOut[]> {
  return readJson<TaskOut[]>(await player.ctx.request.get(`${player.api}/tasks`), 'GET /tasks')
}

export async function fetchPraxis(player: Player, praxisId: number): Promise<PraxisOut> {
  return readJson<PraxisOut>(
    await player.ctx.request.get(`${player.api}/praxes/${praxisId}`),
    `GET /praxes/${praxisId}`,
  )
}

/** Scaffolding, not a tested action: UI specs reach the composer by clicking. */
export async function createPraxis(player: Player, data: PraxisCreate): Promise<PraxisOut> {
  return readJson<PraxisOut>(
    await player.ctx.request.post(`${player.api}/praxes`, { data }),
    `create ${data.type} praxis`,
  )
}

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

export async function submitPraxis(player: Player, praxisId: number): Promise<PraxisOut> {
  return readJson<PraxisOut>(
    await player.ctx.request.post(`${player.api}/praxes/${praxisId}/submit`),
    `submit praxis ${praxisId}`,
  )
}
