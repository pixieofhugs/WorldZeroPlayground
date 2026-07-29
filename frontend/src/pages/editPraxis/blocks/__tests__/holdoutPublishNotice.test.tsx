/**
 * The holdout's countdown (#1164).
 *
 * `renderToStaticMarkup` only — no DOM, no effects — so the window length and
 * the clock are props. That is the same reason the waiting surface takes them:
 * a self-fetching countdown could not be asserted on at all.
 *
 * The three rules under test are the three the issue named, and each one has a
 * way of failing quietly: showing the line to the wrong viewer, showing it
 * before anyone has submitted (there is no window yet), and inventing a
 * duration rather than reading the era's.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../../i18n";
import type { PraxisMemberOut } from "../../../../api/praxis";
import { collabCopy } from "../../../../components/collab/collabCopy";
import HoldoutPublishNotice from "../HoldoutPublishNotice";

const ME = 1;
const THEM = 2;
const SLUG = "coven";
const WINDOW_DAYS = 10;
const OPENED = "2026-01-01T00:00:00Z";
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function member(id: number, hasSubmitted: boolean): PraxisMemberOut {
  return {
    id,
    praxis_id: 1,
    character_id: id,
    character_display_name: `M${id}`,
    has_submitted: hasSubmitted,
    joined_at: OPENED,
  } as unknown as PraxisMemberOut;
}

/** Others are in, I am not: `deriveCollabGate` calls this viewer the holdout. */
const HOLDOUT = [member(ME, false), member(THEM, true)];
/** My part is in and theirs is not — this viewer gets the waiting surface. */
const CAST = [member(ME, true), member(THEM, false)];

function render(props: Partial<Parameters<typeof HoldoutPublishNotice>[0]> = {}) {
  return renderToStaticMarkup(
    <HoldoutPublishNotice
      members={HOLDOUT}
      currentCharacterId={ME}
      factionSlug={SLUG}
      submitProposedAt={OPENED}
      autoSubmitDays={WINDOW_DAYS}
      now={Date.parse(OPENED) + 4 * DAY}
      {...props}
    />,
  );
}

describe("the holdout is told what the deadline costs them", () => {
  it("counts the window down in the composer they were routed to (#1080)", () => {
    expect(render()).toContain(
      collabCopy(SLUG, "holdoutClockLine", { days: 6, hours: 0 }),
    );
  });

  it("says how to end it, not just that it is running", () => {
    // A countdown with no stated escape is a threat rather than a rule: both
    // ways out of it (submit, or edit and cancel it) are ADR-0012 mechanics.
    expect(render()).toContain(collabCopy(SLUG, "holdoutClockCaption"));
  });

  it("drops to hours in the final day rather than reading `0d`", () => {
    const html = render({ now: Date.parse(OPENED) + (10 * DAY - 5 * HOUR) });
    expect(html).toContain(collabCopy(SLUG, "holdoutClockLineHours", { hours: 5 }));
    expect(html).not.toContain(collabCopy(SLUG, "holdoutClockLine", { days: 0, hours: 5 }));
  });

  it("says so plainly once the window has run out", () => {
    const html = render({ now: Date.parse(OPENED) + 12 * DAY });
    expect(html).toContain(collabCopy(SLUG, "holdoutClockLineLapsed"));
  });
});

describe("the three ways it must stay silent", () => {
  it("draws nothing for a member who has already submitted", () => {
    // They are not the one the deadline threatens, and they have the waiting
    // surface's ring for the same window.
    expect(render({ members: CAST })).toBe("");
  });

  it("draws nothing before anybody has submitted", () => {
    // The window opens on the FIRST submission. No `submit_proposed_at` means
    // no deadline exists yet — the first trap the issue named.
    expect(
      render({ members: [member(ME, false), member(THEM, false)], submitProposedAt: null }),
    ).toBe("");
  });

  it("draws nothing until the era's window length is known", () => {
    // `collab_auto_submit_days` is an `EraConfig` value on `/game-config`. A
    // blank slot beats a confidently wrong number, and never a hardcoded 10.
    expect(render({ autoSubmitDays: null })).toBe("");
  });

  it("draws nothing on a solo praxis, which has no gate to be a holdout of", () => {
    expect(render({ members: [member(ME, false)] })).toBe("");
  });
});

describe("the number comes from the era, not from this file", () => {
  it("counts a different era's window differently", () => {
    // Same instant, half the window: the line has to move with the config.
    const html = render({ autoSubmitDays: 5 });
    expect(html).toContain(
      collabCopy(SLUG, "holdoutClockLine", { days: 1, hours: 0 }),
    );
  });
});
