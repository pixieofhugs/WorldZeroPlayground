/**
 * #1978 — spell check in the composer body. No DOM, so asserted through the
 * `EditorView.contentAttributes` facet the view reads (see bodyEditorCaret).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import "../../../../i18n";
import i18n from "../../../../i18n";
import { bodyContentAttributes } from "../controls";

// Function-valued facet entries need a view; the composer registers an object.
function facetValue(skin: { id?: string; ariaLabel?: string }) {
  return EditorState.create({
    extensions: [EditorView.contentAttributes.of(bodyContentAttributes(skin))],
  })
    .facet(EditorView.contentAttributes)
    .filter((source) => typeof source !== "function");
}

describe("the composer body editor's spell check (#1978)", () => {
  it("asks for spell check through contentAttributes", () => {
    // CodeMirror hard-codes `"false"` and merges this facet over it.
    expect(facetValue({}).some((attrs) => attrs.spellcheck === "true")).toBe(
      true,
    );
  });

  it("keeps the accessibility attributes it already carried", () => {
    const attrs = bodyContentAttributes({ id: "wow-body", ariaLabel: "Body" });
    expect(attrs["aria-labelledby"]).toBe("wow-body-label");
    expect(attrs["aria-label"]).toBe("Body");
    expect(attrs.spellcheck).toBe("true");
  });

  it("names the editor even when the section draws no label (#2085)", () => {
    // No visible heading since #2085; a placeholder is not an accessible name.
    const attrs = bodyContentAttributes({});
    expect(attrs["aria-labelledby"]).toBeUndefined();
    expect(attrs["aria-label"]).toBe(
      i18n.t("forms:editPraxis.composer.writeUpLabel"),
    );
  });

  it("is what the composer body actually mounts", () => {
    // Built inside an effect, so check the binding in source.
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
