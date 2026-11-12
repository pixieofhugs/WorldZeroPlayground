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
 * What the nine task-card skins draw in their one action slot (#1976). Adapter
 * over {@link signupCtaKey} (shared with task detail), so card and detail agree.
 */
export interface TaskCardSignupCta {
  /** Resolved copy; the skin never picks a key. */
  label: string;
  /** Server shut sign-up; the same slot says WHY instead. */
  denied: boolean;
  /**
   * Absent iff the slot does not sign up: `CardCtaControl` spreads it, so no
   * skin can attach a dead-ended control (cf. `PendingRowPill.tsx`).
   */
  onPress?: () => void;
  /**
   * Router path for `already_active_member` with a praxis to land on (#2359,
   * #2643): the draft's editor or the filed praxis. Never with {@link onPress}.
   */
  href?: string;
}

/**
 * The action slot for one card, or `null` for none. Every mount offers the task
 * (owner ruling, #2188). `null` only for the anonymous viewer (callers withhold
 * `onSignup`; gate on the user, never `can_sign_up`, #1976) and for a reason
 * this build has no copy for.
 */
export function taskCardSignupCta(
  task: TaskOut,
  onSignup: ((id: number) => void) | undefined,
): TaskCardSignupCta | null {
  if (!onSignup) return null;

  if (isSignupDenial(task.signup_reason)) {
    // The refusal that is a door (#2359, #2643); the ids pick the door. A draft
    // wins if both exist (Double Dipper). A filed praxis goes to its read page:
    // `/edit` bounces it back (#1164). Neither id = a `pending` praxis, which
    // falls through to the label.
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
    // `level` is only read by `denied.belowLevel`; harmless elsewhere.
    const key = signupCtaKey(task.signup_reason);
    return { label: i18n.t(`tasks:${key}`, { level: task.level_required }), denied: true };
  }

  // Shut with no copy (a new backend reason, or fields disagreeing): hide.
  if (!task.can_sign_up) return null;

  const key = signupCtaKey(task.signup_reason);
  const label =
    key === SIGNUP_CTA_KEY
      ? i18n.t("feed:taskCard.signup")
      : i18n.t(`tasks:${key}`, { level: task.level_required });
  return { label, denied: false, onPress: () => onSignup(task.id) };
}
