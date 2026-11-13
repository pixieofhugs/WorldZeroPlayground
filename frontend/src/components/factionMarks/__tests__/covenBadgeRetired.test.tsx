/**
 * Coven wears one identity mark, the witch hat (#2726); the pentagram badge
 * (`SigilMark`) is retired. A source scan, because a revived private re-draw
 * renders fine (see `covenCat.test.tsx`). The name check and the drawing check
 * are a pair, so a renamed revival fails too. The star scan is tree-wide
 * (#2746). `Spark` and `CovenCat` are out of scope.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import { CovenSigil } from "../../sigil/CovenSigil";
import { sourceFiles } from "../../../test/sourceScan";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** The badge's star, 44-unit box. */
const BADGE_STAR = "M22 8 L30.2 33.3 L8.7 17.7 L35.3 17.7 L13.8 33.3 Z";

/**
 * Comments stripped so a tombstone note may name what it buries. `//` only at
 * line start, so `https://` in a string survives.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const FILES = sourceFiles({ dir: SRC, includeTests: true })
  .filter((path) => !/\.test\.tsx?$/.test(path))
  .map((path) => [path, withoutComments(readFileSync(path, "utf8"))] as const);

function code(relative: string): string {
  return readFileSync(join(SRC, relative), "utf8");
}

/** The badge's six mounts and their sizes. */
const MOUNTS: [file: string, size: string][] = [
  ["components/factionHero/CovenFactionHero.tsx", "74"],
  ["pages/taskDetail/archetypes/CovenTaskDetail.tsx", "30"],
  ["pages/factionDetail/archetypes/CovenFactionBody.tsx", "26"],
  ["components/duel/CovenDuelSealConfirm.tsx", "26"],
  ["pages/characterPaths/archetypes/CovenCreateCharacter.tsx", "BADGE"],
  ["pages/fieldDesk/mobileArchetypes/CovenFieldDesk.tsx", "22"],
];

const COMPOSER = "pages/editPraxis/archetypes/CovenEditPraxis.tsx";

describe("Coven's retired pentagram badge (#2726)", () => {
  it("draws its star in no source file at all — the scan is tree-wide (#2746)", () => {
    const offenders = FILES.filter(([, source]) => source.includes(BADGE_STAR)).map(
      ([path]) => path,
    );
    expect(
      offenders,
      "the badge drawing survives in these files under some other name",
    ).toEqual([]);
  });

  it("turns the composer masthead on the kit's ONE turning device, at its own tempo", () => {
    const composer = code(COMPOSER);
    // Assert the mount, not the class: a private `cvn-wheel` svg would fork it.
    expect(composer, "the masthead badge is not the cat").toContain("<CovenCat size={MAST_CAT}");
    expect(
      withoutComments(composer),
      "a per-mount duration is a second device wearing the cat's name — the kit turns at 120s",
    ).not.toContain("--ep-spin-dur");
  });

  it("hands all six of its mounts to `CovenSigil`, each at the size it asked the badge for", () => {
    for (const [file, size] of MOUNTS) {
      expect(code(file), `${file} draws no mark at all`).toContain(`<CovenSigil size={${size}}`);
    }
  });

  it("loses no hairline at 22px, the smallest mount — the hat is fill-only", () => {
    // Strokes vanish under downscale; the hat is one even-odd fill.
    const html = renderToStaticMarkup(<CovenSigil size={22} />);
    expect(html).toContain('width="22"');
    expect(html, "a stroke here would be the thing that thins away at 22px").not.toMatch(/stroke/);
    expect(html, "the buckle cluster reads as holes, which needs even-odd").toContain("evenodd");
  });
});
