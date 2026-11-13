/**
 * What a toolbar press sends to the CRDT body (#1742): narrowness is
 * correctness, since a whole-doc replace deletes under co-authors.
 */
import { describe, it, expect } from "vitest";
import { applyMarkdown, minimalReplacement } from "../markdownToolbar";

/** Apply the edit the way CodeMirror's `dispatch` would, to prove it lands. */
function applyReplacement(
  before: string,
  edit: { from: number; to: number; insert: string },
): string {
  return before.slice(0, edit.from) + edit.insert + before.slice(edit.to);
}

describe("minimalReplacement", () => {
  it("sends nothing when nothing changed", () => {
    expect(minimalReplacement("same text", "same text")).toEqual({
      from: 9,
      to: 9,
      insert: "",
    });
  });

  it("touches only the wrapped word for a bold press mid-document", () => {
    const before = "the quick fox jumped over the lazy dog";
    const after = applyMarkdown("bold", {
      text: before,
      selectionStart: 4,
      selectionEnd: 9,
    }).text;

    const edit = minimalReplacement(before, after);

    expect(applyReplacement(before, edit)).toBe(after);
    expect(edit.from).toBe(4);
    expect(edit.to).toBe(9);
    expect(edit.insert).toBe("**quick**");
    expect(edit.to - edit.from).toBeLessThan(before.length);
  });

  it("reaches the same text as a whole-document replacement, every command", () => {
    const before = "## What I did\n\nCaught the papers.\nTwice.";
    const commands = [
      "bold",
      "italic",
      "heading",
      "blockquote",
      "unorderedList",
      "orderedList",
      "link",
    ] as const;
    for (const command of commands) {
      const after = applyMarkdown(command, {
        text: before,
        selectionStart: 15,
        selectionEnd: 21,
      }).text;
      expect(
        applyReplacement(before, minimalReplacement(before, after)),
        `${command} must land the same text`,
      ).toBe(after);
    }
  });

  it("handles an insertion at the very start and at the very end", () => {
    expect(applyReplacement("body", minimalReplacement("body", "> body"))).toBe(
      "> body",
    );
    expect(applyReplacement("body", minimalReplacement("body", "body!"))).toBe(
      "body!",
    );
  });

  it("handles a deletion, including emptying the document", () => {
    expect(
      applyReplacement("- item", minimalReplacement("- item", "item")),
    ).toBe("item");
    const emptied = minimalReplacement("gone", "");
    expect(emptied).toEqual({ from: 0, to: 4, insert: "" });
  });

  it("never overlaps prefix and suffix on a repeating string", () => {
    // A naive prefix+suffix scan would return a negative-length range.
    const edit = minimalReplacement("aaaa", "aaaaa");
    expect(edit.to).toBeGreaterThanOrEqual(edit.from);
    expect(applyReplacement("aaaa", edit)).toBe("aaaaa");
  });
});
