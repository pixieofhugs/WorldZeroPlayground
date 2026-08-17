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
 * `signupLabel` is the faction's own verb, resolved by the skin because `t()`
 * takes a typed literal and a `string` parameter here would need a cast that
 * defeats the catalog's key checking.
 *
 * ponytail: `signupLabel` is a parameter only because the nine
 * `feed:taskCard.{F}.signup` keys are still nine — eight of them literally
 * "Sign up", and `locales/__tests__/catalog.test.ts` pins that. #1864 owns
 * collapsing them; when it lands this parameter loses its reason to exist and
 * the plain branch below becomes `i18n.t("tasks:" + SIGNUP_CTA_KEY)` like the
 * other three. Deliberately NOT collapsed here: ADR-0048 keeps
 * `taskCard.albescent.signup` deliberately unsettled, and that is a copy ruling,
 * not a refactor this issue gets to make in passing.
 */
export function taskCardSignupCta(
  task: TaskOut,
  onSignup: ((id: number) => void) | undefined,
  signupLabel: string,
): TaskCardSignupCta | null {
  if (!onSignup) return null;

  const key = signupCtaKey(task.signup_reason);
  if (key === SIGNUP_CTA_KEY) {
    return { label: signupLabel, denied: false, onPress: () => onSignup(task.id) };
  }

  // `level` is only read by `denied.belowLevel`; passing it to the others is
  // free and keeps this a single call rather than a branch per reason.
  const label = i18n.t(`tasks:${key}`, { level: task.level_required });
  return isSignupDenial(task.signup_reason)
    ? { label, denied: true }
    : { label, denied: false, onPress: () => onSignup(task.id) };
}
