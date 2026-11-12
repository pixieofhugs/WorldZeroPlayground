/**
 * The eight `textareaStyle` skins as a CodeMirror theme (#1742, ADR-0065). The
 * skin dresses the editor's host as it did the textarea; these rules make
 * CodeMirror's chrome transparent and inherit the rest. Not eight transcribed
 * theme literals, which would drift; dark mode comes through the CSS variables.
 */
import { EditorView, drawSelection } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import type { CSSProperties } from "react";

import { factionCssVar, getAllFactions } from "../../../utils/factions";

/**
 * Added to a skin's `textareaStyle` (spread BEFORE it, so the skin wins).
 * - `display: flex` + `flex: 1` fill the skin's `min-height`, so it all focuses.
 * - `overflow: hidden` makes the skins' `resize: vertical` work (ignored on `visible`).
 */
export const BODY_EDITOR_HOST_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

/**
 * A co-author's hover label, moved off the caret's ground (#2297). The library
 * paints it white on `inherit`, i.e. the caret's viewer-anchored mix (#2267),
 * where no ink can reach AA. So the GROUND moves to the remote's solid hue,
 * inked with its `-on-fill` tier (#649): eight pairings, measured in
 * `roomPresenceContrast.test.ts`. The caret itself is unchanged.
 *
 * Eight rules because the only per-remote node is the caret `<span>`'s `style`;
 * matching the slug off it keeps this declarative (no style injection, see
 * `roomPresence.ts`), and `factionCssVar()` builds both sides, as `paintUser`
 * does. (0,4,0) beats the library's (0,2,0) on weight.
 */
const REMOTE_LABEL_INK = Object.fromEntries(
  // `null`: na/Albescent/unknown all fold onto `--faction-default` (ADR-0039 §2).
  [...getAllFactions().map((faction) => faction.slug), null].map((slug) => [
    `.cm-ySelectionCaret[style*="${factionCssVar(slug)}"] .cm-ySelectionInfo`,
    { backgroundColor: factionCssVar(slug), color: factionCssVar(slug, "on-fill") },
  ]),
);

/**
 * CodeMirror's code-editor defaults undone: ground and focus outline, monospace
 * and 1.4 line-height, gutter padding, placeholder colour, caret and selection.
 * Colours are only `currentColor`. Plus the co-author label fixes (#1951, #2297).
 */
const BODY_EDITOR_SKIN_THEME = EditorView.theme({
  ...REMOTE_LABEL_INK,
  "&": {
    flex: "1 1 auto",
    minHeight: 0,
    // The host draws the box; the editor is a pane inside it.
    backgroundColor: "transparent",
  },
  // The base outline marks the pane, not the field box. Paired with
  // `[data-composer-body]:focus-within` in index.css (#2266).
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "inherit",
    lineHeight: "inherit",
    overflow: "auto",
    // #3171: room for the 1.5px caret at a full-width line's right edge (also
    // RTL line start). Padding + equal negative margin: text doesn't move.
    // eslint-disable-next-line local/no-raw-style-values -- a hairline sized to the 1.5px caret; no --space-* rung is this small and it must not scale with type.
    paddingRight: "2px",
    // eslint-disable-next-line local/no-raw-style-values -- the paired negative of the padding above.
    marginRight: "-2px",
  },
  ".cm-content": {
    fontFamily: "inherit",
    // No gutter; the skin owns the padding.
    padding: 0,
  },
  ".cm-line": { padding: 0 },
  // The label seam, not `--color-text-tertiary`, so a faction root can repoint it (#1819).
  ".cm-placeholder": { color: "var(--label-ink)" },

  // ---- The drawn caret (#1852) ----
  // Base theme's black border never gets the `&dark` override (this editor is
  // never a dark CM theme): invisible on dark fields. Equal (0,2,0) specificity,
  // so mount order (after base) is load-bearing.
  // `minHeight: 1em`: an empty doc has no text node, so the marker is ~0 tall
  // (#2970); a floor only, in font-size units (line-height would undo #1852).
  // `marginLeft: 0`: the base -0.6px hang is clipped at column 0 (#3150,
  // `e2e/caret.spec.ts`); don't fix with line padding.
  // `width: 1.5px` filled box, not a border: browsers floor border widths to
  // device pixels (#3171, #3223). Owner picked 1.5px by eye.
  ".cm-cursor": {
    borderLeft: "none",
    width: "1.5px",
    backgroundColor: "currentColor",
    minHeight: "1em",
    marginLeft: 0,
  },

  // Selection: one thinned `currentColor` instead of CM's greys/indigo.
  // Both selectors needed: the focused base rule is (0,5,0); the second covers
  // the blurred selection at (0,3,0).
  // ponytail: one 22% ratio for all skins, eyeballed; if a ground is too close,
  // add a repointable `--composer-selection-tint` in index.css, not literals.
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionLayer .cm-selectionBackground":
    { background: "color-mix(in srgb, currentColor 22%, transparent)" },

  // ---- Co-author label flipped under the caret on line 1 (#1951) ----
  // The library rises it `top: -1.05em`; on line 1 that overflows the
  // scroller's start edge, which is unreachable. Scroller overflow, host
  // `overflow: hidden` and content padding can't give, so the label moves.
  // `top: 100%` is the caret box's bottom, no font metric needed. (0,5,0) wins
  // on weight.
  // ponytail: `:first-child` is the first rendered line, not first on screen; a
  // caret at a scrolled top edge still clips. Fix: ViewPlugin with `coordsAtPos`.
  ".cm-content > .cm-line:first-child .cm-ySelectionInfo": { top: "100%" },
});

/**
 * The caret, drawn by CodeMirror (#1852). The native caret is line-box tall
 * (1.6–1.85 line-heights) and CSS can't size it; `drawSelection()` sizes it
 * from `coordsAtPos`, the text node's box. Empty docs need the `.cm-cursor`
 * `min-height` floor (#2970). Shipped with the theme: the two are inert apart.
 *
 * Unverified in a browser:
 * - Screen readers: native selection is hidden in CSS only; the DOM Selection is
 *   still written, so no regression expected.
 * - Cursor assoc at soft wraps (`lineWrapping` on) is no longer enforced.
 * - IME: the caret inside a preedit is drawn, updated on selection change.
 */
const BODY_EDITOR_SELECTION: Extension = drawSelection();

export const BODY_EDITOR_BASE_THEME: Extension = [
  BODY_EDITOR_SELECTION,
  BODY_EDITOR_SKIN_THEME,
];
