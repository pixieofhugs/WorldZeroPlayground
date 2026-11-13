/**
 * The collab pending-publish window as arithmetic (#1080, ADR-0012): opens at
 * `submit_proposed_at` for `era.collab_auto_submit_days`; the next read after it
 * lapses auto-publishes. Duels have no deadline (ADR-0011), so no ring.
 *
 * The duration is never assumed: no config yields `null`, so no clock is drawn.
 */

interface CollabPublishWindow {
  /** Elapsed share, clamped 0–1 (ring sweep). */
  fraction: number;
  daysLeft: number;
  /** Within the final day, 0–23. */
  hoursLeft: number;
  lapsed: boolean;
}

const HOURS_PER_DAY = 24;
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

/** `null` when not pending publish or the config hasn't landed. */
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
