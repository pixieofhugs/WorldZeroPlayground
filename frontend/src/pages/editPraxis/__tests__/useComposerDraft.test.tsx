import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useComposerDraft } from "../useComposerDraft";

function firstRender() {
  let seen!: ReturnType<typeof useComposerDraft>;
  function Probe() {
    seen = useComposerDraft();
    return null;
  }
  renderToStaticMarkup(<Probe />);
  return seen;
}

// Without a DOM the setters cannot be observed taking effect, so this pins the
// first-render contract only: the boxes start empty.
describe("useComposerDraft first render", () => {
  it("starts with empty boxes and no autosave stamp (a stale prefill would overwrite the record)", () => {
    const draft = firstRender();
    expect(draft.title).toBe("");
    expect(draft.body).toBe("");
    expect(draft.autosaveAt).toBeNull();
  });
});
