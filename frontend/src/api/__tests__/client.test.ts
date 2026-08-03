/**
 * #1400 — the openapi-fetch transport, tested at the seam it actually owns:
 * the `Request` the configured client hands to `fetch`, and the error it hands
 * back to the caller.
 *
 * Both halves are invisible to the type checker. `schema.d.ts` says `faction`
 * is a `string[]`; it says nothing about how that array reaches the wire, and
 * the wrong answer 200s with the filter silently dropped. Likewise nothing in
 * the types distinguishes a client that throws on a 403 from one that returns
 * `{ error }` — but ninety-odd call sites sit inside `try`/`catch` blocks that
 * only one of those two behaviours reaches.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { ApiError, ApiNetworkError, apiGet, apiPost } from '../client'
import { extractError, extractErrorCode } from '../../utils/errors'

const JSON_HEADERS = { 'content-type': 'application/json' }

const jsonReply = (status: number, body: string) => () =>
  Promise.resolve(new Response(body, { status, headers: JSON_HEADERS }))

/**
 * The fetch stub goes in via `vi.hoisted`, not `beforeEach`, because
 * `openapi-fetch` binds `globalThis.fetch` when the client is CREATED — which
 * happens at `../client`'s top level, i.e. during this file's imports. A later
 * `vi.stubGlobal('fetch', …)` is simply not consulted, and the failure is not a
 * failure: the suite issues REAL requests to whatever is listening on
 * localhost:8000 and asserts against its answers.
 */
const wire = vi.hoisted(() => {
  const ok = () =>
    Promise.resolve(
      new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }),
    )

  const sent: Request[] = []
  let reply: () => Promise<Response> = ok

  globalThis.fetch = (async (input: Request) => {
    sent.push(input)
    return reply()
  }) as unknown as typeof globalThis.fetch

  return {
    sent,
    reset() {
      sent.length = 0
      reply = ok
    },
    replyWith(next: () => Promise<Response>) {
      reply = next
    },
  }
})

const sent = wire.sent

beforeEach(() => {
  wire.reset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** The URL of the single request the last call made. */
const sentUrl = () => new URL(sent[0].url)

describe('the request the client builds', () => {
  it('sends the httpOnly JWT cookie', async () => {
    // Without this the backend sees an anonymous caller on every authenticated
    // read, and answers 401 — or worse, answers a guest's version of the page.
    await apiGet('/tasks', {})
    expect(sent[0].credentials).toBe('include')
  })

  it('resolves paths against the configured base URL', async () => {
    await apiGet('/tasks', {})
    expect(sentUrl().origin).toBe('http://localhost:8000')
    expect(sentUrl().pathname).toBe('/tasks')
  })

  /**
   * The one that has bitten this repo before (#1366). `GET /tasks` declares
   * `faction: list[str] = Query(None)`, which FastAPI reads from REPEATED bare
   * keys. Axios' default writes `faction[]=ua`, from which FastAPI reads
   * nothing at all: the request succeeds, the filter vanishes, and no test,
   * type or log says a word. `api/tasks.ts` carries `REPEATED_QUERY_PARAMS`
   * purely to undo that.
   *
   * openapi-fetch defaults to `style: "form", explode: true`, which is the
   * shape FastAPI wants — but "the library's default happens to be right" is a
   * claim, and this is the assertion that makes it a checked one. If a
   * `querySerializer` is ever added to `client.ts` for some other reason, this
   * fails rather than the filters going quiet.
   */
  it('writes an array param as repeated bare keys', async () => {
    await apiGet('/tasks', { params: { query: { faction: ['ua', 'wow'] } } })
    expect(sentUrl().search).toBe('?faction=ua&faction=wow')
    expect(sentUrl().searchParams.getAll('faction')).toEqual(['ua', 'wow'])
  })

  it('writes a union of one exactly as a single-slug caller would', async () => {
    await apiGet('/tasks', { params: { query: { faction: ['ua'] } } })
    expect(sentUrl().search).toBe('?faction=ua')
  })

  it('omits an absent filter rather than sending an empty one', async () => {
    // `?status=` is not "no filter" to FastAPI, it is the empty string.
    await apiGet('/tasks', {
      params: { query: { faction: undefined, status: undefined, sort: 'newest' } },
    })
    expect(sentUrl().search).toBe('?sort=newest')
  })

  it('sends a JSON body on a write', async () => {
    wire.replyWith(jsonReply(201, '{"id":1}'))

    await apiPost('/tasks', { body: { title: 'Sweep', point_value: 3, level_required: 0 } })

    expect(sent[0].method).toBe('POST')
    expect(sent[0].headers.get('content-type')).toContain('application/json')
    expect(await sent[0].json()).toEqual({ title: 'Sweep', point_value: 3, level_required: 0 })
  })
})

describe('what the client does with a failure', () => {
  const CODED_409 = '{"detail":{"code":"TASK_BANK_FULL","message":"Task bank is full."}}'

  /**
   * The load-bearing decision. openapi-fetch reports a failure by RESOLVING
   * with `{ data, error }` where axios rejected, and every consumer in this app
   * is a `try`/`catch` that calls `extractError`. A client that returns instead
   * of throwing turns a transport swap into an app-wide rewrite, and — far
   * worse — turns every unmigrated `catch` into dead code that reports a failed
   * request as a success.
   */
  it('throws on a non-2xx instead of returning an error branch', async () => {
    wire.replyWith(jsonReply(409, CODED_409))

    await expect(apiGet('/tasks', {})).rejects.toBeInstanceOf(ApiError)
  })

  it('carries the status and the parsed body on what it throws', async () => {
    wire.replyWith(jsonReply(403, '{"detail":"Task requires level 3"}'))

    const error = await apiGet('/tasks', {}).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(403)
    expect((error as ApiError).data).toEqual({ detail: 'Task requires level 3' })
  })

  /**
   * The point of throwing that particular shape: the app's existing error
   * readers must understand it without a call-site change.
   */
  it('is readable by extractError and extractErrorCode unchanged', async () => {
    wire.replyWith(jsonReply(409, CODED_409))

    const error = await apiGet('/tasks', {}).catch((caught: unknown) => caught)

    expect(extractError(error, 'FALLBACK')).toBe('Task bank is full.')
    expect(extractErrorCode(error)).toBe('TASK_BANK_FULL')
  })

  /**
   * A proxy's HTML error page is not JSON. That is no reason to throw something
   * the caller cannot read: the status still tells the truth, and `extractError`
   * falls through to its 5xx prose exactly as it does for an axios failure with
   * an unparseable body.
   */
  it('still throws with a status when the body is not JSON', async () => {
    wire.replyWith(() => Promise.resolve(new Response('<html>502</html>', { status: 502 })))

    const error = await apiGet('/tasks', {}).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(502)
    expect(extractError(error, 'FALLBACK')).toBe(
      'The server ran into an unexpected problem. Try again in a moment.',
    )
  })

  /**
   * `fetch` rejects — DNS failure, offline, connection refused. There is no
   * response and no status, which is a different thing from a 500 and reads as
   * different words to the player. `extractError`'s network branch keys off
   * exactly this.
   */
  it('distinguishes a network failure from a server failure', async () => {
    wire.replyWith(() => Promise.reject(new TypeError('Failed to fetch')))

    const error = await apiGet('/tasks', {}).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiNetworkError)
    expect(extractError(error, 'FALLBACK')).toBe(
      'Unable to reach the server. Check your connection and try again.',
    )
  })
})

/**
 * The rule `sessionRedirect.ts` owns, exercised through the NEW transport. Its
 * predicate has its own tests; what is unproven there is that this client
 * consults it at all, and that it hands over a URL the probe check can match —
 * openapi-fetch's `Request.url` is absolute where axios' `config.url` was not.
 */
describe('the 401 landing redirect', () => {
  const NOT_AUTHENTICATED = '{"detail":"Not authenticated"}'

  const stubLocation = (pathname: string) => {
    const location = { pathname, href: pathname }
    vi.stubGlobal('window', { location })
    return location
  }

  it('bounces a session that expires while the app is in use', async () => {
    const location = stubLocation('/tasks/46')
    wire.replyWith(jsonReply(401, NOT_AUTHENTICATED))

    await apiGet('/tasks', {}).catch(() => undefined)

    expect(location.href).toBe('/')
  })

  it('leaves a guest on the deep link they asked for when a probe 401s', async () => {
    const location = stubLocation('/tasks/46')
    wire.replyWith(jsonReply(401, NOT_AUTHENTICATED))

    await apiGet('/auth/me', {}).catch(() => undefined)

    expect(location.href).toBe('/tasks/46')
  })
})
