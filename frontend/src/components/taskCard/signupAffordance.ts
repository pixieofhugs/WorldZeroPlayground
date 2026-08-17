import i18n from "../../i18n";
import type { TaskOut } from "../../api/tasks";
import {
  SIGNUP_CTA_KEY,
  isSignupDenial,
  signupCtaKey,
} from "../../pages/taskDetail/signupCta";

/**
 * What the nine task-card skins draw in their one action slot (#1976).
 *
 * The card used to say "Sign up" and mean it unconditionally: the label was the
 * skin's own flat `feed:taskCard.{F}.signup`, and whether the button existed at
 * all was the LIST's decision, made by withholding `onSignup`. So a card and the
 * detail page for the same task disagreed — the detail page reads
 * `TaskOut.signup_reason` and says "Begin again"; the card said "Sign up". And
 * on the surfaces that pass `onSignup` unconditionally (the field desk) the card
 * offered a button the server was always going to refuse.
 *
 * This is the adapter, not a second mapper: the reason-to-copy question is
 * answered by {@link signupCtaKey}, the same function the eight task-detail
 * archetypes call. What lives here is the card's own two extras — the faction
 * verb, and the fact that a shut sign-up still draws something.
 */
export interface TaskCardSignupCta {
  /** Already resolved copy. The skin renders it; it never picks a key. */
  label: string;
  /**
   * True when the server has shut sign-up. The skin renders the same slot, in
   * the same place, saying WHY instead of offering a claim.
   */
  denied: boolean;
  /**
   * The press handler — **absent iff {@link denied}**, and that is the whole
   * enforcement. A skin spreads this onto its button, so there is no skin in
   * which the dead-ended control can come back: the handler simply is not there
   * to attach. `pages/fieldDesk/PendingRowPill.tsx` states the doctrine — a
   * dead-ended pill that still looks pressable is worse than no pill — and this
   * is the one place a card can honour it for all nine skins at once.
   */
  onPress?: () => void;
}

/**
 * The action slot for one card, or `null` for no slot at all.
 *
 * `null` when the surface did not ask for one (`onSignup` undefined) — a
 * character profile's task list and a faction page's roster are readouts, not
 * claim points, and neither should sprout a refusal. The surfaces that DO ask
 * pass `onSignup` for any signed-in viewer and let this decide; an anonymous
 * viewer has no reason on the wire (the server sends `signup_reason: null` when
 * there is no viewer to explain anything to) and so would only ever be offered
 * a button, which is why those surfaces still gate on the user.
 *
 * The label used to arrive as a `signupLabel` parameter, because the nine
 * `feed:taskCard.{F}.signup` keys were nine — eight of them literally "Sign up"
 * and Albescent's `acknowledge` orphaned by ADR-0048, which makes its card the
 * na sheet plus drift. #1911 collapsed the family to one `feed:taskCard.signup`,
 * so there is no faction verb left for a skin to resolve and the parameter is
 * gone with it: the label is read here, once, for all nine cards.
 */
export function taskCardSignupCta(
  task: TaskOut,
  onSignup: ((id: number) => void) | undefined,
): TaskCardSignupCta | null {
  if (!onSignup) return null;

  if (isSignupDenial(task.signup_reason)) {
    // `level` is only read by `denied.belowLevel`; passing it to the others is
    // free and keeps this a single call rather than a branch per reason.
    const key = signupCtaKey(task.signup_reason);
    return { label: i18n.t(`tasks:${key}`, { level: task.level_required }), denied: true };
  }

  // Shut, with nothing to say about it — hide rather than lie. Reachable two
  // ways: a backend that grows a sixth gate this build has no copy for, and any
  // payload where the two fields disagree. The old behaviour for BOTH was to
  // hide, because the list gated on `can_sign_up` and never asked why; keeping
  // that as the fallback is what makes a new backend reason a missing
  // explanation rather than a live button the server will refuse.
  if (!task.can_sign_up) return null;

  const key = signupCtaKey(task.signup_reason);
  const label =
    key === SIGNUP_CTA_KEY
      ? i18n.t("feed:taskCard.signup")
      : i18n.t(`tasks:${key}`, { level: task.level_required });
  return { label, denied: false, onPress: () => onSignup(task.id) };
}
