/**
 * Which label the sign-up call to action wears (#1497).
 *
 * The task detail used to AND its own "am I already on this" check into
 * `canSignUp`, which is the client-side mirror of a server rule — the shape
 * #1385 deleted elsewhere in this codebase after finding it did not actually
 * match the server. It does not match here either: a faction may grant
 * `can_hold_multiple_memberships` (Double Dipper), and for its members holding a
 * membership does not close the gate at all. The mirror hid a sign-up button the
 * server was perfectly willing to honour.
 *
 * So the reason comes down the wire on `TaskOut.signup_reason` and this maps it
 * to a copy key. Nothing here re-derives eligibility — `can_sign_up` is
 * still the only thing that decides whether the CTA renders; this only decides
 * what it says once it does. No slug is compared: a second faction gaining the
 * ability changes the backend's answer and nothing in this file.
 */

/** The server's word for "you are on this already, and your faction lets you go again". */
export const SIGNUP_REASON_MULTI_MEMBERSHIP = "multi_membership";

/**
 * Whether the sign-up CTA renders at all.
 *
 * The guarantee is the *signature*: this cannot consult the viewer's membership,
 * their drafts or their filed praxis, because it is never given them. Those were
 * the terms of the deleted mirror, and a regression that re-adds one has to widen
 * this interface to do it — which is a visible change rather than a silent
 * `&& !isInProgress` slipped back into a long boolean.
 */
export function canSignUpForTask(params: {
  /** Whether anyone is signed in at all. */
  signedIn: boolean;
  /** The server's ruling — `TaskOut.can_sign_up`, trusted, not recomputed. */
  canSignUp: boolean | undefined;
}): boolean {
  return params.signedIn && !!params.canSignUp;
}

const CTA_KEY = "detail.signup.cta" as const;
const CTA_AGAIN_KEY = "detail.signup.ctaAgain" as const;

export type SignupCtaKey = typeof CTA_KEY | typeof CTA_AGAIN_KEY;

/**
 * The i18n key for the sign-up button, given the server's `signup_reason`.
 *
 * The return is the literal union rather than `string` so `t()` still checks it
 * against the catalog — a key typo stays a compile error, which is the whole
 * point of the typed catalog.
 *
 * Undefined and null get the same answer as any unrecognised reason: the plain
 * CTA. A reason this build has never heard of must not blank the button.
 */
export function signupCtaKey(
  signupReason: string | null | undefined,
): SignupCtaKey {
  return signupReason === SIGNUP_REASON_MULTI_MEMBERSHIP
    ? CTA_AGAIN_KEY
    : CTA_KEY;
}
