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
import { EditorView, drawSelection } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import type { CSSProperties } from "react";

import { factionCssVar, getAllFactions } from "../../../utils/factions";

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
 * A co-author's hover label, taken off the caret's ground (#2297).
 *
 * `y-codemirror.next` gives `.cm-ySelectionInfo` `color: white` on
 * `background-color: inherit`, so its ground is whatever the caret above it is
 * — and since #2267 that is `color-mix(in srgb, <remote hue> 60%, currentColor)`,
 * anchored to the VIEWER's own body ink. White on that mix failed AA on all 64
 * light-and-dark pairings in dark at 1.20:1, and the fix is not a better ink:
 * contrast is luminance distance only, so for a fixed set of grounds the ink
 * maximising the WORST pairing is pure black or pure white, and both were
 * measured. The best possible ink against the worst viewer is 3.91:1 in light.
 * AA is unsatisfiable while the label keeps that ground, so the GROUND moves.
 *
 * It moves to the remote's own SOLID hue, inked with that slug's `-on-fill` —
 * the tier whose entire contract is "AA-legible text on `--faction-{key}`"
 * (#649). Eight pairings instead of 64: the viewer's composer stops being a
 * variable the moment the label stops standing on the viewer's ink.
 * `__tests__/roomPresenceContrast.test.ts` measures every one of them, and the
 * `na`/Albescent arm is why `--faction-default-on-fill` exists at all.
 *
 * THE CARET IS UNCHANGED. Only this label's ground moves; the bar, its dot and
 * the selection band keep the anchored mix #2267 measured, so the deltaE floor
 * that keeps eight remotes telling apart is untouched — and the solid hues the
 * labels now take sit FURTHER apart than the mixes, not closer.
 *
 * WHY EIGHT RULES AND NOT ONE. The label's colour is per-remote, and the only
 * per-remote node in the library's DOM is the caret `<span>`, whose one
 * writable attribute is the `style` string built out of `paintUser`'s `color`.
 * Reading the slug back off that attribute keeps the whole change declarative:
 * nothing extra is smuggled into the style attribute (which is the injection
 * shape `roomPresence.ts` exists to prevent), `color` stays a colour, and the
 * hue set stays closed at eight because both the selector and the declarations
 * are built by `factionCssVar()` — the same function `paintUser` calls, so the
 * match cannot drift from the value it is matching.
 *
 * Specificity: `.ͼN .cm-ySelectionCaret[style*=…] .cm-ySelectionInfo` is (0,4,0)
 * against the library base theme's (0,2,0) `.ͼ1 .cm-ySelectionInfo`, so this
 * wins on weight rather than on mount order. The library's hover rule is left
 * alone — it sets `opacity` and nothing this touches.
 */
const REMOTE_LABEL_INK = Object.fromEntries(
  // `null` is the na / Albescent / unrecognised arm: `factionCssVar` folds all
  // three onto `--faction-default` (ADR-0039 §2), which is one rule, not three.
  [...getAllFactions().map((faction) => faction.slug), null].map((slug) => [
    `.cm-ySelectionCaret[style*="${factionCssVar(slug)}"] .cm-ySelectionInfo`,
    { backgroundColor: factionCssVar(slug), color: factionCssVar(slug, "on-fill") },
  ]),
);

/**
 * CodeMirror's code-editor defaults, undone.
 *
 * Every value here is structural or `inherit`; the only colours are
 * `currentColor` and a mix of it, which resolve to the skin's own ink.
 *
 * The list, so the next person does not re-derive it:
 *
 * - the editor's own ground and focus outline (`&`, `&.cm-focused`)
 * - monospace and a code editor's 1.4 line-height (`.cm-scroller`)
 * - the gutter padding on content and lines
 * - the placeholder colour
 * - **the caret's height** — see `BODY_EDITOR_SELECTION` below
 * - **the caret's colour and the selection's** — same
 *
 * Plus two things that are not CodeMirror defaults at all, both on a co-author's
 * name label (`.cm-ySelectionInfo`): where it sits on the first line (#1951),
 * and what it stands on (#2297 — see REMOTE_LABEL_INK). They live here because
 * they are `y-codemirror.next` colliding with the box THIS file builds, and
 * because one rule beats eight per-skin copies of it.
 */
const BODY_EDITOR_SKIN_THEME = EditorView.theme({
  ...REMOTE_LABEL_INK,
  "&": {
    // Fill the host, including the part of it the skin's min-height created.
    flex: "1 1 auto",
    minHeight: 0,
    // The skin's box is drawn by the host; the editor is a pane inside it.
    backgroundColor: "transparent",
  },
  // The base theme's dotted default sits on the editor PANE — inside the
  // skin's padding — rather than around the field box the player sees, so it
  // marks the wrong box. This is the ONE outline suppression in the composer
  // that survives #2266, and it is paired: `[data-composer-body]:focus-within`
  // in index.css draws the ring on the host, where the field's edge is.
  // (The eight skins' `fieldBox` each carried one of these too, replaced by
  // that same rule — an inline declaration wins over any stylesheet, so they
  // had to go for it to reach anything.)
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
  },
  ".cm-line": { padding: 0 },
  // The placeholder is the quiet label tier wearing CodeMirror's name for it, so
  // it reads the same seam `.label-caption` does. NOT `--color-text-tertiary`:
  // this theme is mounted inside all eight faction skins' body fields, and the
  // global neutral is unreachable from the root a frame repoints (#1819).
  ".cm-placeholder": { color: "var(--label-ink)" },

  // ---- The caret and the selection CodeMirror now draws (#1852) ----
  //
  // `.cm-cursor` inherits `borderLeft: 1.2px solid black` from the base theme,
  // and the `&dark` override that would lighten it never applies: this editor
  // is never marked a dark CodeMirror theme, so the base theme's `&light` class
  // is on the wrapper in both site themes. Black is invisible on the dark
  // fields half these skins draw — the same hazard the old `caretColor` line
  // named, moved to the element that draws the caret now.
  //
  // Specificity note, because it is load-bearing rather than decorative: an
  // `EditorView.theme` rule and a base-theme rule of equal specificity are
  // separated only by mount order, and this module mounts after the base theme.
  // (0,2,0) here therefore beats the base theme's (0,2,0).
  //
  // `minHeight` is the empty-document floor (#2970). The drawn cursor is sized
  // from the TEXT NODE's box (see the docblock on `BODY_EDITOR_SELECTION`), and
  // an empty write-up has no text node — the line holds only the placeholder
  // widget — so `RectangleMarker` builds the marker at ~zero height and it
  // paints nothing until the first keystroke. `min-height` only ever raises the
  // inline `height` the marker writes, so it is a floor: a measured caret on a
  // line with text is untouched. `1em` resolves against `.cm-content`'s own
  // font-size, i.e. the text height this whole mechanism is about — a
  // line-height basis here would be the #1852 regression coming back.
  ".cm-cursor": { borderLeftColor: "currentColor", minHeight: "1em" },

  // The selection background base-themes to `#d9d9d9`/`#222` unfocused and
  // `#d7d4f0`/`#233` focused — code-editor greys and an indigo, on eight
  // faction grounds. One `currentColor` mix instead: the skin's own ink,
  // thinned, so it lands on whatever ground that skin drew and follows the
  // `[data-theme="dark"]` cascade for free through the ink it derives from.
  //
  // BOTH selectors are needed and neither is redundant. The focused base rule
  // is (0,5,0) — `&light.cm-focused > .cm-scroller > .cm-selectionLayer
  // .cm-selectionBackground` — so a bare `.cm-selectionBackground` at (0,2,0)
  // would lose to it and the composer would show CodeMirror's indigo exactly
  // when someone is using it. The first selector matches that shape; the second
  // covers the blurred selection at (0,3,0), over the base theme's (0,2,0).
  //
  // ponytail: one ratio for all eight skins in both themes, unmeasured against
  // any of their grounds — 22% keeps a mid-ink wash near 5:1 for the text that
  // draws on top of it, which is the number that matters, but "visible enough
  // to read as a selection" is an eyeball question. If one ground turns out too
  // close, the upgrade is a `--composer-selection-tint` variable in index.css
  // that this rule reads and a skin may repoint — not eight literals here.
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionLayer .cm-selectionBackground":
    { background: "color-mix(in srgb, currentColor 22%, transparent)" },

  // ---- A co-author's name label, flipped under the caret on line 1 (#1951) ----
  //
  // `y-codemirror.next` hangs the label off the caret widget as
  // `.cm-ySelectionInfo { position: absolute; top: -1.05em }` — an ABOVE
  // placement, in the label's own `em` (its `font-size` is `.75em`, so the rise
  // is ~0.79 of the body's em) on a box ~0.9 body-em tall. Every line but the
  // first has a whole line box overhead to rise into. The first has the
  // scroller's edge: `.cm-scroller` is `overflow: auto` here, `.cm-content` has
  // the base theme's `4px 0` padding stripped above, and overflow past a scroll
  // container's START edge is not merely hidden but unreachable — no scroll
  // position brings it back. So roughly half the label is cut off, which is the
  // screenshot on #1951.
  //
  // Nothing else in the chain can give way. The scroller's `overflow` is what
  // makes the field scroll; the host's `overflow: hidden` above it is what makes
  // `resize: vertical` work at all (see BODY_EDITOR_HOST_STYLE); a `padding-top`
  // on `.cm-content` would buy the room by pushing the body text down inside
  // every one of the eight skins' boxes, away from the inset the skin chose. The
  // one thing that can move is the label, and only where it has to.
  //
  // `top: 100%` is the caret box's own bottom edge — the mirror of the library's
  // rise, in the units the containing block already has, so it needs no font
  // metric and no line-height (which is the reading measure and stays untouched,
  // #1852). The label lands over the top of line 2 exactly as it used to land
  // over line 0.
  //
  // Specificity: the library's rule is a `baseTheme` at (0,2,0). Written as a
  // descendant of `.cm-content` this is (0,5,0), so it wins on weight and does
  // not depend on which theme mounts last — unlike `.cm-cursor` above, where
  // matched weight made mount order load-bearing.
  //
  // ponytail: `:first-child` is "the first line CodeMirror rendered", not "the
  // first line on screen". Scrolled down, an out-of-viewport prefix becomes a
  // `.cm-gap` block widget and this stops matching — correct for the flipped
  // line, but it means a caret parked on whichever line sits at the scrolled top
  // edge is still clipped there. That case needs geometry, which CSS does not
  // have; the fix would be a ViewPlugin measuring `coordsAtPos` against the
  // scroller rect. Not worth it for the reported bug, which is a short composer
  // at scroll top. The 0.4em `.cm-ySelectionCaretDot` overhangs by 0.2em and is
  // left alone: it fits inside the half-leading of a 1.6+ line-height.
  ".cm-content > .cm-line:first-child .cm-ySelectionInfo": { top: "100%" },
});

/**
 * The caret, drawn by CodeMirror instead of by the browser (#1852).
 *
 * Without this, the caret in the composer body is the NATIVE one. A native
 * caret in a contenteditable is sized to the line box, and every skin sets a
 * reading line-height of 1.6–1.85 on its body field — so the caret stood a
 * third taller than the text beside it, and CSS exposes no height control for
 * it (`caret-color` is the whole surface area).
 *
 * `drawSelection()` hides the native caret and selection and paints its own.
 * `RectangleMarker.forRange` sizes the drawn cursor from `coordsAtPos` —
 * `pos.bottom - pos.top`, the text node's box, explicitly not `.cm-line`'s — so
 * it is text-height by construction. No magic number, and nothing to re-tune
 * when a skin's line-height moves. The skins' line-heights are the body copy's
 * reading measure and were not the bug.
 *
 * That basis has one edge case, found on prod (#2970): a text node is a thing
 * an EMPTY document does not have. The composer opens empty and the line holds
 * only the placeholder widget, so `coordsAtPos` measures ~nothing, the marker
 * is built at ~zero height, and clicking into the box put no visible caret in
 * it until the first keystroke created a text node. The measurement stays the
 * basis; the `min-height: 1em` floor on `.cm-cursor` above only catches the
 * case where there is nothing to measure.
 *
 * Shipped WITH the theme rather than beside it in the extension list, because
 * the two halves are inert apart: `drawSelection()` alone drops CodeMirror's
 * code-editor greys onto eight faction grounds, and the rules above style
 * elements that only exist once it mounts them.
 *
 * What it costs, none of it verified in a browser (#1852 asks for exactly this
 * and an agent worktree has none):
 *
 * - **Screen-reader selection.** `drawSelection()` hides the native selection
 *   in CSS only — the `hideNativeSelection` theme paints `::selection`
 *   transparent — and the DOM Selection an AT reads is still written. The
 *   `nativeSelectionHidden` facet it also sets is read in exactly one place in
 *   `@codemirror/view`, and only to skip cursor-assoc enforcement. So there is
 *   a source-level reason to expect no regression; there is not a measurement.
 * - **Cursor assoc under line wrapping.** That skipped enforcement is real and
 *   this editor has `lineWrapping` on: at a soft wrap the caret may sit at the
 *   end of one visual line where it used to move to the start of the next.
 * - **IME composition.** Composition still runs in the contenteditable, but
 *   the caret inside a preedit is now a drawn element updated on selection
 *   change, and CodeMirror defers updates while a composition is pending.
 */
const BODY_EDITOR_SELECTION: Extension = drawSelection();

export const BODY_EDITOR_BASE_THEME: Extension = [
  BODY_EDITOR_SELECTION,
  BODY_EDITOR_SKIN_THEME,
];
