/**
 * The 401 → landing rule, kept apart from any one transport.
 *
 * It lived inside the axios client until #1400 replaced that with an
 * `openapi-fetch` one, and was lifted out here because both were live at once
 * and had to bounce an expired session identically. `./client.ts` is the only
 * caller now, and the rule stays out here anyway: it is a pure predicate, which
 * is what lets the DOM-less test harness reach it, and a transport that owned
 * it privately is what made it drift in the first place. The failure mode of
 * drift is silent — guests stop being able to open any URL but `/`, and nothing
 * throws.
 */

/**
 * The session probes. A 401 from one of these is not a failure — it is the
 * answer "nobody is logged in", which is what the app's first wave asks on every
 * page load.
 *
 * There are two, because the first wave asks two things before it knows who the
 * viewer is: `AuthProvider` asks for the identity, and `SidebarProvider` asks
 * for the rail's panels (#1344). Both go out unconditionally — the JWT is an
 * httpOnly cookie, so the client cannot know synchronously whether anyone is
 * signed in, and asking is the only way to find out.
 *
 * A SET, and matched whole — deliberately not a `/me` prefix. `/me/sidebar` is a
 * probe; `/me/characters` is not, and a 401 from that one really is an expired
 * session and must still bounce.
 */
const SESSION_PROBES = ['/auth/me', '/me/sidebar']

/**
 * If the server says the session has expired, send the user back to the landing
 * page.
 *
 * WHY THE PROBES ARE EXCLUDED
 * ---------------------------
 * The first wave asks whether anyone is signed in, and for a guest the answer is
 * 401. Treating that as an expired session meant every logged-out visitor who
 * opened any URL other than `/` was immediately thrown back to `/` — so no deep
 * link worked for a guest. A shared task link, a praxis permalink, a bookmarked
 * faction page: all of them landed on the homepage instead.
 *
 * It was also expensive. `window.location.href` is a full document navigation,
 * so the visitor paid for the entire bundle, the fonts and every API call a
 * second time before seeing a page they had not asked for.
 *
 * Every future unconditional first-wave fetch has to join `SESSION_PROBES` for
 * the same reason. Adding one without doing so silently restores the bug for
 * every guest, on every URL.
 *
 * The redirect still fires for a session that expires while the app is in use,
 * which is what it was written for.
 *
 * `requestUrl` is matched by substring rather than compared, because what the
 * caller has is the absolute URL `openapi-fetch` puts on its `Request` — the
 * probe path is inside it, not equal to it.
 */
export function shouldReturnToLanding(
  status: number | undefined,
  requestUrl: string,
  pathname: string,
): boolean {
  if (status !== 401) return false
  if (SESSION_PROBES.some((probe) => requestUrl.includes(probe))) return false
  if (pathname.startsWith('/auth')) return false
  return pathname !== '/'
}

/**
 * Apply the rule above to a failed response, reading the current location and
 * navigating if it says so.
 *
 * The half {@link shouldReturnToLanding} cannot cover: it is a pure predicate
 * precisely so the DOM-less test harness can reach it, which leaves the two
 * `window` touches to live somewhere. They live here, once, rather than in each
 * transport's error path.
 */
export function returnToLandingIfSessionExpired(
  status: number | undefined,
  requestUrl: string,
): void {
  if (typeof window === 'undefined') return
  if (shouldReturnToLanding(status, requestUrl, window.location.pathname)) {
    window.location.href = '/'
  }
}
