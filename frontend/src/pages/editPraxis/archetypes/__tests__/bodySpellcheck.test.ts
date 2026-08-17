/**
 * #1978 — the composer body gets the browser's dictionary back.
 *
 * The visible half cannot be automated here: this harness is
 * `renderToStaticMarkup`, there is no DOM, effects never run and CodeMirror
 * never mounts. Nothing below proves a red underline appears on a real screen.
 *
 * The seam is the one #1852 established for this file: a *value* the editor is
 * built from. `EditorState.create` needs no DOM, and `EditorView.contentAttributes`
 * is a facet holding exactly the attributes that will land on `.cm-content`, so
 * the attribute can be asserted through the same facet the view reads it from.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import "../../../../i18n";
import i18n from "../../../../i18n";
import { bodyContentAttributes } from "../controls";

// The facet accepts an attribute object OR a `(view) => Attrs` function. The
// composer registers the plain object, which is the branch a DOM-less test can
// read; anything else would need a view to resolve.
function facetValue(skin: { id?: string; ariaLabel?: string }) {
  return EditorState.create({
    extensions: [EditorView.contentAttributes.of(bodyContentAttributes(skin))],
  })
    .facet(EditorView.contentAttributes)
    .filter((source) => typeof source !== "function");
}

describe("the composer body editor's spell check (#1978)", () => {
  it("asks for spell check through contentAttributes", () => {
    // `@codemirror/view` hard-codes `spellcheck: "false"` on `.cm-content` and
    // then merges this facet over it, so a truthy value here is the whole fix.
    // The string, not a boolean: it is a DOM attribute.
    expect(facetValue({}).some((attrs) => attrs.spellcheck === "true")).toBe(
      true,
    );
  });

  it("keeps the accessibility attributes it already carried", () => {
    // Spell check is an authoring aid. These two are the accessibility half and
    // predate it — a regression fix must not cost the editor its name.
    const attrs = bodyContentAttributes({ id: "wow-body", ariaLabel: "Body" });
    expect(attrs["aria-labelledby"]).toBe("wow-body-label");
    expect(attrs["aria-label"]).toBe("Body");
    expect(attrs.spellcheck).toBe("true");
  });

  it("names the editor even when the section draws no label (#2085)", () => {
    // #2085 took the visible `Write-up` heading off all eight sheets, and with
    // it the label element `aria-labelledby` pointed at. A skin that passes
    // neither an id nor a name is now the ordinary case, and it must not be an
    // anonymous text field: the issue's own argument — "the text box already
    // includes placeholder text" — is not an accessible name.
    const attrs = bodyContentAttributes({});
    expect(attrs["aria-labelledby"]).toBeUndefined();
    expect(attrs["aria-label"]).toBe(
      i18n.t("forms:editPraxis.composer.writeUpLabel"),
    );
  });

  it("is what the composer body actually mounts", () => {
    // The assertions above are about a value; this one is why that value
    // matters. `BodyTextarea` builds its extension list inside an effect no
    // DOM-less test can reach, so the binding gets checked in the source.
    const controls = readFileSync(
      fileURLToPath(new URL("../controls.tsx", import.meta.url)),
      "utf8",
    );
    expect(controls).toMatch(
      /EditorView\.contentAttributes\.of\(contentAttributes\)/,
    );
    expect(controls).toContain("bodyContentAttributes(skin)");
  });
});
