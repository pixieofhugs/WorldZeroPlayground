/**
 * #1852 — the composer's caret and selection. No DOM here, so this checks the
 * generated CSS (`EditorView.styleModule`), where specificity is checkable:
 * `drawSelection()` is registered (else the native line-box caret), and what
 * it owns is painted from `currentColor`.
 */
import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { BODY_EDITOR_BASE_THEME } from "../bodyEditorTheme";

const rules = EditorState.create({ extensions: [BODY_EDITOR_BASE_THEME] })
  .facet(EditorView.styleModule)
  .map((module) => module.getRules())
  .join("\n");

// style-mod prefixes a generated class (`.ͼ5 .cm-cursor`), so match the tail.
const cursorRules = rules
  .split("\n")
  .filter((rule) => /\.cm-cursor\s*\{/.test(rule))
  .join("\n");

describe("the composer body editor's caret (#1852)", () => {
  it("registers drawSelection, so the caret is drawn rather than native", () => {
    // Only `drawSelection()`'s `hideNativeSelection` theme emits this rule.
    expect(rules).toMatch(/\.cm-content\s*\{caret-color: transparent !important;\}/);
  });

  it("paints the drawn caret from the skin's ink, not the base theme's black", () => {
    // Base theme is black and `&dark` never fires here. Filled box (#3223).
    expect(cursorRules).toContain("background-color: currentColor");
  });

  it("floors the drawn caret's height, so an empty document paints one", () => {
    // #2970: an empty line has no text node, so the marker measures ~0. `1em`
    // is text height; a `line-height` basis would undo #1852.
    expect(cursorRules).toContain("min-height: 1em");
    expect(cursorRules).not.toContain("line-height");
  });

  it("does not hang the drawn caret outside the line, where the scroller clips it", () => {
    // #3150: this theme zeroes line padding, so no negative margin. Painting
    // is `e2e/caret.spec.ts`. Matched to its end: `0` prefixes `0.6px`.
    expect(cursorRules).toMatch(/margin-left: 0[;}]/);
  });

  it("draws the caret at 1.5px and gives the scroller right-edge room for it", () => {
    // #3171: padding/negative margin cancel, keeping an end-of-line caret in
    // the clip box. #3223: a width, not a border — borders floor to 1px.
    expect(cursorRules).toMatch(/(?<![-\w])width: 1\.5px/);
    expect(cursorRules).toContain("border-left: none");
    expect(cursorRules).not.toContain("border-left-width");
    const scroller = rules
      .split("\n")
      .filter((rule) => /\.cm-scroller\s*\{/.test(rule))
      .join("\n");
    expect(scroller).toContain("padding-right: 2px");
    expect(scroller).toContain("margin-right: -2px");
  });

  it("paints the selection from currentColor, once, not eight literals", () => {
    const selection = rules
      .split("\n")
      .filter((rule) => rule.includes(".cm-selectionBackground"));
    expect(selection).toHaveLength(1);
    expect(selection[0]).toContain("currentColor");
    // No raw colour in the generated CSS either.
    expect(rules).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(\s*[\d.]/);
  });

  it("out-specifies the base theme's focused selection rule", () => {
    // The base focused rule is (0,5,0); a bare selector would lose to it and
    // show indigo while typing.
    expect(rules).toContain(
      ".cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground",
    );
    // And the blurred case, over the base theme's (0,2,0).
    expect(rules).toMatch(/\.cm-selectionLayer \.cm-selectionBackground[ ,{]/);
  });
});
