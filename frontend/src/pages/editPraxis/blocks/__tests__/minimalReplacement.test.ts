/**
 * THE SEAM: what a toolbar press sends to a shared document (#1742).
 *
 * The composer's body is a CRDT now, so the toolbar can no longer hand it a
 * whole new string the way it handed one to a `<textarea>`. It has to send the
 * change itself, and how narrow that change is IS the correctness: a
 * whole-document replacement deletes every character a co-author is standing on
 * and leaves the deletions behind as tombstones forever.
 *
 * The binding that carries these edits cannot be tested here — the harness runs
 * the `node` environment with no DOM, so `EditorView` never mounts and effects
 * never run. This is the part of the change that is pure, and it is the part
 * that decides what reaches the other end of the socket.
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
    // The whole-document replacement this replaces would be `from: 0`,
    // `to: 38` — every character in the praxis, deleted and retyped. This
    // reaches only the wrapped word and its new markers.
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
    // "aaaa" → "aaaaa" shares its whole length with itself at both ends; a
    // naive prefix+suffix scan would return a negative-length range.
    const edit = minimalReplacement("aaaa", "aaaaa");
    expect(edit.to).toBeGreaterThanOrEqual(edit.from);
    expect(applyReplacement("aaaa", edit)).toBe("aaaaa");
  });
});
