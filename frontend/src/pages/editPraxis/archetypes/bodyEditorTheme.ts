/**
 * The eight `textareaStyle` skins, as a CodeMirror theme (#1742).
 *
 * ADR-0065 makes the composer one shared layout every faction dresses, so the
 * body had exactly one element and eight style objects. Swapping the
 * `<textarea>` for CodeMirror 6 keeps that count — and keeps the eight objects
 * *themselves*, untouched, in the archetypes that already own them.
 *
 * The skin dresses the editor's host element exactly as it dressed the textarea
 * — same ground, rule, radius, padding, min-height, ink and face — and the two
 * rules below are the whole translation: CodeMirror's own chrome goes
 * transparent and every inheritable property comes from the skin above it.
 *
 * Deliberately not eight transcribed theme literals. That would be eight copies
 * of eight objects free to drift from the skins they were copied from, and
 * eight fresh chances to inline a colour that today comes from a CSS variable
 * through `factionCssVar()`. Dark mode arrives the way it always did: through
 * the `[data-theme="dark"]` cascade on those variables, with nothing in this
 * file to know about it.
 */
import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import type { CSSProperties } from "react";

/**
 * What the host must add to a skin's `textareaStyle` for the editor inside it
 * to behave like the textarea it replaced.
 *
 * Spread BEFORE the skin, so a skin that ever wants its own value wins.
 *
 * - `display: flex` + the base theme's `flex: 1` make the editor fill a box the
 *   skin gave a `min-height` to, so the empty half of a tall field is still
 *   click-to-focus rather than dead space.
 * - `overflow: hidden` is what makes `resize: vertical` — which all eight skins
 *   set — do anything at all: CSS ignores `resize` on a `visible` box. The
 *   editor's own scroller takes over inside it.
 */
export const BODY_EDITOR_HOST_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

/**
 * CodeMirror's code-editor defaults, undone.
 *
 * Every value here is structural or `inherit`; the one colour is
 * `currentColor`, which resolves to the skin's own ink.
 */
export const BODY_EDITOR_BASE_THEME: Extension = EditorView.theme({
  "&": {
    // Fill the host, including the part of it the skin's min-height created.
    flex: "1 1 auto",
    minHeight: 0,
    // The skin's box is drawn by the host; the editor is a pane inside it.
    backgroundColor: "transparent",
  },
  // Every skin's `fieldBox` sets `outline: none`, and the base theme's dotted
  // default sits on the editor rather than on the host, out of that reach.
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "inherit",
    lineHeight: "inherit",
    overflow: "auto",
  },
  ".cm-content": {
    fontFamily: "inherit",
    // The base theme pads the content and every line to clear a code editor's
    // gutter. There is no gutter here, and the skin owns the padding.
    padding: 0,
    // `&light .cm-content` hardcodes a black caret, which is invisible on the
    // dark fields half these skins draw. `currentColor` is the skin's ink.
    caretColor: "currentColor",
  },
  ".cm-line": { padding: 0 },
  ".cm-placeholder": { color: "var(--color-text-tertiary)" },
});
