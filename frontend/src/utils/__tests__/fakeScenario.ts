/**
 * A recording stand-in for Playwright's `Browser` / `BrowserContext` /
 * `APIRequestContext`, so the e2e scenario builders (#2888) can be exercised in
 * vitest with no browser and no backend.
 *
 * This is the payoff of the port in `e2eScenario.ts`: the builders name the
 * three methods they use rather than importing `@playwright/test`, so anything
 * with those methods drives them — the real browser at 3am, this object in a
 * PR. Nothing here is a mock of a module; it is an ordinary object satisfying
 * an ordinary interface, and `tsc` checks the fit at both call sites.
 *
 * Not a `.test.ts` file, so vitest does not collect it (the config's include is
 * `src/**\/*.test.{ts,tsx}`), and it sits under `__tests__/` so the source
 * scans skip it.
 */
import type { TaskOut } from '../../api/tasks'
import type { E2EBrowser, E2EContext, E2ERequest, E2EResponse, Scenario } from '../e2eScenario'

/** One request the builders made, in the order they made it. */
export interface RecordedCall {
  readonly method: 'GET' | 'POST'
  readonly url: string
  /** Which cookie jar it went out on — 0 is the first context opened. */
  readonly context: number
  readonly data?: unknown
}

export interface FakeReply {
  readonly status: number
  readonly body: unknown
}

/** Decides what the fake backend answers. */
export type Router = (call: RecordedCall) => FakeReply

export const ok = (body: unknown): FakeReply => ({ status: 200, body })
export const fail = (status: number, body: unknown): FakeReply => ({ status, body })

interface FakeContext extends E2EContext {
  readonly index: number
}

export interface FakeScenario {
  readonly scenario: Scenario<FakeContext>
  readonly calls: RecordedCall[]
  /** How many cookie jars were opened — one per logged-in player. */
  readonly contextCount: () => number
}

/** The base URL every expected URL in a test is written against. */
export const FAKE_API = 'http://backend.test'

/** The run id every expected login key in a test is written against. */
export const FAKE_RUN = 'testrun'

export function fakeScenario(router: Router): FakeScenario {
  const calls: RecordedCall[] = []
  let contexts = 0

  const respond = (call: RecordedCall): E2EResponse => {
    calls.push(call)
    const reply = router(call)
    return {
      ok: () => reply.status < 400,
      status: () => reply.status,
      text: async () => JSON.stringify(reply.body),
      json: async () => reply.body,
    }
  }

  const requestFor = (context: number): E2ERequest => ({
    get: async (url) => respond({ method: 'GET', url, context }),
    post: async (url, options) => respond({ method: 'POST', url, context, data: options?.data }),
  })

  const browser: E2EBrowser<FakeContext> = {
    newContext: async () => {
      const index = contexts++
      return { index, request: requestFor(index) }
    },
  }

  return {
    scenario: { browser, api: FAKE_API, run: FAKE_RUN },
    calls,
    contextCount: () => contexts,
  }
}

/**
 * A backend that answers every call the fixtures make: dev-login mints a
 * character, `GET /tasks` returns what the test supplied, and every write
 * echoes back a plausible record. Ids climb from 100 so a test asserting on one
 * cannot pass by matching a task id or a character id by accident.
 */
export function routerFor(tasks: readonly TaskOut[]): Router {
  let nextId = 100
  return (call) => {
    if (call.url.includes('/auth/dev-login')) {
      return ok({
        account_id: nextId++,
        character_id: nextId++,
        character_name: new URL(call.url).searchParams.get('name'),
        faction_slug: 'na',
        message: 'ok',
      })
    }
    if (call.url.endsWith('/tasks')) return ok(tasks)
    if (call.url.includes('/invite/')) return ok({ accepted: true, praxis_id: nextId })
    if (call.url.endsWith('/invite')) {
      return ok({ id: nextId++, praxis_id: nextId, invitee_id: 0, inviter_id: 0, status: 'pending' })
    }
    if (call.url.endsWith('/submit')) return ok({ id: nextId, status: 'submitted' })
    if (call.url.endsWith('/praxes')) return ok({ id: nextId++, status: 'in_progress' })
    throw new Error(`the fake backend was not asked to answer ${call.method} ${call.url}`)
  }
}
