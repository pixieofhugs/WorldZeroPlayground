/**
 * The character-less redirect's path exemptions, kept apart from `Layout`.
 *
 * `Layout`'s effect bounces a signed-in, character-less account to
 * `/characters/create` on every render — a pure predicate is what lets the
 * DOM-less test harness reach that rule, the same move `api/sessionRedirect.ts`
 * makes for the 401 → landing bounce.
 */

/**
 * Paths a character-less account may still reach.
 *
 * `/characters/create` is the onboarding page the redirect exists to send
 * people to. `/settings` joined it in #2849: it is where the app's only
 * sign-out control lives (#2155 moved it off the NavBar), and it is also the
 * only route that reaches Appearance, Cookies and local storage, and the
 * delete-account danger zone. Before this, a character-less account — every
 * new signup between the OAuth callback and creating a character, plus anyone
 * who cancels out of creation or signed in with the wrong provider account —
 * had no route in the app that did not bounce, and the session cookie is
 * httpOnly, so clearing site data was the only escape.
 *
 * A SET, matched whole, not a prefix — the same shape `SESSION_PROBES` in
 * `api/sessionRedirect.ts` uses, and for the same reason: exact intent, no
 * silent widening from a future route that happens to start with the string.
 */
export const CHARACTER_REDIRECT_EXEMPT_PATHS: ReadonlySet<string> = new Set([
  '/characters/create',
  '/settings',
  '/start',
  '/start/again',
])

const CONTRACT_EXEMPT_PATHS: ReadonlySet<string> = new Set(['/start', '/start/again', '/settings'])

/** Where `Layout` sends this render (#3468): no acceptance → the contract, even from creation. */
export function characterRedirectTarget(
  loading: boolean,
  hasUser: boolean,
  hasCharacter: boolean,
  hasAcceptedTerms: boolean,
  pathname: string,
  handoffPending = false,
): '/start' | '/characters/create' | null {
  // `/` renders the welcome flow for a character-less account, which owns contract and creation.
  if (loading || !hasUser || hasCharacter || pathname === '/') return null
  if (!hasAcceptedTerms) return CONTRACT_EXEMPT_PATHS.has(pathname) ? null : '/start'
  // The flow is about to mount at /start and owns creation; a competing navigate would strand its mark.
  if (handoffPending) return null
  return CHARACTER_REDIRECT_EXEMPT_PATHS.has(pathname) ? null : '/characters/create'
}

/** The redirect with acceptance assumed. */
export function needsCharacterRedirect(
  loading: boolean,
  hasUser: boolean,
  hasCharacter: boolean,
  pathname: string,
): boolean {
  return characterRedirectTarget(loading, hasUser, hasCharacter, true, pathname) !== null
}
