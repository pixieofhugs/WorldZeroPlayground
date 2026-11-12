/**
 * What the transport throws (#1400). Import-free and not re-exported by
 * `client.ts`: `utils/errors.ts` (imported app-wide) reads these, and pulling
 * in `openapi-fetch` would put it on every page's initial load.
 */

/**
 * A non-2xx answer; why throw, see `throwOnFailure` in `client.ts`. `data` is
 * the parsed body, or undefined (204, proxy HTML); `status` is always true.
 */
export class ApiError<TBody = unknown> extends Error {
  readonly status: number
  readonly data: TBody | undefined
  readonly response: Response

  constructor(response: Response, data: TBody | undefined) {
    super(`Request failed with status ${response.status}`)
    this.name = 'ApiError'
    this.status = response.status
    this.data = data
    this.response = response
  }
}

/**
 * No answer at all (offline, DNS, CORS). No status, different copy.
 * `extractError` keys off the ABSENCE of a status, not this class.
 */
export class ApiNetworkError extends Error {
  /** Own field, not `super(msg, { cause })`: `lib` is ES2020. */
  readonly cause: unknown

  constructor(cause: unknown) {
    super('Network Error')
    this.name = 'ApiNetworkError'
    this.cause = cause
  }
}
