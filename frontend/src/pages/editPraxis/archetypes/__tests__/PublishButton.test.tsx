/**
 * PublishButton collab gate (#646) and duel pull-back (#1077). Multi-member
 * collabs — and, once cast, duel sides — act through the footer's PublishButton
 * (the roster is pure display); this proves the gate picks the right action +
 * label. PublishButton uses no hooks, so it's invoked directly: we read the
 * returned <button>'s onClick to fire the action headlessly and
 * renderToStaticMarkup for the visible label.
 */
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import type { PraxisMemberOut, PraxisOut } from "../../../../api/praxis";
import type { DuelDetailOut, DuelStatus } from "../../../../api/duel";
import type { EditPraxisState } from "../../useEditPraxis";
import { collabCopy } from "../../../../components/collab/collabCopy";
import { PublishButton, type PublishButtonSkin } from "../controls";

function member(id: number, cast: boolean): PraxisMemberOut {
  return {
    id,
    praxis_id: 1,
    character_id: id,
    character_display_name: `M${id}`,
    has_submitted: cast,
    joined_at: "2026-01-01T00:00:00Z",
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
    publish?: () => Promise<void>;
    pullBack?: () => Promise<void>;
  } = {},
): EditPraxisState {
  const praxis = {
    id: 1,
    type: "collab",
    members,
    task_faction_slug: overrides.factionSlug ?? null,
    task_point_value: 20,
  } as unknown as PraxisOut;
  return {
    praxis,
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
    publish?: () => Promise<void>;
    pullBack?: () => Promise<void>;
    requestDuelSeal?: () => void;
  } = {},
): EditPraxisState {
  const praxis = {
    id: 1,
    type: "solo",
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
    viewer_is_participant: true,
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
    isPublished: overrides.isPublished ?? true,
    currentCharacterId: 1,
    publish: overrides.publish ?? (async () => {}),
    pullBack: overrides.pullBack ?? (async () => {}),
    requestDuelSeal: overrides.requestDuelSeal ?? (() => {}),
  } as unknown as EditPraxisState;
}

describe("PublishButton — collab cast/pull-back gate (#646)", () => {
  it("a multi-member collab I have not cast shows the cast label and calls publish", () => {
    const publish = vi.fn(async () => {});
    const pullBack = vi.fn(async () => {});
    const state = collabState([member(1, false), member(2, false)], {
      publish,
      pullBack,
    });
    const el = renderButton(state);

    expect(renderToStaticMarkup(el)).toContain(collabCopy(null, "castAction"));
    el.props.onClick();
    expect(publish).toHaveBeenCalledTimes(1);
    expect(pullBack).not.toHaveBeenCalled();
  });

  it("once I have cast it shows the pull-back label and calls pullBack", () => {
    const publish = vi.fn(async () => {});
    const pullBack = vi.fn(async () => {});
    const state = collabState([member(1, true), member(2, false)], {
      publish,
      pullBack,
    });
    const el = renderButton(state);

    expect(renderToStaticMarkup(el)).toContain(
      collabCopy(null, "pullBackAction"),
    );
    el.props.onClick();
    expect(pullBack).toHaveBeenCalledTimes(1);
    expect(publish).not.toHaveBeenCalled();
  });

  it("resolves the idle label through collabCopy in the task faction's voice", () => {
    const state = collabState([member(1, false), member(2, false)], {
      factionSlug: "everymen",
    });
    const html = renderToStaticMarkup(renderButton(state));

    // Everymen overrides castAction; the button speaks its voice, not the shared one.
    expect(html).toContain(collabCopy("everymen", "castAction"));
    expect(html).not.toContain(collabCopy(null, "castAction"));
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

describe("PublishButton — duel pull-back before the duel settles (#1077)", () => {
  it("offers a neutral pull-back once I have cast and the rival has not", () => {
    const publish = vi.fn(async () => {});
    const pullBack = vi.fn(async () => {});
    const requestDuelSeal = vi.fn();
    const el = renderButton(
      duelState("active", { publish, pullBack, requestDuelSeal }),
    );

    expect(renderToStaticMarkup(el)).toContain(
      collabCopy(null, "duelPullBackAction"),
    );
    el.props.onClick();
    expect(pullBack).toHaveBeenCalledTimes(1);
    expect(publish).not.toHaveBeenCalled();
    expect(requestDuelSeal).not.toHaveBeenCalled();
  });

  it("says nothing about forfeit — that only begins at settled (ADR-0011)", () => {
    const html = renderToStaticMarkup(renderButton(duelState("active")));
    expect(html).not.toMatch(/forfeit|discard|wins/i);
  });

  // Cast before the rival even accepted: the same trap (author-only entry, no
  // way back in) and the same free reopen, since the duel has not settled.
  it("offers the same pull-back on a duel still awaiting acceptance", () => {
    const pullBack = vi.fn(async () => {});
    const el = renderButton(duelState("pending", { pullBack }));

    expect(renderToStaticMarkup(el)).toContain(
      collabCopy(null, "duelPullBackAction"),
    );
    el.props.onClick();
    expect(pullBack).toHaveBeenCalledTimes(1);
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
