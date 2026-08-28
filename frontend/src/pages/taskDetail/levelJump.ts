/**
 * Level-jump affordance predicate (#811/#816).
 *
 * A faction may grant its members a level-jump allowance: once per level they
 * may sign up for a task a fixed number of levels above their own. WOW is the
 * only faction that grants it in Era 1, but the whole point of the config field
 * is that a SECOND faction could gain it without touching this code — so the
 * predicate never compares a slug. It reads only the config-backed fields the
 * backend already computed (`level_jump_reach`, `level_jump_available`) plus the
 * viewer's level and the task's requirement.
 *
 * Eligibility itself is NOT recomputed here. `canSignUp` already trusts the
 * backend's `can_sign_up`, which threads the same reach and is false once
 * the allowance is spent. So a signable task ABOVE the viewer's level can only be
 * signable because of the allowance — that is exactly what this predicate marks.
 * When it returns false (allowance spent, or the task is plainly out of reach)
 * the sign-up CTA does not render at all, so the task reads as locked.
 */
interface LevelJumpSignupParams {
  /** Whether the backend says this viewer may sign up (trusted, not recomputed). */
  canSignUp: boolean;
  /** Levels above own level the viewer's faction grants (0 = no such ability). */
  levelJumpReach: number;
  /** Whether the allowance is unspent at the viewer's current level. */
  levelJumpAvailable: boolean;
  /** The task's required level. */
  taskLevelRequired: number | null | undefined;
  /** The viewer's own level. */
  viewerLevel: number;
}

export function isLevelJumpSignup({
  canSignUp,
  levelJumpReach,
  levelJumpAvailable,
  taskLevelRequired,
  viewerLevel,
}: LevelJumpSignupParams): boolean {
  return (
    canSignUp &&
    levelJumpReach > 0 &&
    levelJumpAvailable &&
    taskLevelRequired != null &&
    taskLevelRequired > viewerLevel
  );
}
