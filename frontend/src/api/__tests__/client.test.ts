/**
 * #1400 — the openapi-fetch transport at its seam: the `Request` handed to
 * `fetch` and the error handed back. Neither is visible to the type checker.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { ApiError, ApiNetworkError } from '../apiError'
import { apiGet, apiPost } from '../client'
import { extractError, extractErrorCode } from '../../utils/errors'

const JSON_HEADERS = { 'content-type': 'application/json' }

const jsonReply = (status: number, body: string) => () =>
  Promise.resolve(new Response(body, { status, headers: JSON_HEADERS }))

/**
 * Stubbed in `vi.hoisted`: openapi-fetch binds `globalThis.fetch` when
 * `../client` is imported. A later `vi.stubGlobal` is ignored and the suite
 * silently hits whatever listens on localhost:8000.
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

const sentUrl = () => new URL(sent[0].url)

describe('the request the client builds', () => {
  it('sends the httpOnly JWT cookie', async () => {
    await apiGet('/tasks', {})
    expect(sent[0].credentials).toBe('include')
  })

  it('resolves paths against the configured base URL', async () => {
    await apiGet('/tasks', {})
    expect(sentUrl().origin).toBe('http://localhost:8000')
    expect(sentUrl().pathname).toBe('/tasks')
  })

  /**
   * #1366: FastAPI's `list[str] = Query(None)` reads only repeated bare keys;
   * `faction[]=` silently drops the filter. Fails if a `querySerializer` is
   * ever added to `client.ts`.
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

  /**
   * `null` (schema allows it) and `[]` (last chip cleared) must vanish too:
   * `?faction=null` / `?faction=` match nothing (#1366 again).
   */
  it('omits a null filter and an empty union, not just an undefined one', async () => {
    await apiGet('/tasks', { params: { query: { faction: null, sort: 'newest' } } })
    expect(sentUrl().search).toBe('?sort=newest')

    await apiGet('/tasks', { params: { query: { faction: [], sort: 'newest' } } })
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
   * openapi-fetch resolves `{ error }` by default; every consumer is a
   * `try`/`catch` around `extractError`, so not throwing reports failures as
   * successes.
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

  it('is readable by extractError and extractErrorCode unchanged', async () => {
    wire.replyWith(jsonReply(409, CODED_409))

    const error = await apiGet('/tasks', {}).catch((caught: unknown) => caught)

    expect(extractError(error, 'FALLBACK')).toBe('Task bank is full.')
    expect(extractErrorCode(error)).toBe('TASK_BANK_FULL')
  })

  /** A proxy's HTML error page: status still reaches `extractError`'s 5xx prose. */
  it('still throws with a status when the body is not JSON', async () => {
    wire.replyWith(() => Promise.resolve(new Response('<html>502</html>', { status: 502 })))

    const error = await apiGet('/tasks', {}).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(502)
    expect(extractError(error, 'FALLBACK')).toBe(
      'The server ran into an unexpected problem. Try again in a moment.',
    )
  })

  /** `fetch` rejected: no status, distinct copy from a 500. */
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
 * Proves this client consults `sessionRedirect.ts` and hands it a URL the
 * probe check can match (openapi-fetch's `Request.url` is absolute).
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
