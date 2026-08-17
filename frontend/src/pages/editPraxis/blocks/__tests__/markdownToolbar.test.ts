/**
 * #513 — the pure markdown-toolbar transforms. No DOM: each case feeds a value
 * + selection range and asserts the returned text and selection.
 */
import { describe, it, expect } from "vitest";
import {
  applyMarkdown,
  type MarkdownSelection,
} from "../markdownToolbar";

function sel(
  text: string,
  selectionStart: number,
  selectionEnd: number,
): MarkdownSelection {
  return { text, selectionStart, selectionEnd };
}

describe("applyMarkdown — inline wraps", () => {
  it("wraps a selection in ** for bold", () => {
    const result = applyMarkdown("bold", sel("the quick fox", 4, 9));
    expect(result.text).toBe("the **quick** fox");
    // Selection stays on the wrapped word (after the opening **).
    expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe(
      "quick",
    );
    expect(result.selectionStart).toBe(6);
    expect(result.selectionEnd).toBe(11);
  });

  it("inserts a bold placeholder at the caret on an empty selection", () => {
    const result = applyMarkdown("bold", sel("", 0, 0));
    expect(result.text).toBe("**bold**");
    expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe(
      "bold",
    );
  });

  it("wraps a selection in single * for italic", () => {
    const result = applyMarkdown("italic", sel("hi there", 3, 8));
    expect(result.text).toBe("hi *there*");
  });

  it("wraps a selection in ~~ for strikethrough", () => {
    const result = applyMarkdown("strikethrough", sel("nope", 0, 4));
    expect(result.text).toBe("~~nope~~");
  });

  it("wraps a selection in backticks for inline code", () => {
    const result = applyMarkdown("inlineCode", sel("run npm ci now", 4, 10));
    expect(result.text).toBe("run `npm ci` now");
  });
});

describe("applyMarkdown — line prefixes", () => {
  it("prefixes each selected line for a bulleted list", () => {
    const result = applyMarkdown("unorderedList", sel("one\ntwo\nthree", 0, 13));
    expect(result.text).toBe("- one\n- two\n- three");
  });

  it("numbers each selected line for an ordered list", () => {
    const result = applyMarkdown("orderedList", sel("one\ntwo\nthree", 0, 13));
    expect(result.text).toBe("1. one\n2. two\n3. three");
  });

  it("prefixes the current line with ## for a heading", () => {
    const result = applyMarkdown("heading", sel("Title", 0, 5));
    expect(result.text).toBe("## Title");
  });

  it("prefixes with > for a blockquote, expanding to the line start", () => {
    // Caret mid-line: the prefix lands at the beginning of that line.
    const result = applyMarkdown("blockquote", sel("hello world", 6, 6));
    expect(result.text).toBe("> hello world");
  });
});

describe("applyMarkdown — a line prefix never selects its own marker (#1969)", () => {
  // The marker is the formatting the author just asked for; the placeholder is
  // the part they are meant to type over. Selecting both means the first
  // keystroke deletes the list they just made.
  it.each([
    ["unorderedList", "- list item", "list item"],
    ["orderedList", "1. list item", "list item"],
    ["heading", "## Heading", "Heading"],
    ["blockquote", "> quote", "quote"],
  ] as const)(
    "selects only the placeholder for %s on an empty document",
    (command, expectedText, expectedSelection) => {
      const result = applyMarkdown(command, sel("", 0, 0));
      expect(result.text).toBe(expectedText);
      expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe(
        expectedSelection,
      );
    },
  );

  it("selects only the placeholder on a blank line between paragraphs", () => {
    // Caret on the empty middle line of "intro\n\noutro".
    const result = applyMarkdown("orderedList", sel("intro\n\noutro", 6, 6));
    expect(result.text).toBe("intro\n1. list item\noutro");
    expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe(
      "list item",
    );
  });

  // Existing lines have no placeholder to select, so the author's own selection
  // survives, mapped past every marker inserted inside it.
  it("keeps the author's own text selected across prefixed lines", () => {
    const result = applyMarkdown("unorderedList", sel("one\ntwo\nthree", 0, 13));
    expect(result.text).toBe("- one\n- two\n- three");
    expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe(
      "one\n- two\n- three",
    );
  });

  it("maps the selection past a growing ordered marker", () => {
    // Ten lines: the tenth marker is "10. " (4 chars), not 3.
    const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`);
    const text = lines.join("\n");
    const result = applyMarkdown("orderedList", sel(text, 0, text.length));
    expect(result.text.endsWith("10. line 10")).toBe(true);
    expect(result.selectionStart).toBe(3);
    expect(result.selectionEnd).toBe(result.text.length);
  });

  it("leaves a bare caret a bare caret, shifted past the marker", () => {
    const result = applyMarkdown("blockquote", sel("hello world", 6, 6));
    expect(result.text).toBe("> hello world");
    expect(result.selectionStart).toBe(8);
    expect(result.selectionEnd).toBe(8);
  });

  it("selects only the partial line the author selected", () => {
    // "quick" selected inside "the quick fox".
    const result = applyMarkdown("heading", sel("the quick fox", 4, 9));
    expect(result.text).toBe("## the quick fox");
    expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe(
      "quick",
    );
  });
});

describe("applyMarkdown — link, code block, table", () => {
  it("wraps the selection as [sel](url) and selects the url", () => {
    const result = applyMarkdown("link", sel("see the docs", 4, 12));
    expect(result.text).toBe("see [the docs](url)");
    expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe(
      "url",
    );
  });

  it("inserts a link skeleton on an empty selection", () => {
    const result = applyMarkdown("link", sel("", 0, 0));
    expect(result.text).toBe("[text](url)");
  });

  it("wraps the selection in a fenced code block", () => {
    const result = applyMarkdown("codeBlock", sel("x = 1", 0, 5));
    expect(result.text).toBe("```\nx = 1\n```");
    expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe(
      "x = 1",
    );
  });

  it("inserts a gfm table skeleton at the caret", () => {
    const result = applyMarkdown("table", sel("", 0, 0));
    expect(result.text).toContain("| Column 1 | Column 2 |");
    expect(result.text).toContain("| --- | --- |");
    expect(result.text).toContain("| Cell 1 | Cell 2 |");
    // The inserted skeleton is the returned selection.
    expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe(
      result.text,
    );
  });
});
