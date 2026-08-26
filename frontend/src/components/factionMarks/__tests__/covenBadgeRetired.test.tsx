/**
 * Cozy Coven wears ONE mark of identity, and it is the witch hat (#2726).
 *
 * The pentagram badge — `SigilMark`, a pink disc under a dashed gold ring with a
 * five-point star and a lit centre — is retired. It had six mounts, and the
 * migration that ends here started at #2029 (the card kit stood the badge down
 * when the bands were built), continued at #2217 (`CovenAvatar` dropped its
 * bespoke crescent for the hat) and at #2325 (the directory tile dispatched to
 * it). A player now meets one symbol for this faction rather than two.
 *
 * WHY A SOURCE SCAN, and not a render test. This is the same failure mode
 * `covenCat.test.tsx` was written for and the reasoning is copied from it
 * deliberately: a SEVENTH surface pasting the badge back renders fine,
 * typechecks fine, and is only wrong when you hold two Coven pages side by side.
 * The thing that went wrong historically is a private re-draw, not a broken
 * render — `CovenTaskDetail` held a second copy of this exact drawing that never
 * went through `covenSlip`'s export at all, and no render assertion anywhere
 * could see it.
 *
 * The two deletion assertions are therefore a PAIR: the first says the name is
 * gone, the second says the DRAWING is gone from the two files that held it, so
 * that reviving the badge under a fresh name fails too.
 *
 * SCOPE, stated so it is not mistaken for a gap. `Spark` (the four-point
 * sparkle) and `CovenCat` (the turning watermark) are untouched — different
 * devices with different jobs, and `covenSlip`'s own header gives the reason.
 * Two OTHER pentagram drawings survive outside this ruling's mount list, in
 * `feed/CovenFeedFrame` and `editPraxis/CovenEditPraxis`; #2726 did not rule on
 * them, so this file does not scan for the star path tree-wide — only in the two
 * places it was told to empty.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import { CovenSigil } from "../../sigil/CovenSigil";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** The badge's five-point star, in its own 44-unit box. */
const BADGE_STAR = "M22 8 L30.2 33.3 L8.7 17.7 L35.3 17.7 L13.8 33.3 Z";

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(path));
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(path);
  }
  return out;
}

const FILES = sourceFiles(SRC).map((path) => [path, readFileSync(path, "utf8")] as const);

function code(relative: string): string {
  return readFileSync(join(SRC, relative), "utf8");
}

/** The six mounts the badge held, and the size each asks the mark for. */
const MOUNTS: [file: string, size: string][] = [
  ["components/factionHero/CovenFactionHero.tsx", "74"],
  ["pages/taskDetail/archetypes/CovenTaskDetail.tsx", "30"],
  ["pages/factionDetail/archetypes/CovenFactionBody.tsx", "26"],
  ["components/duel/CovenDuelSealConfirm.tsx", "26"],
  ["pages/characterPaths/archetypes/CovenCreateCharacter.tsx", "BADGE"],
  ["pages/fieldDesk/mobileArchetypes/CovenFieldDesk.tsx", "22"],
];

describe("Coven's retired pentagram badge (#2726)", () => {
  it("is named in no source file — not exported, not imported, not re-drawn", () => {
    // Whole-tree, because a dir-scoped scan has hidden mounts in this repo
    // before. `.test.tsx?` is excluded above; prose about the retirement is
    // allowed to name the thing it retired, which is why this scans code only.
    const offenders = FILES.filter(([, source]) => source.includes("SigilMark")).map(([path]) => path);
    expect(offenders, "`SigilMark` survives in these files").toEqual([]);
  });

  it("draws its star in neither the kit module nor the detail page that copied it", () => {
    for (const file of [
      "components/factionMarks/covenSlip.tsx",
      "pages/taskDetail/archetypes/CovenTaskDetail.tsx",
    ]) {
      expect(code(file), `the badge drawing survives in ${file} under some other name`).not.toContain(
        BADGE_STAR,
      );
    }
  });

  it("hands all six of its mounts to `CovenSigil`, each at the size it asked the badge for", () => {
    for (const [file, size] of MOUNTS) {
      expect(code(file), `${file} draws no mark at all`).toContain(`<CovenSigil size={${size}}`);
    }
  });

  it("loses no hairline at 22px, the smallest mount — the hat is fill-only", () => {
    // The acceptance question is legibility at the field desk's 22. The badge
    // was a struck object (a 1px dashed ring, a 1.5px star) and strokes are what
    // vanish under downscale; the hat is one even-odd path with no stroke at
    // all, so what survives is the silhouette — a brim and a leaning point.
    const html = renderToStaticMarkup(<CovenSigil size={22} />);
    expect(html).toContain('width="22"');
    expect(html, "a stroke here would be the thing that thins away at 22px").not.toMatch(/stroke/);
    expect(html, "the buckle cluster reads as holes, which needs even-odd").toContain("evenodd");
  });
});
