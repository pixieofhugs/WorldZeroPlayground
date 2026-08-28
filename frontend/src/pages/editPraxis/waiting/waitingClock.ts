/**
 * The collab publish window, as arithmetic (#1080).
 *
 * ADR-0012: a member's cast opens a **pending-publish** window of
 * `era.collab_auto_submit_days`, stamped on the praxis as `submit_proposed_at`.
 * When it lapses with no edit, the next read of the praxis auto-publishes it —
 * silence is consent. That pair of facts is the only real deadline anywhere in
 * the multi-party flow, which is why the waiting surface draws a ring for a
 * collab and nothing of the sort for a duel (epic #1071, decisions 4 and 5:
 * `Duel` has no expiry field, `EraConfig` has no duel duration, there is no
 * scheduler, and ADR-0011 rejects per-duel windows by name).
 *
 * Pure, and separated from the component on purpose: the frontend test harness
 * is `renderToStaticMarkup` with no DOM and no effects, so anything that has to
 * be *checked* rather than *looked at* has to be reachable without rendering.
 *
 * The duration is never assumed. `collab_auto_submit_days` arrives from
 * `/game-config` (it is an `EraConfig` field and a future era may change it), so
 * a missing config yields `null` and the surface draws no clock at all rather
 * than a confident wrong number.
 */

interface CollabPublishWindow {
  /** How much of the window is gone, clamped to 0–1. Drives the ring sweep. */
  fraction: number;
  /** Whole days left. */
  daysLeft: number;
  /** Hours left within the final day, 0–23. */
  hoursLeft: number;
  /** The window has run out; the next read of the praxis publishes it. */
  lapsed: boolean;
}

const HOURS_PER_DAY = 24;
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

/**
 * Resolve the pending-publish window, or `null` when it cannot be known —
 * either the praxis is not pending publish (`submitProposedAt` is null) or the
 * game config has not landed yet.
 */
export function collabPublishWindow(
  submitProposedAt: string | null | undefined,
  autoSubmitDays: number | null | undefined,
  now: number = Date.now(),
): CollabPublishWindow | null {
  if (!submitProposedAt) return null;
  if (autoSubmitDays == null || autoSubmitDays <= 0) return null;
  const openedAt = new Date(submitProposedAt).getTime();
  if (Number.isNaN(openedAt)) return null;

  const totalHours = autoSubmitDays * HOURS_PER_DAY;
  const elapsedHours = (now - openedAt) / MILLISECONDS_PER_HOUR;
  const remainingHours = Math.max(0, totalHours - elapsedHours);
  const fraction = Math.min(1, Math.max(0, elapsedHours / totalHours));

  return {
    fraction,
    daysLeft: Math.floor(remainingHours / HOURS_PER_DAY),
    hoursLeft: Math.floor(remainingHours % HOURS_PER_DAY),
    lapsed: remainingHours <= 0,
  };
}
