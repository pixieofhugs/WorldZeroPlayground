/**
 * The typed API transport (#1400): openapi-fetch over the generated `paths`,
 * so a changed route is a compile error. Each convention here (`credentials`,
 * the 401 rule, query serialization) fails as a wrong 200 if dropped.
 */
import createClient, {
  type ClientPathsWithMethod,
  type MaybeOptionalInit,
  type MethodResponse,
} from 'openapi-fetch'

import { ApiError, ApiNetworkError } from './apiError'
import { API_BASE_URL } from './baseUrl'
import { dropCachesAfterWrite } from '../utils/resourceCache'
import type { paths } from './generated/schema'
import { returnToLandingIfSessionExpired } from './sessionRedirect'

const client = createClient<paths>({
  baseUrl: API_BASE_URL,
  // JWT is an httpOnly cookie; without this calls go out anonymous.
  credentials: 'include',
})

/**
 * 401 → landing (`./sessionRedirect.ts`), as middleware so it covers every
 * request. `request.url` is absolute; the probe check matches by substring.
 */
client.use({
  onResponse({ request, response }) {
    returnToLandingIfSessionExpired(response.status, request.url)
  },
})

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

/** `MaybeOptionalInit` already unions `undefined` in when nothing is needed. */
type InitArgs<Init> = undefined extends Init ? [init?: Init] : [init: Init]

/** `client.GET` etc.'s signature, resolving to the success branch only. */
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

type SettledResult = { data?: unknown; error?: unknown; response: Response }

/**
 * openapi-fetch RESOLVES failures with `{ error }`; every consumer here is a
 * `try`/`catch` around `extractError`, so not throwing would treat failures as
 * successes. The cast is the seam; `ThrowingMethod` is the outside contract.
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
      // `fetch` rejected: no response; distinct copy from a server failure.
      throw new ApiNetworkError(cause)
    }
    if (!settled.response.ok) {
      throw new ApiError(settled.response, settled.error)
    }
    // A succeeding write drops the cached lists (#2432, ADR-0072), here so no
    // route can forget. Over-invalidates on purpose: cheaper than an enumeration.
    if (mutates) dropCachesAfterWrite()
    return { data: settled.data, response: settled.response }
  }) as ThrowingMethod<Method>
}

export const apiGet = throwOnFailure<'get'>(client.GET)
export const apiPost = throwOnFailure<'post'>(client.POST, true)
export const apiPut = throwOnFailure<'put'>(client.PUT, true)
export const apiPatch = throwOnFailure<'patch'>(client.PATCH, true)
export const apiDelete = throwOnFailure<'delete'>(client.DELETE, true)
