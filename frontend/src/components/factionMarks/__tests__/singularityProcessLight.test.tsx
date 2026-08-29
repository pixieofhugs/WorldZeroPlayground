/**
 * #2092 — the Singularity terminal's process light is ONE drawing.
 *
 * The seam is the SOURCE TREE, which is the only place this class of defect is
 * visible. Three surfaces drew a 7px pulsing dot in three places, so the hue
 * drifted — the composer painted `-term-bright` (green), the task card and the
 * task detail `-term-blue-bright` — and every one of them rendered perfectly on
 * its own. Nothing imported anything, so nothing linked the copies: invisible to
 * the import graph, and invisible to any single surface's markup. The rendered
 * assertion that the composer's bar now paints blue lives with that surface, in
 * `editPraxis/archetypes/__tests__/singularityComposer.test.tsx`, the same split
 * `singularityLamps.test.tsx` uses for the feed frame.
 *
 * NAMED, NOT COUNTED. #1998's lamp census asserted `toHaveLength(5)` and a sixth
 * mount — the composer, with neither the expected identifier nor the expected
 * token — was clean to every guard at once; #2090 had to replace the count with
 * an explicit list. A count is what let a wrong mount pass, so the roll-call
 * below is written out and a new surface has to add its own line.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { sourceFiles, stripComments, toRelative } from "../../../test/sourceScan";

const KIT = fileURLToPath(new URL("../SingularityProcessLight.tsx", import.meta.url));

/**
 * Every shipped `.ts`/`.tsx` under `src/`, comments stripped and tests skipped
 * (the shared walk — `sourceFiles()` skips `__tests__` by default; nothing
 * under `src/` is `node_modules`, so that former exclusion was never live).
 * The test-skip matters, because this file and the mark's own docblock name
 * the retired shape in prose and prose must not answer for a live copy.
 */
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
    // The drift's signature: a pulse CLASS in the same file as a 7px box. That
    // pairing is what the three copies had and it is deliberately narrow —
    // `SingularityFactionHero` carries `.sg-pulse` on a 160px radial glow behind
    // the sigil, which is a different device and stays. Ceiling: this sees a
    // copy that looks like the ones removed, not one drawn some other way (9px,
    // an `::after`, a `<div>`). The roll-call above is what a reviewer reads;
    // this only stops the exact shape from growing back.
    const copies = sources().filter(
      ({ path, source }) =>
        path !== KIT && /(?:sg|ep)-pulse/.test(source) && /width: 7,/.test(source),
    );
    expect(copies.map((file) => toRelative(file.path))).toEqual([]);
  });

  it("keeps the hue and the bloom in the kit — one pairing, not three", () => {
    const kit = readFileSync(KIT, "utf8");
    expect(kit).toContain("var(--faction-singularity-term-blue-bright)");
    // The blue lamp blooms in the BLUE halo. The composer's dot wore
    // `-term-halo-green`, which was coherent while the dot was green.
    expect(kit).toContain("var(--faction-singularity-term-halo-blue)");
    expect(kit, "no green accent on a blue light").not.toContain(
      "var(--faction-singularity-term-bright)",
    );
    // No hex assertion here: this reads the file WITH its prose, and every issue
    // reference in it (`#2092`) is four hex digits. The rendered no-raw-hex claim
    // is `singularityComposer.test.tsx`'s, on the markup this mark ships inside.
  });
});
