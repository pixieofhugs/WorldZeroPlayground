/**
 * Pure markdown-transform helpers powering the body-textarea formatting toolbar
 * (#513). Each transform takes the current textarea value plus the selection
 * range and returns a new value with an updated selection, so the React
 * component only has to read the DOM selection, call the transform, push the
 * result through `state.setBody`, and restore the selection. Keeping the logic
 * here (a plain .ts module, no DOM) makes every wrap/prefix/insert rule unit
 * testable in isolation.
 */

/** A textarea value paired with a selection range. */
export interface MarkdownSelection {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

/** Every formatting action the toolbar can apply. */
export type MarkdownCommand =
  | "bold"
  | "italic"
  | "strikethrough"
  | "heading"
  | "unorderedList"
  | "orderedList"
  | "link"
  | "blockquote"
  | "inlineCode"
  | "codeBlock"
  | "table";

// Placeholder content inserted when the selection is empty. This is document
// text the author immediately overtypes (the transform selects it), not UI
// chrome, so it lives as plain markdown here rather than in an i18n catalog.
const PLACEHOLDER = {
  bold: "bold",
  italic: "italic",
  strikethrough: "strikethrough",
  heading: "Heading",
  code: "code",
  linkText: "text",
  linkUrl: "url",
  listItem: "list item",
  quote: "quote",
} as const;

const TABLE_SKELETON =
  "| Column 1 | Column 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n";

/** Wrap the selection (or an inserted placeholder) in `before`/`after`. */
function wrap(
  current: MarkdownSelection,
  before: string,
  after: string,
  placeholder: string,
): MarkdownSelection {
  const { text, selectionStart, selectionEnd } = current;
  const selected = text.slice(selectionStart, selectionEnd) || placeholder;
  const nextText =
    text.slice(0, selectionStart) +
    before +
    selected +
    after +
    text.slice(selectionEnd);
  const start = selectionStart + before.length;
  return {
    text: nextText,
    selectionStart: start,
    selectionEnd: start + selected.length,
  };
}

/**
 * Prefix every line touched by the selection. `makePrefix` receives the
 * zero-based index of the line within the selection (used for numbered lists).
 */
function prefixLines(
  current: MarkdownSelection,
  makePrefix: (lineIndex: number) => string,
  placeholder: string,
): MarkdownSelection {
  const { text, selectionStart, selectionEnd } = current;
  const lineStart = text.lastIndexOf("\n", selectionStart - 1) + 1;
  const block = text.slice(lineStart, selectionEnd) || placeholder;
  const prefixed = block
    .split("\n")
    .map((line, index) => makePrefix(index) + line)
    .join("\n");
  const nextText = text.slice(0, lineStart) + prefixed + text.slice(selectionEnd);
  return {
    text: nextText,
    selectionStart: lineStart,
    selectionEnd: lineStart + prefixed.length,
  };
}

/** Replace the selection with `content`, selecting the inserted content. */
function insert(
  current: MarkdownSelection,
  content: string,
): MarkdownSelection {
  const { text, selectionStart, selectionEnd } = current;
  const nextText =
    text.slice(0, selectionStart) + content + text.slice(selectionEnd);
  return {
    text: nextText,
    selectionStart,
    selectionEnd: selectionStart + content.length,
  };
}

/** Build a `[selection](url)` link, selecting the `url` placeholder. */
function link(current: MarkdownSelection): MarkdownSelection {
  const { text, selectionStart, selectionEnd } = current;
  const label = text.slice(selectionStart, selectionEnd) || PLACEHOLDER.linkText;
  const prefix = `[${label}](`;
  const inserted = `${prefix}${PLACEHOLDER.linkUrl})`;
  const nextText =
    text.slice(0, selectionStart) + inserted + text.slice(selectionEnd);
  const urlStart = selectionStart + prefix.length;
  return {
    text: nextText,
    selectionStart: urlStart,
    selectionEnd: urlStart + PLACEHOLDER.linkUrl.length,
  };
}

/** Wrap the selection in a fenced code block, selecting its content. */
function codeBlock(current: MarkdownSelection): MarkdownSelection {
  const { text, selectionStart, selectionEnd } = current;
  const content = text.slice(selectionStart, selectionEnd) || PLACEHOLDER.code;
  const before = "```\n";
  const after = "\n```";
  const nextText =
    text.slice(0, selectionStart) +
    before +
    content +
    after +
    text.slice(selectionEnd);
  const start = selectionStart + before.length;
  return {
    text: nextText,
    selectionStart: start,
    selectionEnd: start + content.length,
  };
}

/** Apply a formatting command, returning the new value + selection. */
export function applyMarkdown(
  command: MarkdownCommand,
  current: MarkdownSelection,
): MarkdownSelection {
  switch (command) {
    case "bold":
      return wrap(current, "**", "**", PLACEHOLDER.bold);
    case "italic":
      return wrap(current, "*", "*", PLACEHOLDER.italic);
    case "strikethrough":
      return wrap(current, "~~", "~~", PLACEHOLDER.strikethrough);
    case "inlineCode":
      return wrap(current, "`", "`", PLACEHOLDER.code);
    case "heading":
      return prefixLines(current, () => "## ", PLACEHOLDER.heading);
    case "blockquote":
      return prefixLines(current, () => "> ", PLACEHOLDER.quote);
    case "unorderedList":
      return prefixLines(current, () => "- ", PLACEHOLDER.listItem);
    case "orderedList":
      return prefixLines(
        current,
        (lineIndex) => `${lineIndex + 1}. `,
        PLACEHOLDER.listItem,
      );
    case "link":
      return link(current);
    case "codeBlock":
      return codeBlock(current);
    case "table":
      return insert(current, TABLE_SKELETON);
    default: {
      // Exhaustiveness guard: a new command must be handled above.
      const unreachable: never = command;
      return unreachable;
    }
  }
}
