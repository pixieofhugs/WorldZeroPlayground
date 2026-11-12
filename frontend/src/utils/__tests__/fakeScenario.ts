/**
 * A recording stand-in for Playwright's browser/context/request, so the e2e
 * scenario builders (#2888) run in vitest with no browser or backend. It
 * satisfies the port in `e2eScenario.ts`; not a mock of a module.
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
 * A backend answering every fixture call. Ids climb from 100 so an id assertion
 * cannot match a task or character id by accident.
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
