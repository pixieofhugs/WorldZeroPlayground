/**
 * #1951 — a co-author's name label clipped on line 1. No DOM, so not visually
 * verified; this checks the generated CSS (as in bodyEditorCaret.test.ts):
 * the library's premise (label above caret), our first-line flip below, and
 * that ours out-specifies theirs so mount order can't decide. #2297 adds the
 * label's ground.
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

/** The one rule that POSITIONS `selector` (skips `:hover` and colour rules). */
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
 * Specificity's `b` column: classes, pseudo-classes, attributes. No ids here,
 * so `>` on this is the cascade answer. Attributes matter for #2297's rules.
 */
function classWeight(selector: string): number {
  // Strip attribute values so a `.` inside one can't count as a class.
  const bare = selector.replace(/\[[^\]]*\]/g, "[]");
  const classes = bare.match(/\.[^\s.>+~:[\](),]+/g) ?? [];
  const pseudoClasses = bare.match(/(?<![:\w])[:][a-z-]+/g) ?? [];
  const attributes = bare.match(/\[\]/g) ?? [];
  return classes.length + pseudoClasses.length + attributes.length;
}

// An empty awareness is enough to mount the library's CSS; no view, no socket.
const libraryRules = mountedRules({
  extensions: [yCollab(new Y.Doc().getText("body"), {})],
});
const ourRules = mountedRules({ extensions: [BODY_EDITOR_BASE_THEME] });

const LABEL = ".cm-ySelectionInfo";

describe("the co-author name label on the composer's first line (#1951)", () => {
  it("is placed above the caret by the library — the premise being overridden", () => {
    // On line 1 this overflows the scroller's start edge: unreachable.
    const { body } = ruleFor(libraryRules, LABEL);
    expect(body).toContain("position: absolute");
    expect(body).toContain("top: -1.05em");
  });

  it("is flipped below the caret, on the first line only", () => {
    const { selector, body } = ruleFor(ourRules, LABEL);
    // Caret-box relative; no line-height basis (#1852).
    expect(body).toContain("top: 100%");
    expect(body).not.toContain("line-height");
    expect(selector).toContain(".cm-line:first-child");
  });

  it("out-specifies the library's rule, so mount order cannot decide it", () => {
    const ours = classWeight(ruleFor(ourRules, LABEL).selector);
    const theirs = classWeight(ruleFor(libraryRules, LABEL).selector);
    expect(theirs).toBe(2); // `.ͼ1 .cm-ySelectionInfo`
    expect(ours).toBeGreaterThan(theirs);
  });

  it("leaves the caret and its dot to the library", () => {
    // Every rule we mount in the library's namespace targets the label only;
    // caret, dot and band keep `roomPresence.ts`'s mix (#2267).
    const touched = ourRules.filter((rule) => rule.includes(".cm-ySelection"));
    expect(touched.length).toBeGreaterThan(0);
    for (const rule of touched) {
      expect(rule.slice(0, rule.indexOf("{")).trim().endsWith(LABEL)).toBe(true);
    }
  });
});

/**
 * #2297 — the label's ground. The library's white on an inherited (caret)
 * ground went white-on-white in dark. Ratios live in
 * `roomPresenceContrast.test.ts`; here, premise and override reach.
 */
describe("the co-author name label's ground (#2297)", () => {
  const OURS = rulesFor(ourRules, LABEL, (head) => head.includes("[style*="));

  it("is the caret's own colour, inked white, in the library — the premise", () => {
    const { body } = ruleFor(libraryRules, LABEL);
    expect(body).toContain("background-color: inherit");
    expect(body).toContain("color: white");
  });

  it("is overridden once per remote, hue and ink together", () => {
    // Seven themed factions plus `default` (ADR-0039 §2).
    expect(OURS).toHaveLength(8);
    for (const rule of OURS) {
      const hue = /\[style\*="var\((--faction-[a-z]+)\)"\]/.exec(rule.selector)?.[1];
      expect(hue, rule.selector).toBeTruthy();
      // Ground and ink move together; either alone fails.
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
