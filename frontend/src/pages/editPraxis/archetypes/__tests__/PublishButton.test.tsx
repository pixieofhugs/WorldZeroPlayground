/**
 * PublishButton collab gate (#646). Multi-member collabs cast and pull back
 * through the footer's PublishButton (the roster is pure display); this proves
 * the gate picks the right action + faction-voiced label. PublishButton uses no
 * hooks, so it's invoked directly: we read the returned <button>'s onClick to
 * fire the action headlessly and renderToStaticMarkup for the visible label.
 */
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import type { PraxisMemberOut, PraxisOut } from "../../../../api/praxis";
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
