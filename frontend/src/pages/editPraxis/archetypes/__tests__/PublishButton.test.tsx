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
import i18n from "../../../../i18n";
import type { PraxisMemberOut, PraxisOut } from "../../../../api/praxis";
import type { DuelDetailOut, DuelStatus } from "../../../../api/duel";
import type { EditPraxisState } from "../../useEditPraxis";
import { deriveEditPraxisPhase } from "../../useEditPraxis";
import { aPraxis, anEditPraxisState } from "../../../../test/fixtures";
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
    character_avatar_url: "",
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

/**
 * The plain solo composer — one member, no duel, titled.
 *
 * Everything not named here or by a caller is `anEditPraxisState`'s quiet
 * default (#2877): nothing submitting, no mode switch in flight, every handler
 * a no-op.
 */
function soloState(overrides: Partial<EditPraxisState> = {}): EditPraxisState {
  return anEditPraxisState({
    praxis: aPraxis({
      type: "solo",
      status: "in_progress",
      submitted_at: null,
      media_items: [],
      members: [],
    }),
    title: "A title",
    ...overrides,
  });
}

function collabState(
  members: PraxisMemberOut[],
  overrides: {
    currentCharacterId?: number;
    factionSlug?: string | null;
    moderationStatus?: string;
    publish?: () => Promise<void>;
    pullBack?: () => Promise<void>;
    title?: string;
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
  return anEditPraxisState({
    praxis,
    // Titled unless a case says otherwise: the title is a precondition of the
    // primary since #2484, so a fixture that omits it is describing the gated
    // composer rather than the ordinary one.
    title: overrides.title ?? "A title",
    currentCharacterId: overrides.currentCharacterId ?? 1,
    publish: overrides.publish ?? (async () => {}),
    pullBack: overrides.pullBack ?? (async () => {}),
  });
}

/** Invoke the (hookless) component directly to inspect its rendered button. */
function renderButton(state: EditPraxisState): ReactElement<{
  onClick: () => void;
}> {
  return PublishButton({ ...state, skin: SKIN }) as ReactElement<{
    onClick: () => void;
  }>;
}

/** Same, for the states where the button is expected to render nothing. */
function renderMaybe(state: EditPraxisState): ReactElement | null {
  return PublishButton({ ...state, skin: SKIN }) as ReactElement | null;
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
    title?: string;
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
  return anEditPraxisState({
    praxis,
    duel,
    duelMode: true,
    title: overrides.title ?? "A title",
    isPublished: published,
    currentCharacterId: 1,
    publish: overrides.publish ?? (async () => {}),
    pullBack: overrides.pullBack ?? (async () => {}),
    requestDuelSeal: overrides.requestDuelSeal ?? (() => {}),
  });
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
    expect(renderToStaticMarkup(renderButton(soloState({ currentCharacterId: 1 })))).toContain(
      "SOLO_IDLE",
    );
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
    expect(
      renderMaybe(soloState({ isPublished: true, currentCharacterId: 1 })),
    ).toBeNull();
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

/**
 * The title precondition (#2484).
 *
 * The seam is `PublishButton` invoked as a plain function, for the reason this
 * file's header gives: it takes no hooks, so the returned element can be
 * inspected without a DOM. The owner asked for "the control is disabled on an
 * untitled composer and enabled once a title is typed" — a rendered fact about a
 * button, which is why it cannot live in `useEditPraxis.test.ts` (pure-function
 * only, and the hook is deliberately untouched by this change).
 *
 * Untitled is the NORMAL entry state for the two flows that mint a praxis:
 * `handleSignup` posts a task id and a type, `accept_duel` mints the opponent's
 * side with neither. So these cases are the main path for duels and collabs,
 * not an edge.
 */
describe("PublishButton — the primary is dead until the praxis has a title (#2484)", () => {
  /** The opening `<button …>` tag, whether or not it came wrapped in a notice. */
  function tag(el: ReactElement | null): string {
    const markup = renderToStaticMarkup(el);
    const opening = /<button[^>]*>/.exec(markup)?.[0];
    expect(opening, "a primary is drawn either way").toBeTruthy();
    return opening ?? "";
  }

  function untitledSolo(title: string): EditPraxisState {
    return soloState({ title, currentCharacterId: 1 });
  }

  it("disables the cast while the title box is empty", () => {
    expect(tag(renderButton(untitledSolo("")))).toContain("disabled");
  });

  it("counts whitespace as empty — the same trim the server refuses on", () => {
    expect(tag(renderButton(untitledSolo("   ")))).toContain("disabled");
  });

  it("comes back to life the moment a title is typed", () => {
    expect(tag(renderButton(untitledSolo("I caught the papers")))).not.toContain(
      "disabled",
    );
  });

  // The whole point of the ruling: the sheet is never reachable from a state
  // that would have to be refused, so `publish()`'s dismiss-then-validate
  // ordering (#718) is left exactly as it was.
  it("keeps the duel seal sheet unreachable from an untitled composer", () => {
    const requestDuelSeal = vi.fn();
    const state = duelState("active", {
      isPublished: false,
      title: "",
      requestDuelSeal,
    });
    expectComposerMounts(state);
    expect(tag(renderButton(state))).toContain("disabled");
    expect(requestDuelSeal).not.toHaveBeenCalled();
  });

  it("lets the opponent seal once they have named their side", () => {
    const state = duelState("active", {
      isPublished: false,
      title: "My answer",
    });
    expect(tag(renderButton(state))).not.toContain("disabled");
  });

  // The one branch of this button that does not publish. A moderator failed the
  // entry and this is the author's way back into the text — gating it on a title
  // would strand them (#1177).
  it("leaves the duel pull-back live whatever the title says", () => {
    const state = duelState("active", {
      moderationStatus: "failed",
      title: "",
    });
    expectComposerMounts(state);
    expect(tag(renderButton(state))).not.toContain("disabled");
  });

  it("wears the house disabled dress and adds no second dimming (#2486/#2573)", () => {
    const el = renderButton(untitledSolo(""));
    expect(tag(el)).toContain("control-off");
    expect(renderToStaticMarkup(el), "no opacity anywhere").not.toMatch(
      /opacity/,
    );
  });

  // A dead control with no explanation is worse than the silent failure it
  // replaces — and for a duel or a collab this is the entry state, so it is the
  // first thing the player meets.
  it("says why, in a live region the button points at", () => {
    const markup = renderToStaticMarkup(renderButton(untitledSolo("")));
    const describedBy = /aria-describedby="([^"]+)"/.exec(markup)?.[1];
    expect(describedBy, "the button names its description").toBeTruthy();
    expect(markup).toContain(`id="${describedBy}"`);
    expect(markup).toContain('role="status"');
    expect(markup).toContain(
      i18n.t("forms:editPraxis.composer.publishNeedsTitle"),
    );
    // And the reason points at the field, by the name the field wears.
    expect(markup).toMatch(/[Tt]itle/);
  });

  it("draws no notice, and no description, once there is a title", () => {
    const markup = renderToStaticMarkup(
      renderButton(duelState("active", { isPublished: false })),
    );
    expect(markup).not.toContain("aria-describedby");
    expect(markup).not.toContain('role="status"');
  });
});
