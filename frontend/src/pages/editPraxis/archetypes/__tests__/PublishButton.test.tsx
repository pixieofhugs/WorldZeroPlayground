/**
 * PublishButton collab gate (#646) and duel pull-back (#1077). Multi-member
 * collabs — and, once cast, duel sides — act through the footer's PublishButton
 * (the roster is pure display); this proves the gate picks the right action +
 * label. PublishButton uses no hooks, so it's invoked directly: we read the
 * returned <button>'s onClick to fire the action headlessly and
 * renderToStaticMarkup for the visible label.
 *
 * #1177 re-aimed the pull-back cases at the state a player can still be in. Both
 * pull-back routes — the duel's `duelPullBack` and the collab's `iCast` — were
 * written for the ordinary cast, which now derives a waiting stage and gets
 * `PraxisWaitingSurface` instead of this footer (#1080/ADR-0059, #1189). Each one
 * survives only on the MODERATED composer, so each is asserted there, alongside
 * a case pinning the ordinary path to `waiting` so the difference is on the
 * record rather than rediscovered.
 */
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import type { PraxisMemberOut, PraxisOut } from "../../../../api/praxis";
import type { DuelDetailOut, DuelStatus } from "../../../../api/duel";
import type { EditPraxisState } from "../../useEditPraxis";
import { deriveEditPraxisPhase } from "../../useEditPraxis";
import { collabCopy } from "../../../../components/collab/collabCopy";
import {
  CollabSignals,
  PublishButton,
  type PublishButtonSkin,
} from "../controls";

function member(id: number, cast: boolean): PraxisMemberOut {
  return {
    id,
    praxis_id: 1,
    character_id: id,
    character_display_name: `M${id}`,
    has_submitted: cast,
    is_done: false,
    joined_at: "2026-01-01T00:00:00Z",
    nudged_at: null,
    submitted_at: null,
  };
}

const SKIN: PublishButtonSkin = {
  style: {},
  idleLabel: "SOLO_IDLE",
  busyLabel: "SOLO_BUSY",
};

function collabState(
  members: PraxisMemberOut[],
  overrides: {
    currentCharacterId?: number;
    factionSlug?: string | null;
    moderationStatus?: string;
    publish?: () => Promise<void>;
    pullBack?: () => Promise<void>;
  } = {},
): EditPraxisState {
  const praxis = {
    id: 1,
    type: "collab",
    // A collab mid-consensus is `pending`, never `submitted` — one member having
    // cast is a member fact (`has_submitted`), not a praxis status. Carried for
    // the same reason as the duel fixture's: so the phase can be derived (#1177).
    status: "pending",
    moderation_status: overrides.moderationStatus ?? "visible",
    duel_id: null,
    members,
    task_faction_slug: overrides.factionSlug ?? null,
    task_point_value: 20,
  } as unknown as PraxisOut;
  return {
    praxis,
    duel: null,
    submitting: false,
    switchingMode: null,
    isPublished: false,
    currentCharacterId: overrides.currentCharacterId ?? 1,
    publish: overrides.publish ?? (async () => {}),
    pullBack: overrides.pullBack ?? (async () => {}),
  } as unknown as EditPraxisState;
}

/** Invoke the (hookless) component directly to inspect its rendered button. */
function renderButton(state: EditPraxisState): ReactElement<{
  onClick: () => void;
}> {
  return PublishButton({ state, skin: SKIN }) as ReactElement<{
    onClick: () => void;
  }>;
}

/** Same, for the states where the button is expected to render nothing. */
function renderMaybe(state: EditPraxisState): ReactElement | null {
  return PublishButton({ state, skin: SKIN }) as ReactElement | null;
}

function duelSide(characterId: number, submitted: boolean) {
  return {
    praxis_id: characterId,
    character_id: characterId,
    display_name: `C${characterId}`,
    faction_slug: "na",
    avatar_url: "",
    points_from_votes: 0,
    is_submitted: submitted,
    nudged_at: null,
  };
}

/**
 * A duel side's composer state. `praxis.type` stays `'solo'` for a duel side
 * (ADR-0011) — `duelMode` is what marks it, exactly as the hook computes it.
 */
function duelState(
  duelStatus: DuelStatus,
  overrides: {
    isPublished?: boolean;
    rivalCast?: boolean;
    factionSlug?: string | null;
    moderationStatus?: string;
    publish?: () => Promise<void>;
    pullBack?: () => Promise<void>;
    requestDuelSeal?: () => void;
  } = {},
): EditPraxisState {
  const published = overrides.isPublished ?? true;
  const praxis = {
    id: 1,
    type: "solo",
    // Carried so `deriveEditPraxisPhase` can be run over the SAME fixture — the
    // phase is what decides whether this button is mounted at all (#1177).
    status: published ? "submitted" : "in_progress",
    moderation_status: overrides.moderationStatus ?? "visible",
    duel_id: 7,
    members: [],
    task_faction_slug: overrides.factionSlug ?? null,
    task_point_value: 20,
  } as unknown as PraxisOut;
  const duel: DuelDetailOut = {
    id: 7,
    task_id: 3,
    status: duelStatus,
    forfeited_by_character_id: null,
    challenger: duelSide(1, overrides.isPublished ?? true),
    opponent: duelSide(2, overrides.rivalCast ?? false),
    winner_character_id: null,
    challenger_final_points: null,
    opponent_final_points: null,
  };
  return {
    praxis,
    duel,
    duelMode: true,
    submitting: false,
    switchingMode: null,
    isPublished: published,
    currentCharacterId: 1,
    publish: overrides.publish ?? (async () => {}),
    pullBack: overrides.pullBack ?? (async () => {}),
    requestDuelSeal: overrides.requestDuelSeal ?? (() => {}),
  } as unknown as EditPraxisState;
}

/**
 * Assert the fixture is a state the composer actually mounts in.
 *
 * This button lives in the archetype's footer, and every archetype returns
 * `PraxisWaitingSurface` instead at `isWaitingStage(phase)`. So a case asserting
 * what the button draws is only meaningful if the same data derives `composing`
 * — otherwise it is testing a screen no player reaches (#1177).
 */
function expectComposerMounts(state: EditPraxisState): void {
  expect(deriveEditPraxisPhase(state.praxis, state.duel, 1)).toBe("composing");
}

describe("PublishButton — a multi-member collab hands over to CollabSignals (#1811)", () => {
  // The routing claim only. What the three affordances say and do is
  // `collabSignals.test.tsx`, which walks every skin.
  it("draws the signal group rather than a fourth relabelling of one button", () => {
    const state = collabState([member(1, false), member(2, false)]);
    const el = renderButton(state);
    expect(el.type).toBe(CollabSignals);
  });

  it("is not the approver's surface — that one derives a waiting stage", () => {
    const ordinary = collabState([member(1, true), member(2, false)]);
    expect(deriveEditPraxisPhase(ordinary.praxis, ordinary.duel, 1)).toBe(
      "waiting",
    );
  });

  it("keeps the archetype's own idle label for a solo praxis", () => {
    const state = {
      praxis: { id: 1, type: "solo", members: [] },
      submitting: false,
      switchingMode: null,
      isPublished: false,
      currentCharacterId: 1,
      publish: async () => {},
      pullBack: async () => {},
    } as unknown as EditPraxisState;
    expect(renderToStaticMarkup(renderButton(state))).toContain("SOLO_IDLE");
  });
});

/**
 * The duel pull-back (#1077), re-described by #1177.
 *
 * #1077 wrote these cases for the ordinary cast, and the ordinary cast no longer
 * reaches this button: since #1080/ADR-0059 a cast duel side derives `waiting`
 * and the archetype swaps in `PraxisWaitingSurface` (#1189), which carries the
 * pull-back itself. The rule did not move — the *surface* did.
 *
 * What still reaches this button is the MODERATED composer.
 * `deriveEditPraxisPhase` tests `moderation_status` before its duel branch and
 * returns `composing` for `failed`, and moderation never touches `status`, so a
 * duel side whose entry a moderator failed is still `submitted` with a live duel
 * and no waiting surface. These cases now assert that state, because it is the
 * one a player can actually be in. `expectComposerMounts` is what keeps them
 * honest about it.
 */
describe("PublishButton — duel pull-back on the moderated composer (#1077, #1177)", () => {
  it("offers a neutral pull-back on a failed entry while the rival has not cast", () => {
    const publish = vi.fn(async () => {});
    const pullBack = vi.fn(async () => {});
    const requestDuelSeal = vi.fn();
    const state = duelState("active", {
      moderationStatus: "failed",
      publish,
      pullBack,
      requestDuelSeal,
    });
    expectComposerMounts(state);
    const el = renderButton(state);

    expect(renderToStaticMarkup(el)).toContain(
      collabCopy(null, "duelPullBackAction"),
    );
    el.props.onClick();
    expect(pullBack).toHaveBeenCalledTimes(1);
    expect(publish).not.toHaveBeenCalled();
    expect(requestDuelSeal).not.toHaveBeenCalled();
  });

  it("says nothing about forfeit — that only begins at settled (ADR-0011)", () => {
    const html = renderToStaticMarkup(
      renderButton(duelState("active", { moderationStatus: "failed" })),
    );
    expect(html).not.toMatch(/forfeit|discard|wins/i);
  });

  // Failed before the rival even accepted: the same free reopen, since the duel
  // still has not settled.
  it("offers the same pull-back on a duel still awaiting acceptance", () => {
    const pullBack = vi.fn(async () => {});
    const state = duelState("pending", {
      moderationStatus: "failed",
      pullBack,
    });
    expectComposerMounts(state);
    const el = renderButton(state);

    expect(renderToStaticMarkup(el)).toContain(
      collabCopy(null, "duelPullBackAction"),
    );
    el.props.onClick();
    expect(pullBack).toHaveBeenCalledTimes(1);
  });

  // The other half of #1177's answer: the branch is not dead, but it is not the
  // ordinary path either. An unmoderated cast derives a waiting stage, so the
  // archetype never builds this footer — delete the branch and THIS is the case
  // that keeps working, which is why the deletion looked safe.
  it("is not the ordinary cast's surface — that one derives a waiting stage", () => {
    const ordinary = duelState("active");
    expect(deriveEditPraxisPhase(ordinary.praxis, ordinary.duel, 1)).toBe(
      "waiting",
    );
  });

  // Both sides cast → the duel settles, and from there unsubmitting IS a
  // forfeit. That decision lives on the detail page, never in the composer.
  it("renders nothing once both sides have cast and the duel settled", () => {
    expect(renderMaybe(duelState("settled", { rivalCast: true }))).toBeNull();
  });

  it("renders nothing for a resolved duel", () => {
    expect(renderMaybe(duelState("resolved", { rivalCast: true }))).toBeNull();
  });

  it("renders nothing for a plain published solo praxis", () => {
    const state = {
      praxis: { id: 1, type: "solo", members: [] },
      duel: null,
      duelMode: false,
      submitting: false,
      switchingMode: null,
      isPublished: true,
      currentCharacterId: 1,
      publish: async () => {},
      pullBack: async () => {},
    } as unknown as EditPraxisState;
    expect(renderMaybe(state)).toBeNull();
  });

  it("still opens the seal confirmation on the cast that has not happened yet", () => {
    const publish = vi.fn(async () => {});
    const pullBack = vi.fn(async () => {});
    const requestDuelSeal = vi.fn();
    const el = renderButton(
      duelState("active", {
        isPublished: false,
        publish,
        pullBack,
        requestDuelSeal,
      }),
    );

    expect(renderToStaticMarkup(el)).toContain("SOLO_IDLE");
    el.props.onClick();
    expect(requestDuelSeal).toHaveBeenCalledTimes(1);
    expect(pullBack).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });
});
