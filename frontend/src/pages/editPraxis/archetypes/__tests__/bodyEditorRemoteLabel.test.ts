/**
 * #1951 — a co-author's name label, clipped on the composer's first line.
 *
 * **The visual half is not verified and cannot be.** This harness has no DOM and
 * no layout, and the bug needs two live clients in one room with the remote
 * caret parked on line 1. Nothing below proves a label is on screen.
 *
 * What it does prove is the argument, which is entirely made of values:
 *
 *   1. `y-codemirror.next` really does place the label ABOVE the caret, by
 *      `top: -1.05em`. That is the premise; if the library ever flips it, the
 *      override here becomes wrong and this file says so.
 *   2. Our rule flips it below, and only on the first line, so every other
 *      line keeps the conventional above placement.
 *   3. Our rule OUT-SPECIFIES the library's. Both are class-only selectors, so
 *      equal weight would leave the winner to mount order — and the two themes
 *      mount from different extensions in a list built in `controls.tsx`. The
 *      weight is counted here rather than asserted as a sentence.
 *
 * The seam is the same one #1852 established: the theme *as a value*.
 * `EditorState.create` needs no DOM, and `EditorView.styleModule` holds the
 * exact CSS that will mount — including selector text, which is the only place
 * a specificity claim is checkable at all.
 */
import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { yCollab } from "y-codemirror.next";
import * as Y from "yjs";
import { BODY_EDITOR_BASE_THEME } from "../bodyEditorTheme";

function mountedRules(extensions: Parameters<typeof EditorState.create>[0]) {
  return EditorState.create(extensions)
    .facet(EditorView.styleModule)
    .flatMap((module) => module.getRules().split("\n"));
}

/**
 * The one mounted rule that POSITIONS `selector`, split in two.
 *
 * `:hover` rules are skipped: the library ships a second `.cm-ySelectionInfo`
 * rule that only fades the label in, and it is not what places it.
 */
function ruleFor(rules: string[], selector: string) {
  const matches = rules.filter((rule) => {
    const head = rule.slice(0, rule.indexOf("{")).trim();
    return head.endsWith(selector) && !head.includes(":hover");
  });
  expect(matches).toHaveLength(1);
  const brace = matches[0].indexOf("{");
  return {
    selector: matches[0].slice(0, brace).trim(),
    body: matches[0].slice(brace),
  };
}

/**
 * A selector's class-column weight — the `b` of (a,b,c) — counting classes and
 * pseudo-classes, which is every token either of these selectors is made of.
 * Neither has an id or an attribute selector, so the whole comparison lives in
 * this column and a plain `>` on the count is the real cascade answer.
 */
function classWeight(selector: string): number {
  const classes = selector.match(/\.[^\s.>+~:[\](),]+/g) ?? [];
  const pseudoClasses = selector.match(/(?<![:\w])[:][a-z-]+/g) ?? [];
  return classes.length + pseudoClasses.length;
}

// `yCollab` only mounts the remote-selection theme when it is given an
// awareness object (see its source), and the plugin that would read this one is
// a `ViewPlugin` that never instantiates without a view. So an empty object is
// enough to make the library's CSS appear, and nothing here touches a socket.
const libraryRules = mountedRules({
  extensions: [yCollab(new Y.Doc().getText("body"), {})],
});
const ourRules = mountedRules({ extensions: [BODY_EDITOR_BASE_THEME] });

const LABEL = ".cm-ySelectionInfo";

describe("the co-author name label on the composer's first line (#1951)", () => {
  it("is placed above the caret by the library — the premise being overridden", () => {
    // Absolute, and lifted clear of the caret. On line 1 there is nothing above
    // to lift into: `.cm-scroller` is `overflow: auto`, and overflow past a
    // scroll container's START edge is unreachable by scrolling, not merely
    // hidden. Half the label is cut off, which is #1951's screenshot.
    const { body } = ruleFor(libraryRules, LABEL);
    expect(body).toContain("position: absolute");
    expect(body).toContain("top: -1.05em");
  });

  it("is flipped below the caret, on the first line only", () => {
    const { selector, body } = ruleFor(ourRules, LABEL);
    // `100%` of the caret's own box: the mirror of the library's rise, in the
    // units the containing block already has. No font metric, and no
    // line-height — the skins' 1.6–1.85 is the reading measure (#1852).
    expect(body).toContain("top: 100%");
    expect(body).not.toContain("line-height");
    // Scoped, so lines 2..n keep the conventional above placement.
    expect(selector).toContain(".cm-line:first-child");
  });

  it("out-specifies the library's rule, so mount order cannot decide it", () => {
    const ours = classWeight(ruleFor(ourRules, LABEL).selector);
    const theirs = classWeight(ruleFor(libraryRules, LABEL).selector);
    expect(theirs).toBe(2); // `.ͼ1 .cm-ySelectionInfo`
    expect(ours).toBeGreaterThan(theirs);
  });

  it("leaves the caret and its dot to the library", () => {
    // The dot overhangs the caret by only .2em, which fits inside the
    // half-leading of a 1.6+ line-height. Moving it would be a second guess at
    // a thing nobody reported.
    const touched = ourRules.filter((rule) => rule.includes(".cm-ySelection"));
    expect(touched).toHaveLength(1);
    expect(touched[0]).toContain(LABEL);
  });
});
