/**
 * The leave → sign out sequence behind the Settings button (#3099), kept out of
 * the component so the DOM-less harness can reach it — same move as
 * `deleteAccount.runDeleteAccount`.
 *
 * ORDER IS LOAD-BEARING. `/settings` is a `ProtectedRoute`, so dropping the
 * session while still on it bounces the reader to `/?login=required` and tells
 * someone who just signed out on purpose that they need to log in. The
 * navigation goes in before `signOut` is awaited.
 *
 * Not folded into `AuthContext.signOut`: the delete flow routes through that
 * too and has to land on `/goodbye`, not `/`.
 *
 * A failed `POST /auth/logout` is not handled here: the reader is already on
 * `/`, still signed in, and the rejection propagates to the caller as it did
 * before.
 */
export function runSettingsSignOut(
  leaveForLanding: () => void,
  signOut: () => Promise<void>,
): () => Promise<void> {
  return async () => {
    leaveForLanding()
    await signOut()
  }
}
