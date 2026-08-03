/**
 * What the `openapi-fetch` transport throws (#1400).
 *
 * Its own module, and deliberately free of any import, because `utils/errors.ts`
 * reads these and `utils/errors.ts` is imported by most of the app. Declaring
 * them inside `client.ts` would put `openapi-fetch` — and the whole generated
 * schema module — on the initial-load path of every page, to carry two class
 * declarations.
 */

/**
 * A non-2xx answer from the API.
 *
 * `openapi-fetch` reports failures by RETURNING `{ data, error, response }`
 * where axios rejected. Every consumer in this app is a `try`/`catch` around
 * `extractError`, so the helpers in `client.ts` throw this instead: a returning
 * client would not merely need ninety-odd call sites rewritten, it would leave
 * every un-rewritten `catch` unreachable — a failed request reported as a
 * success, with no error anywhere to notice.
 *
 * `data` is the parsed JSON body, or undefined when there wasn't one (a 204, or
 * an HTML error page from a proxy). `status` is always the truth either way.
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
 * The request never got an answer — offline, DNS failure, connection refused,
 * CORS preflight rejected.
 *
 * A separate class rather than an {@link ApiError} with a made-up status,
 * because there genuinely is no status and the player is told something else
 * ("check your connection", not "the server had a problem"). The message is
 * `'Network Error'` to match what axios sets on the same condition, so
 * `extractError`'s existing branch reads both transports without a special case.
 */
export class ApiNetworkError extends Error {
  /**
   * Whatever `fetch` rejected with — a `TypeError` in every browser, but not
   * worth insisting on. Declared as an own field rather than passed to
   * `super(message, { cause })`, because `Error.cause` arrived in ES2022 and
   * this project's `lib` is ES2020.
   */
  readonly cause: unknown

  constructor(cause: unknown) {
    super('Network Error')
    this.name = 'ApiNetworkError'
    this.cause = cause
  }
}
