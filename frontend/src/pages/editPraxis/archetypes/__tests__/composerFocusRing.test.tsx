/**
 * The composer's focus ring — a WCAG 2.4.7 (Level AA) contract (#2266).
 *
 * The composer suppressed the focus outline on every field of every skin and
 * put nothing in its place: eight faction `fieldBox` objects each carried an
 * inline `outline: "none"`, the invite input carried a ninth, and grepping the
 * whole of `pages/editPraxis` for a replacement found only a behavioural
 * `onFocus` handler. Clicking into the write-up box therefore looked like
 * nothing had happened, and a keyboard user tabbed through the sheet blind.
 *
 * The seam under test is the STYLESHEET CONTRACT, not a rendered ring: this
 * harness is `renderToStaticMarkup` in a DOM-less node environment, so no test
 * here can focus anything or measure a pixel. What it CAN pin is the pair —
 * every suppression that survives is answered by a rule in `index.css`, the
 * markup carries the hooks that rule selects on, and the rule uses the
 * convention this app already standardised on (`:focus-visible`, never a bare
 * `:focus` — see `.filter-bar__toggle` and the reasoning at `.eph-gloss`).
 *
 * Verified against the BUILT stylesheet by hand as well, per #1941: a
 * brace-balanced source edit proves nothing about the Tailwind layer merge.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../../i18n";
import type { EditPraxisState } from "../../useEditPraxis";
import { BodyTextarea, TitleField } from "../controls";
import { sourceFiles } from "../../../../test/sourceScan";
import { stripComments } from "../../../../utils/__tests__/cssVars";
import { readIndexCss } from "../../../../test/indexCss";

const CSS = stripComments(
  readIndexCss(),
);

const ARCHETYPE_DIR = fileURLToPath(new URL("..", import.meta.url));

/** Every source file the composer is built from (the eight skins + the shared controls). */
function composerSources(): Array<{ name: string; source: string }> {
  return sourceFiles({ dir: ARCHETYPE_DIR, match: /\.tsx?$/ }).map((path) => ({
    name: basename(path),
    source: readFileSync(path, "utf8"),
  }));
}

/** An `outline: "none"` in an inline style object, in any spacing. */
const SUPPRESSION = /outline:\s*["']none["']/;

// The controls only read the handful of state fields they bind to.
const state = {
  title: "Caught the papers",
  setTitle: () => {},
  body: "## What I did",
  setBody: () => {},
} as unknown as EditPraxisState;

describe("the composer's focus ring", () => {
  it("leaves no unpaired outline suppression in any faction skin", () => {
    const offenders = composerSources()
      .filter(({ source }) => SUPPRESSION.test(source))
      .map(({ name }) => name);

    // `bodyEditorTheme.ts` keeps ONE, deliberately: CodeMirror's base theme
    // draws its dotted default on the editor pane rather than on the field box
    // the player sees, which is the wrong box by a whole padding. That one is
    // answered by the `[data-composer-body]` rule asserted below — every other
    // file's suppression was answered by nothing, which was the bug.
    expect(offenders).toEqual(["bodyEditorTheme.ts"]);
  });

  it("answers both suppressions with one rule in index.css", () => {
    expect(CSS).toContain("[data-composer-field]:focus-visible");
    expect(CSS).toContain("[data-composer-body]:focus-within");
    // `currentColor`: each skin already measured its field's ink against its
    // own field ground, so the ring is legible on all eight by construction —
    // no new token, no eight-way measurement, no byte of faction CSS.
    expect(CSS).toMatch(
      /\[data-composer-body\]:focus-within\s*\{[^}]*outline:[^;]*currentColor/,
    );
  });

  it("never reaches for a bare :focus, which is the app's own convention", () => {
    const composerRules = CSS.match(/\[data-composer-[a-z]+\]:[a-z-]+/g) ?? [];
    expect(composerRules.length, "the composer focus rule exists").toBeGreaterThan(0);
    // `:focus` alone would ring a pointer user who merely clicked into the box.
    expect(composerRules.filter((rule) => rule.endsWith(":focus"))).toEqual([]);
  });

  it("puts the hook the rule selects on the title input and the body's host", () => {
    const title = renderToStaticMarkup(
      <TitleField {...state} skin={{ inputStyle: {} }} />,
    );
    expect(title).toContain("data-composer-field");

    const body = renderToStaticMarkup(
      <BodyTextarea {...state} skin={{ textareaStyle: {} }} />,
    );
    expect(body).toContain("data-composer-body");
  });

  it("puts the same hook on the invite search input", () => {
    // Rendering `InviteSearch` needs a whole duel/collab state fixture; the
    // claim here is only that the attribute is on the element, so the source is
    // the cheaper seam for it.
    const controls = readFileSync(`${ARCHETYPE_DIR}/controls.tsx`, "utf8");
    // `autoFocus={pickerOpen}` is the invite input's own tell; the element runs
    // from the `<input` before it to the `/>` after it.
    const tell = controls.indexOf("autoFocus={pickerOpen}");
    expect(tell, "the invite search input is still here").toBeGreaterThan(-1);
    const element = controls.slice(
      controls.lastIndexOf("<input", tell),
      controls.indexOf("/>", tell),
    );
    expect(element).toContain("data-composer-field");
  });
});
