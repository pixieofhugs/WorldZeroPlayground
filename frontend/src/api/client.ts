/**
 * The typed API transport (#1400).
 *
 * `openapi-fetch` over the `paths` in `./generated/schema`, which is generated
 * from `backend/openapi.json` by `scripts/regen_api_client.py` and gated in CI.
 * That is the whole point: a route whose shape changes stops being a runtime
 * surprise and becomes a compile error.
 *
 * It is the app's only transport. It carries every convention the axios client
 * it replaced carried — `credentials`, the 401 rule below, and the query
 * serialization proven in `__tests__/client.test.ts` — because each of those,
 * dropped, fails as a 200 with the wrong answer rather than as an error.
 */
import createClient, {
  type ClientPathsWithMethod,
  type MaybeOptionalInit,
  type MethodResponse,
} from 'openapi-fetch'

import { ApiError, ApiNetworkError } from './apiError'
import { dropCachesAfterWrite } from '../hooks/cachedResource'
import type { paths } from './generated/schema'
import { returnToLandingIfSessionExpired } from './sessionRedirect'

const client = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  // The JWT is an httpOnly cookie. Without this every authenticated call goes
  // out anonymous and comes back as a guest's answer — which is not an error,
  // just quietly the wrong page.
  credentials: 'include',
})

/**
 * The 401 → landing rule, applied to this transport (`./sessionRedirect.ts`
 * owns it).
 *
 * Middleware rather than the helpers below: on the client, so it holds for
 * anything issued through it rather than only for the five wrappers exported
 * here. `request.url` is absolute, which the probe check tolerates because it
 * matches by substring.
 */
client.use({
  onResponse({ request, response }) {
    returnToLandingIfSessionExpired(response.status, request.url)
  },
})

/** The methods this app issues. */
type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

/**
 * `init` is optional exactly when the path needs nothing in it — no params, no
 * body. `MaybeOptionalInit` already encodes that by unioning `undefined` in, so
 * this reads the answer back off it rather than restating the rule.
 */
type InitArgs<Init> = undefined extends Init ? [init?: Init] : [init: Init]

/**
 * One method of the throwing client: same call signature as `client.GET` and
 * friends, but resolving to the success branch alone.
 *
 * `MethodResponse` is `openapi-fetch`'s own "the data for this path, this
 * method, these options" type, so the payload stays inferred from the schema —
 * narrowed here only by dropping the `{ data?: never, error }` half of the
 * union, which is unreachable once a failure throws.
 */
interface ThrowingMethod<Method extends HttpMethod> {
  <
    Path extends ClientPathsWithMethod<typeof client, Method>,
    Init extends MaybeOptionalInit<paths[Path], Method>,
  >(
    url: Path,
    ...init: InitArgs<Init>
  ): Promise<{
    data: MethodResponse<typeof client, Method, Path, Init>
    response: Response
  }>
}

/** What every `openapi-fetch` method resolves to, before the union is narrowed. */
type SettledResult = { data?: unknown; error?: unknown; response: Response }

/**
 * Turn one returning method into a throwing one.
 *
 * WHY THROW
 * ---------
 * `openapi-fetch` reports a failure by RESOLVING with `{ error }`. Every
 * consumer in this app is a `try`/`catch` that calls `extractError`. If this
 * transport returned, the migration would not merely be ninety-odd call-site
 * rewrites — every `catch` not yet rewritten would become unreachable, and a
 * failed request would be handled as a successful one with an undefined body.
 * Silent, and everywhere. So the shape callers already understand wins, and the
 * openapi-fetch result shape stops at this function.
 *
 * The cast is the seam: the runtime is untyped inside (it is the same three
 * lines for all five methods), and `ThrowingMethod` states the contract that
 * holds outside. Nothing downstream is widened.
 */
function throwOnFailure<Method extends HttpMethod>(
  call: (url: never, init?: never) => Promise<SettledResult>,
  mutates = false,
): ThrowingMethod<Method> {
  return (async (url: never, init?: never) => {
    let settled: SettledResult
    try {
      settled = await call(url, init)
    } catch (cause) {
      // `fetch` itself rejected: no response, no status, and different words
      // for the player than any server failure.
      throw new ApiNetworkError(cause)
    }
    if (!settled.response.ok) {
      throw new ApiError(settled.response, settled.error)
    }
    // A WRITE INVALIDATES THE CACHED LISTS (#2432, ADR-0072). Signing up for a
    // task, publishing a praxis and archiving one all move a row in the task
    // browse or the praxis feed, and a five-minute stale read of your own
    // action reads as a bug rather than as a cache.
    //
    // Here rather than in each mutating api function because every one of them
    // already passes through this seam, so a route added later cannot forget
    // it. Only a SUCCEEDING write drops — a rejected one threw above and
    // changed nothing. It over-invalidates on purpose: a vote does not change
    // which tasks exist, and one extra refetch is cheaper than an enumeration
    // that rots.
    if (mutates) dropCachesAfterWrite()
    return { data: settled.data, response: settled.response }
  }) as ThrowingMethod<Method>
}

export const apiGet = throwOnFailure<'get'>(client.GET)
export const apiPost = throwOnFailure<'post'>(client.POST, true)
export const apiPut = throwOnFailure<'put'>(client.PUT, true)
export const apiPatch = throwOnFailure<'patch'>(client.PATCH, true)
export const apiDelete = throwOnFailure<'delete'>(client.DELETE, true)
