/**
 * Maps the server's `TaskOut.signup_reason` to the sign-up CTA's copy key (#1497).
 * Never re-derives eligibility client-side (e.g. "already on this"): factions
 * with `can_hold_multiple_memberships` may sign up again. `can_sign_up` alone
 * decides whether the CTA renders. No slug compares.
 */

/** "You are on this already, and your faction lets you go again." */
export const SIGNUP_REASON_MULTI_MEMBERSHIP = "multi_membership";

/** "You hold an open praxis on this task." */
export const SIGNUP_REASON_ALREADY_ACTIVE_MEMBER = "already_active_member";

/**
 * Whether the sign-up CTA renders at all. The signature is the guarantee: it is
 * never given membership or drafts, so re-adding a client mirror means widening it.
 */
export function canSignUpForTask(params: {
  signedIn: boolean;
  /** `TaskOut.can_sign_up`, trusted, not recomputed. */
  canSignUp: boolean | undefined;
}): boolean {
  return params.signedIn && !!params.canSignUp;
}

export const SIGNUP_CTA_KEY = "detail.signup.cta" as const;
const CTA_AGAIN_KEY = "detail.signup.ctaAgain" as const;

/**
 * `already_active_member` with a reachable draft (`in_progress_praxis_id`):
 * offered as a link to the editor instead of a refusal (#2359). Kept in this
 * shared file so surfaces can't drift (#1497).
 */
export const SIGNUP_IN_PROGRESS_KEY = "detail.signup.workOnThis" as const;

/**
 * The same reason when the praxis is already filed (`submitted_praxis_id`):
 * read it, since `/edit` bounces a submitted praxis (#2643). Deliberately the
 * existing `detail.submitted.*` copy (owner ruling). The ids, not a second
 * reason value, choose between this key and the one above.
 */
export const SIGNUP_SUBMITTED_KEY = "detail.submitted.view" as const;

/**
 * Every reason sign-up is SHUT → its copy (#1976). Keys mirror `services/praxis.py`
 * `SignupDenialReason` value for value. An unknown reason is not a denial and
 * gets the plain CTA, so a new backend reason never blanks the button. One map
 * for card and detail, so their wording can't drift (#1497).
 */
const DENIAL_KEYS = {
  below_level: "detail.signup.denied.belowLevel",
  task_status_closed: "detail.signup.denied.taskStatusClosed",
  already_active_member: "detail.signup.denied.alreadyActiveMember",
  bank_full: "detail.signup.denied.bankFull",
  is_metatask: "detail.signup.denied.isMetatask",
} as const;

type SignupDenialKey = (typeof DENIAL_KEYS)[keyof typeof DENIAL_KEYS];

type SignupCtaKey =
  | typeof SIGNUP_CTA_KEY
  | typeof CTA_AGAIN_KEY
  | typeof SIGNUP_IN_PROGRESS_KEY
  | typeof SIGNUP_SUBMITTED_KEY
  | SignupDenialKey;

/**
 * Whether the reason is a DENIAL. Ask this rather than `can_sign_up`: the label
 * comes from the reason too, and two fields can disagree.
 */
export function isSignupDenial(
  signupReason: string | null | undefined,
): boolean {
  return !!signupReason && signupReason in DENIAL_KEYS;
}

/**
 * The i18n key for the sign-up button. Returns the literal union so `t()` still
 * type-checks it. `denied.belowLevel` wants `{ level }` (`TaskOut.level_required`).
 * Null/unknown reasons get the plain CTA.
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
