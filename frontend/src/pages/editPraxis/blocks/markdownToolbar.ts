/** Pure markdown transforms for the body toolbar (#513): text + selection in, out. */

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

// Document text the author overtypes, not UI chrome, so not in i18n.
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
 * Prefix every line touched by the selection (`makePrefix` gets the line index).
 * The selection never covers a marker (#1969): empty line selects only the
 * placeholder; existing lines keep the author's selection, mapped past the
 * markers. Marker lengths vary (`10. ` at item ten), so they are measured.
 */
function prefixLines(
  current: MarkdownSelection,
  makePrefix: (lineIndex: number) => string,
  placeholder: string,
): MarkdownSelection {
  const { text, selectionStart, selectionEnd } = current;
  const lineStart = text.lastIndexOf("\n", selectionStart - 1) + 1;
  const block = text.slice(lineStart, selectionEnd);
  const isPlaceholder = block === "";
  const prefixed = (isPlaceholder ? placeholder : block)
    .split("\n")
    .map((line, index) => makePrefix(index) + line)
    .join("\n");
  const nextText = text.slice(0, lineStart) + prefixed + text.slice(selectionEnd);
  const firstMarker = makePrefix(0).length;
  if (isPlaceholder) {
    const start = lineStart + firstMarker;
    return {
      text: nextText,
      selectionStart: start,
      selectionEnd: start + placeholder.length,
    };
  }
  // The first marker sits before the selection; the rest inside it.
  const inserted = prefixed.length - block.length;
  return {
    text: nextText,
    selectionStart: selectionStart + firstMarker,
    selectionEnd: selectionEnd + inserted,
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

/** A single-range document edit, in the shape CodeMirror's `dispatch` takes. */
interface TextReplacement {
  from: number;
  to: number;
  insert: string;
}

/**
 * The narrowest edit turning `before` into `after` (#1742): replacing a CRDT
 * document wholesale deletes under co-authors and leaves tombstones.
 *
 * ponytail: common prefix/suffix, ONE range, so a wrap re-sends the wrapped
 * word. Ceiling: a co-author inside that word; upgrade: a real diff emitting
 * multiple ranges (CodeMirror `changes` accepts an array).
 */
export function minimalReplacement(
  before: string,
  after: string,
): TextReplacement {
  const shorter = Math.min(before.length, after.length);
  let start = 0;
  while (start < shorter && before[start] === after[start]) start += 1;
  let end = 0;
  while (
    end < shorter - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  ) {
    end += 1;
  }
  return {
    from: start,
    to: before.length - end,
    insert: after.slice(start, after.length - end),
  };
}
