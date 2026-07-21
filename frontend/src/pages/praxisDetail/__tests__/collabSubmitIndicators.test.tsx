/**
 * #521 — collab submit indicators on the shared praxis-detail slots.
 *
 * Two invariant slots reflect the collab publish lifecycle (ADR-0012):
 *   - PraxisStatusBanners swaps the neutral "IN EDITING" banner for a
 *     "PENDING PUBLISH — waiting on co-authors" banner once submit_proposed_at
 *     is set (still status=in_progress).
 *   - PraxisOwnerActions replaces the green Submit control with a
 *     "you've submitted — waiting on co-authors" state for a member who has
 *     already submitted an in-editing collab. The edit affordance stays.
 *
 * Rendered to static markup; the catalog is initialized so copy keys resolve.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import {
  PraxisStatusBanners,
  PraxisOwnerActions,
  CollabRosterBlock,
} from "../shared";
import type { PraxisDetailState } from "../usePraxisDetail";
import type {
  PraxisOut,
  PraxisMemberOut,
  PraxisStatus,
} from "../../../api/praxis";
import type { CharacterOut, CurrentUser } from "../../../api/auth";

function text(element: ReactElement): string {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
  return html.replace(/<[^>]*>/g, "");
}

function member(
  characterId: number,
  name: string,
  hasSubmitted: boolean,
): PraxisMemberOut {
  return {
    id: characterId * 10,
    praxis_id: 1,
    character_id: characterId,
    character_display_name: name,
    has_submitted: hasSubmitted,
    joined_at: "2026-01-01T00:00:00Z",
  };
}

function praxis(
  members: PraxisMemberOut[],
  status: PraxisStatus,
  submitProposedAt: string | null,
): PraxisOut {
  return {
    id: 1,
    task_id: 7,
    task_title: "Mangrove",
    task_point_value: 30,
    task_level_required: 3,
    task_faction_slug: null,
    type: "collab",
    status,
    title: "Reforestation",
    body_text: "Seedlings.",
    moderation_status: "visible",
    admin_note: null,
    flagged_at: null,
    submitted_at: null,
    submit_proposed_at: submitProposedAt,
    created_by_id: 1,
    created_by_display_name: "Ada",
    created_by_faction_slug: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    members,
    invites: [],
    media_items: [],
    score: 0,
    metatask_points: 0,
    display_multiplier: 1.0,
    points_from_votes: 0,
    is_top_for_task: false,
    duel_id: null,
    can_flag: true,
    applied_metatasks: [],
  };
}

function character(id: number): CharacterOut {
  return {
    id,
    username: `u${id}`,
    display_name: `Player ${id}`,
    bio: null,
    avatar_url: null,
    location: null,
    level: 5,
    score: 0,
    all_time_score: 0,
    faction_slug: null,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
  };
}

function user(characterId: number): CurrentUser {
  return {
    account_id: 1,
    character: character(characterId),
    is_admin: false,
    can_create_additional_character: false,
    can_start_as_albescent: false,
    albescent_revealed: false,
    can_propose_task: false,
    can_propose_metatask: false,
    can_see_retired_tasks: false,
    can_see_pending_tasks: false,
    can_comment: true,
    second_character_level_required: 5,
    era_name: "Era 1",
  };
}

/** Minimal PraxisDetailState — only the fields the two slots read matter; the
 *  rest are stubbed with inert defaults. */
function state(overrides: Partial<PraxisDetailState>): PraxisDetailState {
  return {
    loading: false,
    praxis: null,
    fetchError: null,
    votes: null,
    voters: [],
    duel: null,
    isOwner: false,
    showAdminBar: false,
    user: null,
    withdrawing: false,
    showWithdrawConfirm: false,
    setShowWithdrawConfirm: () => {},
    withdrawError: null,
    adminFailNote: "",
    setAdminFailNote: () => {},
    showFailInput: false,
    setShowFailInput: () => {},
    moderating: false,
    moderateError: null,
    showFlagForm: false,
    setShowFlagForm: () => {},
    flagReason: null,
    setFlagReason: () => {},
    flagDetail: "",
    setFlagDetail: () => {},
    flagging: false,
    flagError: null,
    setFlagError: () => {},
    flagSubmitted: false,
    handleModerate: async () => {},
    handleWithdraw: async () => {},
    handleResubmit: async () => {},
    handleFlag: async () => {},
    metatasks: [],
    metataskLoading: false,
    metataskError: null,
    applyingMetataskId: null,
    removingMetataskId: null,
    handleApplyMetatask: async () => {},
    handleRemoveMetatask: async () => {},
    ...overrides,
  };
}

const ADA = () => member(1, "Ada", true);
const BETH = () => member(2, "Beth", false);

describe("PraxisStatusBanners pending-publish (#521)", () => {
  it("shows the pending-publish banner when submit_proposed_at is set", () => {
    const t = text(
      <PraxisStatusBanners
        state={state({
          praxis: praxis([ADA(), BETH()], "in_progress", "2026-01-03T00:00:00Z"),
        })}
      />,
    );
    expect(t).toContain("PENDING PUBLISH");
    expect(t).toContain("Waiting on co-authors to submit.");
    expect(t).not.toContain("IN EDITING");
  });

  it("shows the neutral IN EDITING banner when not yet proposed", () => {
    const t = text(
      <PraxisStatusBanners
        state={state({
          praxis: praxis([ADA(), BETH()], "in_progress", null),
        })}
      />,
    );
    expect(t).toContain("IN EDITING");
    expect(t).not.toContain("PENDING PUBLISH");
  });
});

describe("CollabRosterBlock on the detail page (#591)", () => {
  it("reports the cast state read-only for a still-resolving collab", () => {
    const t = text(
      <CollabRosterBlock
        state={state({
          user: user(2), // Beth — has not cast, so the circle waits on her
          praxis: praxis([ADA(), BETH()], "pending", "2026-01-03T00:00:00Z"),
        })}
      />,
    );
    expect(t).toContain("Ada");
    expect(t).toContain("Beth");
    expect(t).toContain("1 of 2 cast");
    // Read-only: the composer owns the cast / pull-back controls.
    expect(t).not.toContain("Cast my part");
    expect(t).not.toContain("Pull my part back");
  });

  it("renders the roster on an in_progress collab too", () => {
    const t = text(
      <CollabRosterBlock
        state={state({
          user: user(1),
          praxis: praxis([ADA(), BETH()], "in_progress", null),
        })}
      />,
    );
    expect(t).toContain("1 of 2 cast");
  });

  it("hides once the praxis is live — the byline already credits everyone", () => {
    const t = text(
      <CollabRosterBlock
        state={state({
          user: user(1),
          praxis: praxis([ADA(), member(2, "Beth", true)], "submitted", null),
        })}
      />,
    );
    expect(t).toBe("");
  });

  it("hides on a solo praxis (a single member is not a circle)", () => {
    const t = text(
      <CollabRosterBlock
        state={state({
          user: user(1),
          praxis: praxis([ADA()], "in_progress", null),
        })}
      />,
    );
    expect(t).toBe("");
  });

  it("speaks the task faction's voice", () => {
    const collab = praxis([ADA(), BETH()], "pending", "2026-01-03T00:00:00Z");
    const t = text(
      <CollabRosterBlock
        state={{
          ...state({ user: user(2) }),
          praxis: { ...collab, task_faction_slug: "everymen" },
        }}
      />,
    );
    expect(t).toContain("1 of 2 signed off");
    expect(t).toContain("still on the clock");
  });
});

describe("PraxisOwnerActions submitted-waiting (#521)", () => {
  it("shows the submitted-waiting state for a member who has submitted", () => {
    const t = text(
      <PraxisOwnerActions
        state={state({
          isOwner: true,
          user: user(1), // Ada — has_submitted: true
          praxis: praxis([ADA(), BETH()], "in_progress", "2026-01-03T00:00:00Z"),
        })}
      />,
    );
    // Apostrophe is HTML-escaped in static markup; assert the unambiguous tail.
    expect(t).toContain("submitted — waiting on co-authors");
    expect(t).not.toContain("Submit");
  });

  it("still shows the Submit control for a member who has not submitted", () => {
    const t = text(
      <PraxisOwnerActions
        state={state({
          isOwner: true,
          user: user(2), // Beth — has_submitted: false
          praxis: praxis([ADA(), BETH()], "in_progress", "2026-01-03T00:00:00Z"),
        })}
      />,
    );
    expect(t).toContain("Submit");
    expect(t).not.toContain("waiting on co-authors");
  });
});
