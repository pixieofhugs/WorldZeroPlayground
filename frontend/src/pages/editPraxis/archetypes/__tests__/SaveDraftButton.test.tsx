/**
 * SaveDraftButton (#1081) — keep the draft and go. Pins where it appears: a
 * cast or moderated praxis hides it rather than greying it out.
 */
import type { ComponentProps, ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import i18n from "../../../../i18n";
import { SaveDraftButton } from "../controls";

const LABEL = i18n.t("forms:editPraxis.saveDraft");

type DraftProps = ComponentProps<typeof SaveDraftButton>;

/** Exactly the slice the button reads (#2882); a widened prop fails to compile. */
function draftProps(overrides: Partial<DraftProps> = {}): DraftProps {
  return {
    submitting: false,
    switchingMode: null,
    controlsLocked: false,
    saveDraft: async () => {},
    ...overrides,
  };
}

/** It uses hooks, so call it inside a probe to capture the element's onClick. */
function renderThroughProbe(props: DraftProps): ReactElement<{
  onClick: () => void;
  disabled: boolean;
}> | null {
  let captured: ReactElement | null = null;
  function Probe() {
    captured = SaveDraftButton(props);
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
    const html = renderToStaticMarkup(<SaveDraftButton {...draftProps()} />);
    expect(html).toContain(LABEL);
  });

  it("calls saveDraft — and asks nothing first, because it destroys nothing", () => {
    const saveDraft = vi.fn(async () => {});
    const element = renderThroughProbe(draftProps({ saveDraft }));

    element?.props.onClick();
    expect(saveDraft).toHaveBeenCalledTimes(1);
  });

  it("is not drawn once the praxis is cast or moderated — there is no draft left", () => {
    const html = renderToStaticMarkup(
      <SaveDraftButton {...draftProps({ controlsLocked: true })} />,
    );
    expect(html).toBe("");
  });

  it("stands down while a publish is in flight", () => {
    const element = renderThroughProbe(draftProps({ submitting: true }));
    expect(element?.props.disabled).toBe(true);
  });

  it("stands down while a mode switch is in flight", () => {
    const element = renderThroughProbe(draftProps({ switchingMode: "collab" }));
    expect(element?.props.disabled).toBe(true);
  });

  it("takes a faction's own voice when an archetype supplies one", () => {
    const html = renderToStaticMarkup(
      <SaveDraftButton {...draftProps()} skin={{ label: "PARK IT" }} />,
    );
    expect(html).toContain("PARK IT");
    expect(html).not.toContain(LABEL);
  });
});
