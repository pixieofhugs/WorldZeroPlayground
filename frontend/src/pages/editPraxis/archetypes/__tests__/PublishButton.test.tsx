/**
 * PublishButton collab gate (#646) and duel pull-back (#1077). It uses no
 * hooks, so it is invoked directly and its returned onClick fired headlessly.
 * Pull-back only survives on the MODERATED composer; an ordinary cast derives
 * the waiting stage instead (#1177, ADR-0059).
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

/** The plain solo composer — one member, no duel, titled. */
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
    // Mid-consensus is `pending`; carried so the phase can be derived (#1177).
    status: "pending",
    moderation_status: overrides.moderationStatus ?? "visible",
    duel_id: null,
    members,
    task_faction_slug: overrides.factionSlug ?? null,
    task_point_value: 20,
  } as unknown as PraxisOut;
  return anEditPraxisState({
    praxis,
    // Titled by default: untitled is the gated composer (#2484).
    title: overrides.title ?? "A title",
    currentCharacterId: overrides.currentCharacterId ?? 1,
    publish: overrides.publish ?? (async () => {}),
    pullBack: overrides.pullBack ?? (async () => {}),
  });
}

function renderButton(state: EditPraxisState): ReactElement<{
  onClick: () => void;
}> {
  return PublishButton({ ...state, skin: SKIN }) as ReactElement<{
    onClick: () => void;
  }>;
}

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
    win_multiplier: 1,
    loss_multiplier: 1,
    tie_multiplier: 1,
  };
}

/** A duel side stays `type: 'solo'` (ADR-0011); `duelMode` marks it. */
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
    // So `deriveEditPraxisPhase` can run on this fixture (#1177).
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

/** Guards against testing a footer no player reaches (waiting stage, #1177). */
function expectComposerMounts(state: EditPraxisState): void {
  expect(deriveEditPraxisPhase(state.praxis, state.duel, 1)).toBe("composing");
}

describe("PublishButton — a multi-member collab hands over to CollabSignals (#1811)", () => {
  // Routing only; the signals themselves are `collabSignals.test.tsx`.
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
 * Duel pull-back (#1077). Only the MODERATED composer reaches this button: a
 * `failed` entry derives `composing` while still `submitted` with a live duel.
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

  // Why the branch looks dead but isn't: the ordinary path never mounts it.
  it("is not the ordinary cast's surface — that one derives a waiting stage", () => {
    const ordinary = duelState("active");
    expect(deriveEditPraxisPhase(ordinary.praxis, ordinary.duel, 1)).toBe(
      "waiting",
    );
  });

  // Settled: unsubmitting is a forfeit, decided on the detail page only.
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
 * The title precondition (#2484). Untitled is the normal entry state for duels
 * and collabs (`handleSignup`, `accept_duel` mint no title), so this is the
 * main path, not an edge.
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

  // Keeps `publish()`'s dismiss-then-validate ordering (#718) safe.
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

  // Gating the way back into a failed entry would strand the author (#1177).
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

  it("says why, in a live region the button points at", () => {
    const markup = renderToStaticMarkup(renderButton(untitledSolo("")));
    const describedBy = /aria-describedby="([^"]+)"/.exec(markup)?.[1];
    expect(describedBy, "the button names its description").toBeTruthy();
    expect(markup).toContain(`id="${describedBy}"`);
    expect(markup).toContain('role="status"');
    expect(markup).toContain(
      i18n.t("forms:editPraxis.composer.publishNeedsTitle"),
    );
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
