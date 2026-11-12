/**
 * Level-jump affordance predicate (#811/#816). Config-driven, never a slug
 * compare. Eligibility is the backend's `can_sign_up`; a signable task above the
 * viewer's level can only be signable via the allowance, which is what this marks.
 */
interface LevelJumpSignupParams {
  /** Backend's `can_sign_up` (trusted, not recomputed). */
  canSignUp: boolean;
  /** Levels above own level the faction grants (0 = none). */
  levelJumpReach: number;
  /** Whether the allowance is unspent at the viewer's current level. */
  levelJumpAvailable: boolean;
  taskLevelRequired: number | null | undefined;
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
