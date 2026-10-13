/**
 * The two decisions behind the delete-account danger zone (#2161), kept out of
 * the component so they are reachable from this repo's DOM-less test harness.
 *
 * `renderToStaticMarkup` runs no effects and dispatches no events, so a handler
 * closed over inside a component can never be exercised. Same move as
 * `AuthContext.runSignOut` and `ReturningCard.runStartFresh`, for the same
 * reason.
 */

/**
 * Does the typed string authorise ending this account?
 *
 * THE KEY IS THE EMAIL, NOT A CHARACTER NAME (#2161 correction 1). The design
 * asked for the character name; an account can carry several lives, so one
 * life's name authorising the end of all of them is the wrong key. The email is
 * the account's actual name and it is the thing being deleted. It is also
 * longer to type on a phone, which for this button is a feature — and it
 * removes the drawn version's nastiest edge, where a player with a short
 * character name bought less friction than one with a long one.
 *
 * Trimmed and case-folded because a mobile keyboard capitalises the first
 * letter and pastes drag whitespace, and neither is a different account.
 *
 * An account with no email on the wire can never match: `""` would otherwise
 * make an untouched field authorise the deletion. `CurrentUser.email` defaults
 * to `""` for an account holding no OAuth row, so this is reachable rather than
 * theoretical — see the danger zone, which hides the control in that case
 * instead of rendering one that can never be armed.
 */
export function emailAuthorises(typed: string, email: string): boolean {
  const target = email.trim().toLowerCase()
  return target !== '' && typed.trim().toLowerCase() === target
}

/**
 * What the dialog has to say about the lives this ends (#2161 correction 2).
 *
 * NOTHING ON THE DRAWN SHEET TOLD YOU THIS. Deleting an account takes
 * characters a player may not have thought about in months, and the design's
 * dialog never mentioned them. So the sentence names the carried life and
 * counts the rest, and the caller lists the rest by name underneath — "how many
 * end, by name" matters more here than the confirm string does.
 *
 * A shape rather than a rendered string: the component maps each `kind` to a
 * catalog key written out literally, which is the repo's rule for keys (a typo
 * fails the build, and a locale grep can see them).
 *
 * The roster arrives carried-life-first from `GET /me/characters`, so `name` is
 * the life the player is holding right now — the one they will recognise.
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

/**
 * The delete → load → land → sign out sequence.
 *
 * THE FAREWELL IS LOADED BEFORE THE SESSION IS DROPPED (#3134). `/settings` is
 * a `ProtectedRoute` and `/goodbye` is a lazy chunk: navigate with the chunk
 * still on the wire and the router holds Settings mounted while it suspends,
 * so a logout that answers first lets the guard send the reader to plain `/`.
 * Awaiting `loadFarewell` first means the navigation has nothing to wait for,
 * and it still goes in ahead of `signOut` so the guard is gone by the time the
 * viewer is.
 *
 * A chunk that fails to load does not stop the sign-out: the account is
 * already tombstoned, and a live cookie on a dead account is worse than a
 * missed farewell. It does skip the navigation — the page could not be loaded,
 * so the guard's own redirect to `/` is the better landing.
 *
 * The sign-out is a plain `POST /auth/logout`, not a special case: `DELETE
 * /me/account` leaves the JWT inert but does not clear the cookie, and
 * `routers/auth.py::auth_logout` takes no auth dependency, so it succeeds
 * either way. A failure there is reported, not swallowed silently, but it does
 * not un-delete the account — hence the ordering above stands.
 *
 * Nothing is retried and nothing is queued: the request either tombstoned the
 * account or it did not, and the dialog stays open with the reason when it did
 * not.
 */
export function runDeleteAccount(
  endAccount: () => Promise<void>,
  signOut: () => Promise<void>,
  loadFarewell: () => Promise<unknown>,
  landOnFarewell: () => void,
  reportFailure: (message: string) => void,
  describeFailure: (error: unknown) => string,
): () => Promise<void> {
  return async () => {
    try {
      await endAccount()
    } catch (error) {
      reportFailure(describeFailure(error))
      return
    }
    const loaded = await loadFarewell().then(
      () => true,
      () => false,
    )
    if (loaded) landOnFarewell()
    await signOut()
  }
}
