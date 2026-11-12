/**
 * The danger zone's logic (#2161), kept out of the component so the DOM-less
 * harness can reach it (same move as `AuthContext.runSignOut`).
 */

/**
 * The key is the EMAIL, not a character name (#2161 correction 1): one life's
 * name must not end every life on the account. Trimmed and case-folded for phone
 * keyboards. An empty email (no OAuth row) never matches.
 */
export function emailAuthorises(typed: string, email: string): boolean {
  const target = email.trim().toLowerCase()
  return target !== '' && typed.trim().toLowerCase() === target
}

/**
 * The lives this ends (#2161 correction 2), as a shape so the component can map
 * each `kind` to a literal catalog key. `GET /me/characters` lists the carried
 * life first, so `name` is the one the player recognises.
 */
export type LivesEnding =
  | { kind: 'none' }
  | { kind: 'only'; name: string }
  | { kind: 'more'; name: string; others: readonly string[] }

export function livesEnding(names: readonly string[]): LivesEnding {
  if (names.length === 0) return { kind: 'none' }
  if (names.length === 1) return { kind: 'only', name: names[0] }
  return { kind: 'more', name: names[0], others: names.slice(1) }
}

/** Farewell-chunk wait before signing out without it. */
export const FAREWELL_WAIT_MS = 3000

/**
 * Delete → load farewell → land → sign out.
 *
 * The farewell loads BEFORE sign-out (#3134): `/goodbye` is lazy, and a logout
 * answering while Settings is still mounted lets `ProtectedRoute` bounce the
 * reader to `/`. This narrows the race (`React.lazy` still suspends one tick);
 * only the order is guaranteed. A failed or stalled load (`FAREWELL_WAIT_MS`)
 * skips the navigation but still signs out: no live cookie on a dead account.
 *
 * `inFlight` (a caller-owned ref; this closure is rebuilt per render) is the only
 * guard against a second `DELETE`, which would 401. Released only on failure.
 * `POST /auth/logout` needs no auth, so it works on the inert JWT.
 */
export function runDeleteAccount(
  endAccount: () => Promise<void>,
  signOut: () => Promise<void>,
  loadFarewell: () => Promise<unknown>,
  landOnFarewell: () => void,
  reportFailure: (message: string) => void,
  describeFailure: (error: unknown) => string,
  inFlight: { current: boolean },
  onDeleted: () => void,
): () => Promise<void> {
  return async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      await endAccount()
    } catch (error) {
      inFlight.current = false
      reportFailure(describeFailure(error))
      return
    }
    // Account gone: close the dialog whatever happens next.
    onDeleted()
    const loaded = await Promise.race([
      loadFarewell().then(
        () => true,
        () => false,
      ),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), FAREWELL_WAIT_MS)),
    ])
    if (loaded) landOnFarewell()
    await signOut()
  }
}
