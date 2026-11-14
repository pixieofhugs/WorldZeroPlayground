/**
 * The composer's focus ring, a WCAG 2.4.7 contract (#2266). No DOM here, so
 * this pins the stylesheet contract: every surviving `outline: "none"` is
 * answered by an `index.css` rule, the markup carries its hooks, and it uses
 * `:focus-visible`, never bare `:focus`. Check the built CSS by hand too (#1941).
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../../i18n";
import { anEditPraxisState } from "../../../../test/fixtures";
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

const state = anEditPraxisState({ title: "Caught the papers" });

describe("the composer's focus ring", () => {
  it("leaves no unpaired outline suppression in any faction skin", () => {
    const offenders = composerSources()
      .filter(({ source }) => SUPPRESSION.test(source))
      .map(({ name }) => name);

    // `bodyEditorTheme.ts` keeps one: CodeMirror rings the pane, not the field
    // box; the `[data-composer-body]` rule below answers it.
    expect(offenders).toEqual(["bodyEditorTheme.ts"]);
  });

  it("answers both suppressions with one rule in index.css", () => {
    expect(CSS).toContain("[data-composer-field]:focus-visible");
    expect(CSS).toContain("[data-composer-body]:focus-within");
    // `currentColor`: field ink is already measured on each field ground.
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
});
