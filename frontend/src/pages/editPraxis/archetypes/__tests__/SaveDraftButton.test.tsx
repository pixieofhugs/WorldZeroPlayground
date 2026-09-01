/**
 * SaveDraftButton (#1081) — the composer's third exit: keep the draft and go.
 *
 * The button itself is thin on purpose — thinner since #1743, which left the
 * hook's `saveDraft` with nothing to do but navigate — so what's worth pinning
 * here is where it does and does not appear: a cast or moderated praxis has no
 * draft to keep, and per the house rule that state hides the control rather
 * than greying it out.
 */
import type { ComponentProps, ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import i18n from "../../../../i18n";
import { SaveDraftButton } from "../controls";

const LABEL = i18n.t("forms:editPraxis.saveDraft");

type DraftProps = ComponentProps<typeof SaveDraftButton>;

/**
 * The four facts the button reads, and nothing else (#2882).
 *
 * This used to be a fake composer state behind a cast — a praxis, a character
 * id and a published flag this control has never looked at — because the prop
 * was the whole 81-member object. Now that the control asks for its own slice,
 * the fixture IS the slice: nothing invented, and a re-widened prop fails to
 * compile here rather than passing silently.
 */
function draftProps(overrides: Partial<DraftProps> = {}): DraftProps {
  return {
    submitting: false,
    switchingMode: null,
    controlsLocked: false,
    saveDraft: async () => {},
    ...overrides,
  };
}

/**
 * The component calls `useTranslation`, so it can't be invoked bare like
 * PublishButton is next door. Rendering it inside a probe gives the hooks a
 * renderer to live in while still handing back the element, whose onClick is
 * what proves the wiring — renderToStaticMarkup emits no handlers.
 */
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
