/**
 * SaveDraftButton (#1081) — the composer's third exit: keep the draft and go.
 *
 * The button itself is thin on purpose — thinner since #1743, which left the
 * hook's `saveDraft` with nothing to do but navigate — so what's worth pinning
 * here is where it does and does not appear: a cast or moderated praxis has no
 * draft to keep, and per the house rule that state hides the control rather
 * than greying it out.
 */
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import i18n from "../../../../i18n";
import type { PraxisOut } from "../../../../api/praxis";
import type { EditPraxisState } from "../../useEditPraxis";
import { SaveDraftButton } from "../controls";

const LABEL = i18n.t("forms:editPraxis.saveDraft");

function draftState(overrides: Partial<EditPraxisState> = {}): EditPraxisState {
  return {
    praxis: {
      id: 1,
      type: "solo",
      members: [],
      task_faction_slug: null,
    } as unknown as PraxisOut,
    submitting: false,
    switchingMode: null,
    controlsLocked: false,
    isPublished: false,
    currentCharacterId: 1,
    saveDraft: async () => {},
    ...overrides,
  } as unknown as EditPraxisState;
}

/**
 * The component calls `useTranslation`, so it can't be invoked bare like
 * PublishButton is next door. Rendering it inside a probe gives the hooks a
 * renderer to live in while still handing back the element, whose onClick is
 * what proves the wiring — renderToStaticMarkup emits no handlers.
 */
function renderThroughProbe(state: EditPraxisState): ReactElement<{
  onClick: () => void;
  disabled: boolean;
}> | null {
  let captured: ReactElement | null = null;
  function Probe() {
    captured = SaveDraftButton({ ...state });
    return null;
  }
  renderToStaticMarkup(<Probe />);
  return captured as ReactElement<{
    onClick: () => void;
    disabled: boolean;
  }> | null;
}

describe("SaveDraftButton — the third exit (#1081)", () => {
  it("offers the neutral shared label on an open draft", () => {
    const html = renderToStaticMarkup(<SaveDraftButton {...draftState()} />);
    expect(html).toContain(LABEL);
  });

  it("calls saveDraft — and asks nothing first, because it destroys nothing", () => {
    const saveDraft = vi.fn(async () => {});
    const element = renderThroughProbe(draftState({ saveDraft }));

    element?.props.onClick();
    expect(saveDraft).toHaveBeenCalledTimes(1);
  });

  it("is not drawn once the praxis is cast or moderated — there is no draft left", () => {
    const html = renderToStaticMarkup(
      <SaveDraftButton
        {...draftState({ controlsLocked: true, isPublished: true })}
      />,
    );
    expect(html).toBe("");
  });

  it("stands down while a publish is in flight", () => {
    const element = renderThroughProbe(draftState({ submitting: true }));
    expect(element?.props.disabled).toBe(true);
  });

  it("stands down while a mode switch is in flight", () => {
    const element = renderThroughProbe(draftState({ switchingMode: "collab" }));
    expect(element?.props.disabled).toBe(true);
  });

  it("takes a faction's own voice when an archetype supplies one", () => {
    const html = renderToStaticMarkup(
      <SaveDraftButton {...draftState()} skin={{ label: "PARK IT" }} />,
    );
    expect(html).toContain("PARK IT");
    expect(html).not.toContain(LABEL);
  });
});
