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

/** The server's word for "you hold an open praxis on this task, so you may not claim it again". */
export const SIGNUP_REASON_ALREADY_ACTIVE_MEMBER = "already_active_member";

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

export const SIGNUP_CTA_KEY = "detail.signup.cta" as const;
const CTA_AGAIN_KEY = "detail.signup.ctaAgain" as const;

/**
 * What the ONE denial with a way out of it says instead (#2359).
 *
 * `already_active_member` is a refusal that names a draft: the server is saying
 * *you are mid-praxis on this task*, which is the moment its editor is the most
 * useful thing on screen. Where a surface can reach that editor
 * (`TaskOut.in_progress_praxis_id`), it offers this instead of
 * `denied.alreadyActiveMember`, and the affordance is a link rather than a
 * refusal.
 *
 * IT LIVES HERE, in the shared file, for the reason `DENIAL_KEYS` gives above:
 * two surfaces saying different words is a copy edit inside this table, and two
 * TABLES is the drift #1497 built the file to end. The task detail's own
 * in-progress block is a separate thing on a separate key
 * (`detail.inProgress.*`, with "Continue editing" and "drop") and is untouched.
 */
export const SIGNUP_IN_PROGRESS_KEY = "detail.signup.workOnThis" as const;

/**
 * What that SAME denial says when the praxis behind it is already filed (#2643).
 *
 * `already_active_member` covers a submitted praxis too, and there the key above
 * does not apply: there is no draft, and `/edit` redirects a submitted praxis
 * straight back to its read page (#1164, #1397). What is useful is READING it,
 * which is what the task detail has always offered on this very key — so the
 * card borrows the detail's own words rather than minting a card-sized synonym.
 *
 * IT IS THE `detail.submitted.*` KEY, not a `detail.signup.*` one, and that is
 * deliberate: the copy already existed and the owner ruling (2026-08-24) was
 * that it is the right copy for both surfaces. A second string saying the same
 * thing is how the two would drift apart on the next edit.
 *
 * A ROW, not a branch, for `DENIAL_KEYS`'s reason. This key and the one above
 * are chosen by which praxis id the wire carries, not by a second reason value
 * — the server sends one reason for both, and the ids are what distinguish
 * them.
 */
export const SIGNUP_SUBMITTED_KEY = "detail.submitted.view" as const;

/**
 * Every reason sign-up is SHUT, mapped to the copy that says so (#1976).
 *
 * The left column is `services/praxis.py`'s `SignupDenialReason`, value for
 * value — the wire's own spelling, so a new gate on the backend shows up here
 * as a missing row rather than as a silently generic button. Anything not in
 * this table is not a denial, which is what {@link isSignupDenial} means; the
 * fallthrough in {@link signupCtaKey} then treats it as the plain CTA, because
 * a reason this build has never heard of must not blank the button.
 *
 * These live in the SAME map as the permitting keys on purpose. The task detail
 * hides its CTA outright when sign-up is shut, so only the card renders these
 * today — but a card that said "Must be level 4" out of its own private table
 * while the detail page said something else is the exact drift #1497 built this
 * file to end. If the card ever needs shorter words than the detail page, that
 * is a copy edit inside this table, not a second table.
 */
const DENIAL_KEYS = {
  below_level: "detail.signup.denied.belowLevel",
  task_status_closed: "detail.signup.denied.taskStatusClosed",
  already_active_member: "detail.signup.denied.alreadyActiveMember",
  bank_full: "detail.signup.denied.bankFull",
  is_metatask: "detail.signup.denied.isMetatask",
} as const;

export type SignupDenialKey = (typeof DENIAL_KEYS)[keyof typeof DENIAL_KEYS];

export type SignupCtaKey =
  | typeof SIGNUP_CTA_KEY
  | typeof CTA_AGAIN_KEY
  | typeof SIGNUP_IN_PROGRESS_KEY
  | typeof SIGNUP_SUBMITTED_KEY
  | SignupDenialKey;

/**
 * Whether the server's reason is a DENIAL — i.e. whether the affordance may be
 * pressed at all.
 *
 * A caller asks this rather than comparing `can_sign_up`, because the reason is
 * the thing it also needs for the label, and two reads of two fields can
 * disagree. Nothing is re-derived: the answer is a lookup in the table above,
 * which is the backend's own enum.
 */
export function isSignupDenial(
  signupReason: string | null | undefined,
): boolean {
  return !!signupReason && signupReason in DENIAL_KEYS;
}

/**
 * The i18n key for the sign-up button, given the server's `signup_reason`.
 *
 * The return is the literal union rather than `string` so `t()` still checks it
 * against the catalog — a key typo stays a compile error, which is the whole
 * point of the typed catalog.
 *
 * `detail.signup.denied.belowLevel` is the one key with an interpolation: it
 * wants `{ level }`, and `TaskOut.level_required` is on the card payload as
 * well as the detail one, so no caller has to go and fetch it.
 *
 * Undefined and null get the same answer as any unrecognised reason: the plain
 * CTA.
 */
export function signupCtaKey(
  signupReason: string | null | undefined,
): SignupCtaKey {
  if (signupReason && signupReason in DENIAL_KEYS) {
    return DENIAL_KEYS[signupReason as keyof typeof DENIAL_KEYS];
  }
  return signupReason === SIGNUP_REASON_MULTI_MEMBERSHIP
    ? CTA_AGAIN_KEY
    : SIGNUP_CTA_KEY;
}
