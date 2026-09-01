/**
 * #1852 — the composer's caret and selection, at the only seam this harness can
 * reach.
 *
 * The visual half of that issue cannot be automated here: the harness has no
 * DOM, so nothing below proves a caret is text-height on a real screen. What it
 * does prove is the two things that made it so, both of which are values rather
 * than pixels:
 *
 *   1. `drawSelection()` is registered, so a DRAWN caret exists at all. Without
 *      it the caret is the browser's, sized to a 1.6–1.85 line box, and no CSS
 *      can shrink it.
 *   2. Everything `drawSelection()` newly takes ownership of is painted from
 *      `currentColor`, not from CodeMirror's code-editor greys and indigo.
 *
 * The seam is `BODY_EDITOR_BASE_THEME` as a *value*: `EditorState.create` needs
 * no DOM, and `EditorView.styleModule` is a facet holding the exact CSS the
 * extension will mount. Asserting on the generated rules rather than on the
 * extension objects is deliberate — the selection rules are a specificity
 * argument against the base theme, and a specificity argument is only checkable
 * in the selector text.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { BODY_EDITOR_BASE_THEME } from "../bodyEditorTheme";

const rules = EditorState.create({ extensions: [BODY_EDITOR_BASE_THEME] })
  .facet(EditorView.styleModule)
  .map((module) => module.getRules())
  .join("\n");

// The caret rule this module mounts. style-mod prefixes it with the theme's
// own generated class (`.ͼ5 .cm-cursor {…}`), which is the specificity the
// comment in `bodyEditorTheme.ts` is about, so the selector is matched at its
// tail rather than its head.
const cursorRules = rules
  .split("\n")
  .filter((rule) => /\.cm-cursor\s*\{/.test(rule))
  .join("\n");

describe("the composer body editor's caret (#1852)", () => {
  it("registers drawSelection, so the caret is drawn rather than native", () => {
    // `drawSelection()`'s signature contribution, and the only extension in
    // `@codemirror/view` that emits it: the `hideNativeSelection` theme, which
    // blanks the browser's own caret so the drawn one is what shows. A drawn
    // cursor is sized from `coordsAtPos` — the text node's box — which is the
    // whole fix. If this rule is gone, the native line-box caret is back.
    expect(rules).toMatch(/\.cm-content\s*\{caret-color: transparent !important;\}/);
  });

  it("paints the drawn caret from the skin's ink, not the base theme's black", () => {
    // `.cm-cursor` base-themes to `1.2px solid black`, and the `&dark` override
    // never fires here. Half these skins draw a dark field.
    expect(cursorRules).toContain("border-left-color: currentColor");
  });

  it("floors the drawn caret's height, so an empty document paints one", () => {
    // #2970. `RectangleMarker.forRange` measures the TEXT NODE's box, and an
    // empty line has no text node — only the placeholder widget — so the
    // marker is built at ~zero height and paints nothing until the first
    // keystroke. `min-height` loses to a larger inline `height`, so it acts
    // only as a floor and a measured caret on a line with text is untouched.
    // `1em` is `.cm-content`'s own font-size, i.e. text height — NOT the
    // 1.6–1.85 line box #1852 moved away from. A `line-height` basis here
    // would be that regression coming back.
    expect(cursorRules).toContain("min-height: 1em");
    expect(cursorRules).not.toContain("line-height");
  });

  it("paints the selection from currentColor, once, not eight literals", () => {
    const selection = rules
      .split("\n")
      .filter((rule) => rule.includes(".cm-selectionBackground"));
    expect(selection).toHaveLength(1);
    expect(selection[0]).toContain("currentColor");
    // No raw colour anywhere in what this module mounts — the same bar
    // `local/no-raw-colour-values` holds style objects to, applied to the CSS
    // those objects generate.
    expect(rules).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(\s*[\d.]/);
  });

  it("out-specifies the base theme's focused selection rule", () => {
    // `&light.cm-focused > .cm-scroller > .cm-selectionLayer
    // .cm-selectionBackground` is (0,5,0). A bare `.cm-selectionBackground`
    // would lose to it and show CodeMirror's indigo exactly while someone is
    // typing, so the focused selector shape has to be matched, not simplified.
    expect(rules).toContain(
      ".cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground",
    );
    // And the blurred case, over the base theme's (0,2,0).
    expect(rules).toMatch(/\.cm-selectionLayer \.cm-selectionBackground[ ,{]/);
  });

  it("is what the composer body actually mounts", () => {
    // The assertions above are about a value; this one is why that value
    // matters. `BodyTextarea` builds its extension list inline, which no
    // DOM-less test can reach, so the binding gets checked in the source.
    const controls = readFileSync(
      fileURLToPath(new URL("../controls.tsx", import.meta.url)),
      "utf8",
    );
    expect(controls).toContain("BODY_EDITOR_BASE_THEME");
  });
});
