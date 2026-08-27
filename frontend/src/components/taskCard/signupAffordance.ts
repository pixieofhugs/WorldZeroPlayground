import i18n from "../../i18n";
import type { TaskOut } from "../../api/tasks";
import {
  SIGNUP_CTA_KEY,
  SIGNUP_IN_PROGRESS_KEY,
  SIGNUP_REASON_ALREADY_ACTIVE_MEMBER,
  SIGNUP_SUBMITTED_KEY,
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
   * The press handler — **absent iff the slot does not sign up**, and that is
   * the whole enforcement. A skin never attaches it itself: `CardCtaControl`
   * spreads it, so there is no skin in which the dead-ended control can come
   * back, because the handler simply is not there to attach.
   * `pages/fieldDesk/PendingRowPill.tsx` states the doctrine — a dead-ended
   * pill that still looks pressable is worse than no pill — and that component
   * is the one place a card can honour it for all nine skins at once.
   *
   * It used to be "absent iff {@link denied}". {@link href} is the third state
   * that made that biconditional false: a slot that is neither a refusal nor a
   * sign-up.
   */
  onPress?: () => void;
  /**
   * Where the slot GOES instead of what it posts (#2359, #2643) — a router
   * path, set on exactly one reason: `already_active_member` with a praxis to
   * land on. Two destinations, one reason: a draft's editor, or a filed
   * praxis's read page.
   *
   * Never set together with {@link onPress}. Navigating to your own praxis is
   * not signing up: the server has refused the claim and is right to, and the
   * praxis this reaches already exists.
   */
  href?: string;
}

/**
 * The action slot for one card, or `null` for no slot at all.
 *
 * A TASK CARD OFFERS THE TASK, EVERYWHERE IT APPEARS (owner ruling, #2188).
 * This used to read that a character profile's task list and a faction page's
 * roster were "readouts, not claim points" — a distinction the PAGE invented,
 * which the card, the wire and the server all disagreed with. Both of those
 * surfaces pass `onSignup` now, so every mount of every skin asks this
 * function, and the answer is the same one `/tasks` gets.
 *
 * Two things still return `null`, and neither is a surface's opinion:
 *
 * ① The anonymous viewer, for whom every caller withholds `onSignup`. The
 *    server sends `signup_reason: null` when there is no viewer to explain
 *    anything to, so there is no refusal to draw — only a button that would
 *    bounce them to a login. That gate is on the USER and never on
 *    `can_sign_up`: gating on the flag is exactly what made `/tasks` go silent
 *    about tasks it was still showing (#1976).
 *
 * ② The backend reason this build has no copy for — the fallback further down.
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
    // THE ONE REFUSAL THAT IS A DOOR (#2359, #2643). `already_active_member`
    // means the viewer holds a praxis on this task, so the card was spending its
    // only slot telling them something they knew, with the useful thing one
    // press away. The wire carries that praxis's id now, and the slot becomes a
    // link to it — pressable, and NOT a sign-up (the server has refused the
    // claim and is right to; the praxis already exists).
    //
    // ONE REASON, TWO DOORS, chosen by which id the row carries and never by a
    // second reason value — the server sends `already_active_member` for a
    // draft and for a filed praxis alike, because both shut sign-up for the
    // same rule. The ids are what tell them apart:
    //
    // * an OPEN DRAFT goes to its editor, and takes precedence when a viewer
    //   somehow holds both (Double Dipper can leave one of each): the draft is
    //   the one with work left in it.
    // * a FILED praxis goes to its READ page, never `/edit` — that redirects a
    //   submitted praxis straight back to `/praxis/:id` (#1164, #1397), so an
    //   edit link here would be a control that changes nothing.
    //
    // The null-null branch falls through to the label below, and it is
    // REACHABLE rather than defensive: the denial's population also covers a
    // `pending` praxis, which shuts sign-up while awaiting moderation with
    // nothing to edit and nothing to read.
    if (task.signup_reason === SIGNUP_REASON_ALREADY_ACTIVE_MEMBER) {
      if (task.in_progress_praxis_id != null) {
        return {
          label: i18n.t(`tasks:${SIGNUP_IN_PROGRESS_KEY}`),
          denied: false,
          href: `/praxis/${task.in_progress_praxis_id}/edit`,
        };
      }
      if (task.submitted_praxis_id != null) {
        return {
          label: i18n.t(`tasks:${SIGNUP_SUBMITTED_KEY}`),
          denied: false,
          href: `/praxis/${task.submitted_praxis_id}`,
        };
      }
    }
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
