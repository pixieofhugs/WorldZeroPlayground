/**
 * #521's collab submit indicators are GONE from praxis detail — this is the
 * guard that they stay gone.
 *
 * #521 gave the shared detail slots three readouts of the ADR-0012 collab
 * lifecycle: an "IN EDITING" / "PENDING PUBLISH" banner pair, a read-only cast
 * roster (#591), and a green Submit control that became "you've submitted —
 * waiting on co-authors". Every one of them was gated to `in_progress` or
 * `pending`.
 *
 * ADR-0062 (#1092) redirects a praxis in EITHER status to the composer, so none
 * of the three can paint on this page: #1092 deleted the banners and #1089 the
 * other two. The composer's waiting surface (#1071) is the single owner of an
 * open praxis, and it has its own roster and its own cast control.
 *
 * Every assertion below is therefore an ABSENCE, and each one is fed the exact
 * state that used to trigger the readout — an open collab — so a reintroduced
 * branch fails here rather than shipping a second, staler answer to "who still
 * owes their part". The copy keys are deleted too, so a re-added control would
 * render its own key name and still fail.
 *
 * Rendered to static markup; the catalog is initialized so copy keys resolve.
 */
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import { PraxisStatusBanners, PraxisOwnerActions } from "../shared";
import type { PraxisDetailState } from "../usePraxisDetail";
import type {
  PraxisOut,
  PraxisMemberOut,
  PraxisStatus,
} from "../../../api/praxis";
import type { CurrentUser } from "../../../api/auth";
import { aCharacter, aCurrentUser, aMember, aPraxis } from "../../../test/fixtures";
import { aPraxisDetailState, markup } from '../../../test/praxisDetail'

const text = (element: ReactElement): string => markup(element).text;

const member = (
  characterId: number,
  name: string,
  hasSubmitted: boolean,
): PraxisMemberOut =>
  aMember({
    id: characterId * 10,
    character_id: characterId,
    character_display_name: name,
    has_submitted: hasSubmitted,
  });

const praxis = (
  members: PraxisMemberOut[],
  status: PraxisStatus,
  submitProposedAt: string | null,
): PraxisOut =>
  aPraxis({
    type: "collab",
    status,
    submitted_at: null,
    submit_proposed_at: submitProposedAt,
    created_by_id: 1,
    media_items: [],
    members,
  });

const user = (characterId: number): CurrentUser =>
  aCurrentUser({
    character: aCharacter({
      id: characterId,
      username: `u${characterId}`,
      display_name: `Player ${characterId}`,
    }),
  });


/** Minimal PraxisDetailState — only the fields the two slots read matter; the
 *  rest are stubbed with inert defaults. */
function state(overrides: Partial<PraxisDetailState>): PraxisDetailState {
  return aPraxisDetailState({
    praxis: null,
    ...overrides,
  });
}

const ADA = () => member(1, "Ada", true);
const BETH = () => member(2, "Beth", false);

describe("PraxisStatusBanners open-state banners are gone (ADR-0062)", () => {
  it("draws no publish-state banner for a collab awaiting its co-authors", () => {
    const t = text(
      <PraxisStatusBanners
        state={state({
          praxis: praxis([ADA(), BETH()], "in_progress", "2026-01-03T00:00:00Z"),
        })}
      />,
    );
    expect(t).not.toContain("PENDING PUBLISH");
    expect(t).not.toContain("pendingPublish");
    expect(t).not.toContain("IN EDITING");
  });

  it("draws no publish-state banner for a collab still drafting", () => {
    const t = text(
      <PraxisStatusBanners
        state={state({
          praxis: praxis([ADA(), BETH()], "in_progress", null),
        })}
      />,
    );
    expect(t).not.toContain("IN EDITING");
    expect(t).not.toContain("inEditing");
    expect(t).not.toContain("PENDING PUBLISH");
  });
});

describe("the read-only cast roster is gone from the banners (#591 → #1089)", () => {
  it("draws no roster for a collab mid-consensus", () => {
    const t = text(
      <PraxisStatusBanners
        state={state({
          user: user(2), // Beth — has not cast; the circle used to wait on her
          praxis: praxis([ADA(), BETH()], "pending", "2026-01-03T00:00:00Z"),
        })}
      />,
    );
    expect(t).not.toContain("cast");
    expect(t).not.toContain("Ada");
    expect(t).not.toContain("Beth");
  });

  it("draws no roster for a collab still drafting", () => {
    const t = text(
      <PraxisStatusBanners
        state={state({
          user: user(1),
          praxis: praxis([ADA(), BETH()], "in_progress", null),
        })}
      />,
    );
    expect(t).not.toContain("1 of 2");
  });

  it("draws no roster in the task faction's voice either", () => {
    // The everymen reframe ("signed off" / "still on the clock") was the roster's
    // most visible tell — its absence is the clearest proof the block is gone.
    const collab = praxis([ADA(), BETH()], "pending", "2026-01-03T00:00:00Z");
    const t = text(
      <PraxisStatusBanners
        state={{
          ...state({ user: user(2) }),
          praxis: { ...collab, task_faction_slug: "everymen" },
        }}
      />,
    );
    expect(t).not.toContain("signed off");
    expect(t).not.toContain("still on the clock");
  });
});

describe("the CAST control is gone from the owner actions (#521 → #1089)", () => {
  it("offers no waiting state to a member who has cast", () => {
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
    expect(t).not.toContain("waiting on co-authors");
    expect(t).not.toContain("submittedWaiting");
  });

  it("offers no green Submit to a member who has not cast", () => {
    const t = text(
      <PraxisOwnerActions
        state={state({
          isOwner: true,
          user: user(2), // Beth — has_submitted: false
          praxis: praxis([ADA(), BETH()], "in_progress", "2026-01-03T00:00:00Z"),
        })}
      />,
    );
    expect(t).not.toContain("Submit");
    expect(t).not.toContain("owner.submit");
  });

  it("keeps the quiet reopen — the one published control (#2136)", () => {
    const t = text(
      <PraxisOwnerActions
        state={state({
          isOwner: true,
          user: user(1),
          praxis: praxis([ADA(), member(2, "Beth", true)], "submitted", null),
        })}
      />,
    );
    expect(t).toContain("unsubmit");
    expect(t).not.toContain("edit this praxis");
  });
});
