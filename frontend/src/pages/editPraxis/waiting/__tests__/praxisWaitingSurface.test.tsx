/**
 * The waiting surface itself (#1080, ADR-0059).
 *
 * renderToStaticMarkup only — no DOM, no effects — matching the other
 * editPraxis suites. The surface takes the window length and the clock as props
 * for exactly this reason: `useGameConfig` never resolves in the harness, so a
 * self-fetching countdown would be untestable.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import "../../../../i18n";
import i18n from "../../../../i18n";
import type { DuelDetailOut, DuelStatus } from "../../../../api/duel";
import type { PraxisMemberOut, PraxisOut } from "../../../../api/praxis";
import type { TaskOut } from "../../../../api/tasks";
import { collabCopy } from "../../../../components/collab/collabCopy";
import type { EditPraxisState } from "../../useEditPraxis";
import PraxisWaitingSurface from "../PraxisWaitingSurface";

const ME = 1;
const THEM = 2;
const A_THIRD = 3;
const WINDOW_DAYS = 10;
const OPENED = "2026-01-01T00:00:00Z";
const THREE_DAYS_IN = Date.parse(OPENED) + 3 * 24 * 60 * 60 * 1000;

function member(
  id: number,
  name: string,
  hasSubmitted: boolean,
  nudgedAt: string | null = null,
): PraxisMemberOut {
  return {
    id,
    praxis_id: 1,
    character_id: id,
    character_display_name: name,
    has_submitted: hasSubmitted,
    joined_at: OPENED,
    nudged_at: nudgedAt,
  };
}

const TASK = {
  id: 5,
  title: "Walk the long way home",
  description: "Take the road you would not have taken.",
  point_value: 12,
  level_required: 3,
  primary_faction_slug: "coven",
} as unknown as TaskOut;

function praxis(overrides: Partial<PraxisOut> = {}): PraxisOut {
  return {
    id: 1,
    task_id: 5,
    task_title: TASK.title,
    task_point_value: 12,
    task_faction_slug: "coven",
    type: "collab",
    status: "in_progress",
    moderation_status: "visible",
    created_by_id: ME,
    duel_id: null,
    submitted_at: OPENED,
    updated_at: OPENED,
    submit_proposed_at: OPENED,
    members: [
      member(ME, "Wren", true),
      member(THEM, "Rax", false),
      member(A_THIRD, "Sable", false),
    ],
    invites: [],
    media_items: [],
    applied_metatasks: [],
    score: 12,
    metatask_points: 0,
    display_multiplier: 1,
    points_from_votes: 0,
    is_top_for_task: false,
    ...overrides,
  } as unknown as PraxisOut;
}

function duelDetail(status: DuelStatus): DuelDetailOut {
  return {
    id: 7,
    task_id: 5,
    status,
    forfeited_by_character_id: null,
    challenger: {
      praxis_id: 1,
      character_id: ME,
      display_name: "Wren",
      faction_slug: "coven",
      avatar_url: "",
      points_from_votes: 0,
      is_submitted: true,
    },
    opponent: {
      praxis_id: null,
      character_id: THEM,
      display_name: "Rax",
      faction_slug: "snide",
      avatar_url: "",
      points_from_votes: 0,
      is_submitted: false,
    },
    viewer_is_participant: true,
    winner_character_id: null,
    challenger_final_points: null,
    opponent_final_points: null,
  };
}

function state(overrides: Partial<EditPraxisState> = {}): EditPraxisState {
  return {
    praxis: praxis(),
    task: TASK,
    duel: null,
    currentCharacterId: ME,
    title: "The long way",
    body: "I took the road east.",
    error: "",
    submitting: false,
    leaveCollab: async () => {},
    cancel: async () => {},
    reopenForEdit: async () => {},
    kickMember: async () => {},
    nudge: async () => {},
    ...overrides,
  } as unknown as EditPraxisState;
}

function render(props: Parameters<typeof PraxisWaitingSurface>[0]) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <PraxisWaitingSurface {...props} />
    </MemoryRouter>,
  );
}

const SLUG = "coven";

describe("collab — my part is in, the crew is not", () => {
  const html = render({
    state: state(),
    autoSubmitDays: WINDOW_DAYS,
    now: THREE_DAYS_IN,
  });

  it("confirms the cast instead of dropping the player on the read page", () => {
    expect(html).toContain(collabCopy(SLUG, "awaitingHeading"));
  });

  it("names the task it is all for — the block the issue's list omitted", () => {
    expect(html).toContain(TASK.title);
    expect(html).toContain(TASK.description);
  });

  it("promotes the roster: every member, and who is still weaving", () => {
    expect(html).toContain("Wren");
    expect(html).toContain("Rax");
    expect(html).toContain("Sable");
    expect(html).toContain(collabCopy(SLUG, "pillWeaving"));
  });

  it("counts down real days off the era config, never a hardcoded window", () => {
    expect(html).toContain(collabCopy(SLUG, "awaitingClockDays", { days: 7 }));
    expect(html).toContain(collabCopy(SLUG, "awaitingClockLabel"));
  });

  it("shows the write-up read-only — no textarea, no title input", () => {
    expect(html).toContain("I took the road east.");
    expect(html).not.toContain("<textarea");
    expect(html).not.toContain("<input");
  });

  it("offers the authoring re-entry, and says what it costs the crew first", () => {
    expect(html).toContain(collabCopy(SLUG, "awaitingEditAction"));
    // The pending-publish window is cancelled by any edit (ADR-0012) — the
    // player is told before the click, not after it. Apostrophes are
    // HTML-escaped in the emitted markup, so assert on punctuation-free
    // fragments rather than the whole line.
    expect(html).toContain("cancels the publish window");
    expect(html).toContain("clears every member");
  });

  // #1080 pinned the ABSENCE of this control ("it ships on its own issue").
  // #1083 is that issue, so the assertion inverts — and gains the conditions
  // that make this version honest rather than the design's local-state one.
  it("offers a Nudge on each member who has not cast", () => {
    expect(html).toContain(collabCopy(SLUG, "nudgeAction"));
    expect(html).toContain(
      collabCopy(SLUG, "nudgeAria", { name: "Rax" }),
    );
    expect(html).toContain(
      collabCopy(SLUG, "nudgeAria", { name: "Sable" }),
    );
  });

  it("never offers a Nudge on my own row", () => {
    expect(html).not.toContain(collabCopy(SLUG, "nudgeAria", { name: "Wren" }));
  });
});

describe("nudge — the honest version (#1083)", () => {
  const duelSide = (
    status: DuelStatus,
    foeNudgedAt: string | null = null,
  ): EditPraxisState =>
    state({
      praxis: praxis({
        type: "solo",
        status: "submitted",
        duel_id: 7,
        members: [member(ME, "Wren", true)],
        submit_proposed_at: null,
      }),
      duel: {
        ...duelDetail(status),
        opponent: { ...duelDetail(status).opponent, nudged_at: foeNudgedAt },
      },
    });

  it("hides the Nudge entirely from a member who has not cast", () => {
    // The backend rule, drawn: you do not get to hurry people you have not
    // caught up with. Hidden rather than disabled — the repo shows no control a
    // viewer could never use.
    const html = render({
      state: state({
        currentCharacterId: THEM,
        praxis: praxis({
          members: [
            member(ME, "Wren", true),
            member(THEM, "Rax", false),
            member(A_THIRD, "Sable", false),
          ],
        }),
      }),
      autoSubmitDays: WINDOW_DAYS,
    });
    expect(html).not.toContain(collabCopy(SLUG, "nudgeAria", { name: "Sable" }));
  });

  it("offers no Nudge on a member who has already cast", () => {
    const html = render({
      state: state({
        praxis: praxis({
          members: [
            member(ME, "Wren", true),
            member(THEM, "Rax", true),
            member(A_THIRD, "Sable", false),
          ],
        }),
      }),
      autoSubmitDays: WINDOW_DAYS,
    });
    expect(html).not.toContain(collabCopy(SLUG, "nudgeAria", { name: "Rax" }));
    expect(html).toContain(collabCopy(SLUG, "nudgeAria", { name: "Sable" }));
  });

  it("reads its spent state off the SERVER, so a reload cannot un-nudge it", () => {
    // `nudged_at` arrives on the roster row. Nothing here remembers a click —
    // that is precisely what made the design's `setNudged` version dishonest.
    const html = render({
      state: state({
        praxis: praxis({
          members: [
            member(ME, "Wren", true),
            member(THEM, "Rax", false, "2026-01-02T00:00:00Z"),
            member(A_THIRD, "Sable", false),
          ],
        }),
      }),
      autoSubmitDays: WINDOW_DAYS,
    });
    expect(html).toContain(collabCopy(SLUG, "nudgeSentAction"));
    expect(html).toContain(
      collabCopy(SLUG, "nudgeSentAria", { name: "Rax" }),
    );
    expect(html).toContain("disabled");
  });

  it("offers the rival a Nudge while the duel is active", () => {
    const html = render({
      state: duelSide("active"),
      autoSubmitDays: WINDOW_DAYS,
    });
    expect(html).toContain(collabCopy(SLUG, "duelNudgeAria", { name: "Rax" }));
  });

  it("draws no Nudge on a pending duel — the rival has not accepted yet", () => {
    const html = render({
      state: duelSide("pending"),
      autoSubmitDays: WINDOW_DAYS,
    });
    expect(html).not.toContain(collabCopy(SLUG, "duelNudgeAria", { name: "Rax" }));
  });

  it("never draws a Nudge on my own duel side", () => {
    const html = render({
      state: duelSide("active"),
      autoSubmitDays: WINDOW_DAYS,
    });
    expect(html).not.toContain(collabCopy(SLUG, "duelNudgeAria", { name: "Wren" }));
  });

  it("spends the duel Nudge from the server's nudged_at too", () => {
    const html = render({
      state: duelSide("active", "2026-01-02T00:00:00Z"),
      autoSubmitDays: WINDOW_DAYS,
    });
    expect(html).toContain(collabCopy(SLUG, "nudgeSentAction"));
    expect(html).toContain("disabled");
  });
});

describe("collab — exits by viewer", () => {
  it("offers Leave to the member who started it (ADR-0013)", () => {
    const html = render({ state: state(), autoSubmitDays: WINDOW_DAYS });
    expect(html).toContain(i18n.t("forms:editPraxis.leaveAction"));
  });

  it("offers Leave to a member who merely joined", () => {
    const html = render({
      state: state({ currentCharacterId: THEM, praxis: praxis({ members: [
        member(ME, "Wren", false),
        member(THEM, "Rax", true),
      ] }) }),
      autoSubmitDays: WINDOW_DAYS,
    });
    expect(html).toContain(i18n.t("forms:editPraxis.leaveAction"));
  });

  it("offers Delete only to the creator, and spells out what it destroys", () => {
    const html = render({ state: state(), autoSubmitDays: WINDOW_DAYS });
    expect(html).toContain(collabCopy(SLUG, "deleteAction"));
    expect(html).toContain("Destroys the whole collab");
  });

  it("draws no Delete for a member who did not start the collab", () => {
    const html = render({
      state: state({ currentCharacterId: THEM }),
      autoSubmitDays: WINDOW_DAYS,
    });
    expect(html).not.toContain(collabCopy(SLUG, "deleteAction"));
  });
});

describe("duel — sealed, waiting on the rival", () => {
  const duelState = state({
    praxis: praxis({
      type: "solo",
      status: "submitted",
      duel_id: 7,
      members: [member(ME, "Wren", true)],
      submit_proposed_at: null,
    }),
    duel: duelDetail("active"),
  });
  const html = render({ state: duelState, autoSubmitDays: WINDOW_DAYS });

  it("confirms the seal in the duel's own words", () => {
    expect(html).toContain(collabCopy(SLUG, "duelAwaitingHeading"));
  });

  it("reads the clock as ELAPSED — nothing backs a duel countdown", () => {
    expect(html).not.toContain(collabCopy(SLUG, "awaitingClockLabel"));
    expect(html).toContain("waiting on Rax");
  });

  it("labels the rival's side as sealed rather than pretending to conceal it", () => {
    // #999 already hides a live duel side from everyone but its author; this
    // only says so.
    expect(html).toContain(collabCopy(SLUG, "duelSealedPlaceholder"));
    expect(html).not.toContain("I took the road east.".replace("east", "west"));
  });

  it("shows my own entry back to me", () => {
    expect(html).toContain("I took the road east.");
  });

  it("exits neutrally — pull back, never forfeit", () => {
    expect(html).toContain(collabCopy(SLUG, "duelPullBackAction"));
    expect(html.toLowerCase()).not.toContain("forfeit");
  });

  it("offers no collab exits on a duel", () => {
    expect(html).not.toContain(i18n.t("forms:editPraxis.leaveAction"));
    expect(html).not.toContain(collabCopy(SLUG, "deleteAction"));
  });

  it("says the rival has not answered yet while the challenge is pending", () => {
    const pending = render({
      state: state({
        praxis: praxis({
          type: "solo",
          status: "submitted",
          duel_id: 7,
          members: [member(ME, "Wren", true)],
          submit_proposed_at: null,
        }),
        duel: duelDetail("pending"),
      }),
      autoSubmitDays: WINDOW_DAYS,
    });
    expect(pending).toContain("has not answered the challenge yet");
  });
});

describe("the clock is config-driven, not assumed", () => {
  it("draws no ring at all until the window length is known", () => {
    const html = render({ state: state(), autoSubmitDays: null });
    expect(html).not.toContain(collabCopy(SLUG, "awaitingClockLabel"));
  });
});
