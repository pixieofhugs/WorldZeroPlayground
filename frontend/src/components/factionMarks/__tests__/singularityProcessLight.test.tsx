/**
 * #2092: the Singularity process light is one drawing. Copies drifted in hue
 * while each rendered fine, so the seam is the source tree. The composer's
 * rendered blue is asserted in `singularityComposer.test.tsx`. The roll-call
 * is named, not counted (#2090).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { sourceFiles, stripComments, toRelative } from "../../../test/sourceScan";

const KIT = fileURLToPath(new URL("../SingularityProcessLight.tsx", import.meta.url));

/** Shipped source, comments stripped, tests skipped. */
function sources(): { path: string; source: string }[] {
  return sourceFiles().map((path) => ({ path, source: stripComments(readFileSync(path, "utf8")) }));
}

describe("the process light is declared once, in the kit (#2092)", () => {
  it("mounts the kit on every surface that shows one", () => {
    const mounts = sources().filter(({ source }) =>
      source.includes("<SingularityProcessLight"),
    );
    expect(mounts.map((file) => toRelative(file.path)).sort()).toEqual([
      "components/taskCard/SingularityTaskCard.tsx",
      "pages/editPraxis/archetypes/SingularityEditPraxis.tsx",
      "pages/taskDetail/archetypes/SingularityTaskDetail.tsx",
    ]);
  });

  it("leaves no surface drawing its own pulsing dot", () => {
    // Pulse class + 7px box. Narrow on purpose (the hero's `.sg-pulse` glow
    // is a different device); only catches the exact old shape.
    const copies = sources().filter(
      ({ path, source }) =>
        path !== KIT && /(?:sg|ep)-pulse/.test(source) && /width: 7,/.test(source),
    );
    expect(copies.map((file) => toRelative(file.path))).toEqual([]);
  });

  it("keeps the hue and the bloom in the kit — one pairing, not three", () => {
    const kit = readFileSync(KIT, "utf8");
    expect(kit).toContain("var(--faction-singularity-term-blue-bright)");
    expect(kit).toContain("var(--faction-singularity-term-halo-blue)");
    expect(kit, "no green accent on a blue light").not.toContain(
      "var(--faction-singularity-term-bright)",
    );
    // No hex check: issue refs like `#2092` look like hex in prose.
  });
});
