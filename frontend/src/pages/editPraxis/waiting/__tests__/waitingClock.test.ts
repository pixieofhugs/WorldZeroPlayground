/**
 * The ADR-0012 pending-publish window (#1080).
 *
 * The duration is an `EraConfig` value that arrives over the wire
 * (`collab_auto_submit_days`), so the arithmetic must never assume one — the
 * "no config" case is a rendered blank, not a fallback number.
 */
import { describe, it, expect } from "vitest";
import { collabPublishWindow } from "../waitingClock";

const OPENED = "2026-01-01T00:00:00Z";
const OPENED_MS = Date.parse(OPENED);
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe("collabPublishWindow", () => {
  it("reports days and hours left from the era's own window length", () => {
    const window = collabPublishWindow(OPENED, 10, OPENED_MS + 3 * DAY + 5 * HOUR);
    expect(window).toEqual({
      fraction: expect.closeTo((3 * 24 + 5) / 240, 5),
      daysLeft: 6,
      hoursLeft: 19,
      lapsed: false,
    });
  });

  it("sweeps the ring from empty at the moment the window opens", () => {
    expect(collabPublishWindow(OPENED, 10, OPENED_MS)?.fraction).toBe(0);
    expect(collabPublishWindow(OPENED, 10, OPENED_MS)?.daysLeft).toBe(10);
  });

  it("uses a different era's window length, never a hardcoded ten", () => {
    // Same instant, half the window: the reading has to move with the config.
    expect(collabPublishWindow(OPENED, 4, OPENED_MS + 1 * DAY)?.daysLeft).toBe(3);
    expect(collabPublishWindow(OPENED, 10, OPENED_MS + 1 * DAY)?.daysLeft).toBe(9);
  });

  it("clamps at the end — the next read auto-publishes, so nothing goes negative", () => {
    const window = collabPublishWindow(OPENED, 10, OPENED_MS + 40 * DAY);
    expect(window).toEqual({ fraction: 1, daysLeft: 0, hoursLeft: 0, lapsed: true });
  });

  it("is null when the praxis is not pending publish", () => {
    expect(collabPublishWindow(null, 10, OPENED_MS)).toBeNull();
    expect(collabPublishWindow(undefined, 10, OPENED_MS)).toBeNull();
  });

  it("is null until the game config lands — no assumed duration", () => {
    expect(collabPublishWindow(OPENED, null, OPENED_MS)).toBeNull();
    expect(collabPublishWindow(OPENED, undefined, OPENED_MS)).toBeNull();
    expect(collabPublishWindow(OPENED, 0, OPENED_MS)).toBeNull();
  });

  it("is null for an unparseable stamp rather than rendering NaN", () => {
    expect(collabPublishWindow("not-a-date", 10, OPENED_MS)).toBeNull();
  });
});
