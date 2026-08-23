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
 *   3. Our rule OUT-SPECIFIES the library's. Equal weight would leave the winner
 *      to mount order — and the two themes mount from different extensions in a
 *      list built in `controls.tsx`. The weight is counted here rather than
 *      asserted as a sentence.
 *
 * #2297 adds a second block on the same element and the same seam: what the
 * label stands on. Its selectors are the only ones here that are not made of
 * classes alone, which is why `classWeight` counts attributes too.
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

/** Every mounted rule whose SUBJECT — its rightmost compound — is `selector`. */
function rulesFor(rules: string[], selector: string, keep: (head: string) => boolean) {
  return rules
    .filter((rule) => {
      const head = rule.slice(0, rule.indexOf("{")).trim();
      return head.endsWith(selector) && keep(head);
    })
    .map((rule) => {
      const brace = rule.indexOf("{");
      return { selector: rule.slice(0, brace).trim(), body: rule.slice(brace) };
    });
}

/**
 * The one mounted rule that POSITIONS `selector`, split in two.
 *
 * Two kinds of rule are skipped, neither of which places anything: the
 * library's second `.cm-ySelectionInfo` rule, which only fades the label in on
 * `:hover`, and our eight per-remote COLOUR rules (#2297), which are keyed on
 * `[style*=…]` and are the subject of the second describe block below.
 */
function ruleFor(rules: string[], selector: string) {
  const matches = rulesFor(
    rules,
    selector,
    (head) => !head.includes(":hover") && !head.includes("[style*="),
  );
  expect(matches).toHaveLength(1);
  return matches[0];
}

/**
 * A selector's class-column weight — the `b` of (a,b,c) — counting classes,
 * pseudo-classes and attribute selectors, which is every token any of these
 * selectors is made of. None has an id, so the whole comparison lives in this
 * column and a plain `>` on the count is the real cascade answer.
 *
 * The attribute arm is not decoration: #2297's colour rules out-specify the
 * library's `color: white` PARTLY on `[style*="var(--faction-…)"]`, and a
 * counter blind to it would report a tie that the cascade does not.
 */
function classWeight(selector: string): number {
  // Attribute values are stripped first — `[style*="var(--faction-ua)"]` has
  // no `.` in it, but a future needle might, and it would count as a class.
  const bare = selector.replace(/\[[^\]]*\]/g, "[]");
  const classes = bare.match(/\.[^\s.>+~:[\](),]+/g) ?? [];
  const pseudoClasses = bare.match(/(?<![:\w])[:][a-z-]+/g) ?? [];
  const attributes = bare.match(/\[\]/g) ?? [];
  return classes.length + pseudoClasses.length + attributes.length;
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
    //
    // Nine rules since #2297, not one — so what is asserted is the SUBJECT, not
    // the count. Every rule this theme mounts into the library's namespace ends
    // at the label; the caret bar, its dot and the selection band keep the
    // anchored mix `roomPresence.ts` builds, which is what #2267 measured.
    const touched = ourRules.filter((rule) => rule.includes(".cm-ySelection"));
    expect(touched.length).toBeGreaterThan(0);
    for (const rule of touched) {
      expect(rule.slice(0, rule.indexOf("{")).trim().endsWith(LABEL)).toBe(true);
    }
  });
});

/**
 * #2297 — what the label STANDS ON, which is a different question from where it
 * sits, and the reason this file grew a second block rather than a second file.
 *
 * The library inks the label white on `background-color: inherit`, so its ground
 * is the caret's — since #2267 a `color-mix()` anchored to the VIEWER's own body
 * ink, which in dark is light, which put white on white at 1.20:1. The ratios
 * live in `__tests__/roomPresenceContrast.test.ts`, which measures the values;
 * what is checkable HERE is the same thing #1951's block checks — the premise
 * being overridden, and that the override actually reaches the element.
 */
describe("the co-author name label's ground (#2297)", () => {
  const OURS = rulesFor(ourRules, LABEL, (head) => head.includes("[style*="));

  it("is the caret's own colour, inked white, in the library — the premise", () => {
    const { body } = ruleFor(libraryRules, LABEL);
    expect(body).toContain("background-color: inherit");
    expect(body).toContain("color: white");
  });

  it("is overridden once per remote, hue and ink together", () => {
    // Eight: the seven themed factions plus the `default` all of na, Albescent
    // and any unrecognised slug folds onto (ADR-0039 §2).
    expect(OURS).toHaveLength(8);
    for (const rule of OURS) {
      const hue = /\[style\*="var\((--faction-[a-z]+)\)"\]/.exec(rule.selector)?.[1];
      expect(hue, rule.selector).toBeTruthy();
      // The ground is the remote's SOLID hue and the ink is that hue's measured
      // `-on-fill`. Both, or neither: an override that moved only the ink would
      // be the fix the issue body proposed and the ruling rejected as
      // unsatisfiable, and one that moved only the ground would leave white on it.
      expect(rule.body).toContain(`background-color: var(${hue})`);
      expect(rule.body).toContain(`color: var(${hue}-on-fill)`);
    }
  });

  it("out-specifies the library's white, so mount order cannot decide it", () => {
    const theirs = classWeight(ruleFor(libraryRules, LABEL).selector);
    expect(theirs).toBe(2); // `.ͼ1 .cm-ySelectionInfo`
    for (const rule of OURS) {
      expect(classWeight(rule.selector), rule.selector).toBeGreaterThan(theirs);
    }
  });
});
