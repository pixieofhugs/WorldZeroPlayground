/**
 * What the `openapi-fetch` transport throws (#1400).
 *
 * Its own module, and deliberately free of any import, because `utils/errors.ts`
 * reads these and `utils/errors.ts` is imported by most of the app. Declaring
 * them inside `client.ts` would put `openapi-fetch` — and the `createClient`
 * call at that module's top level — on the initial-load path of every page, to
 * carry two class declarations. Not the generated schema: `generated/schema.d.ts`
 * is a declaration file, imported `import type`, and weighs nothing at runtime
 * wherever it lands. `openapi-fetch` is the weight.
 *
 * Which is why `client.ts` does not re-export these. One import path, and it is
 * the one that stays cheap.
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
 * ("check your connection", not "the server had a problem"). `extractError`
 * keys that branch off the ABSENCE of a status rather than off this class, so
 * an ordinary throw from outside the transport lands there too.
 *
 * The message was chosen as `'Network Error'` because that is what axios set on
 * the same condition, and for the length of the #1400 migration one string had
 * to read the same from either transport. Nothing matches on it now; it is kept
 * because it is still the right words in a log.
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
