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
 * THE REMAINDER IS NOW EMPTY (#2746). This note used to record two surviving
 * pentagram drawings — `feed/CovenFeedFrame` and `editPraxis/CovenEditPraxis`
 * each held a private copy of the badge's star, neither routed through
 * `covenSlip`'s export, so #2726's mount list never saw them — and to say the
 * star scan below was therefore deliberately narrowed to two files. The owner
 * has since ruled all four of those mounts out: the feed head's charm and the
 * composer's glyph scatter and stage mark are `CovenSigil`, and the composer
 * masthead's turning disc is `CovenCat` on `.cvn-wheel`, the kit's one turning
 * device. So the star scan is TREE-WIDE now, which is what that ruling's
 * acceptance line asks for and what a dir-scoped scan has failed to give in
 * this repo before.
 *
 * SCOPE, stated so it is not mistaken for a gap. `Spark` (the four-point
 * sparkle) and `CovenCat` (the turning watermark) are untouched — different
 * devices with different jobs, and `covenSlip`'s own header gives the reason.
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

/**
 * Source with its comments removed, because a TOMBSTONE has to be able to name
 * what it buries. `covenSlip` records the retirement where the drawing stood,
 * which is the repo's own habit (`CovenAvatar` names the `MoonGlyph` it
 * dropped), and a scan that forbade the name in prose would forbid that note.
 *
 * `//` is stripped only at the head of a line, so a `https://` inside a string
 * is never mistaken for one. Block comments go wholesale. What is left is
 * imports, exports and JSX — the three places a revival would actually live.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const FILES = sourceFiles(SRC).map(
  (path) => [path, withoutComments(readFileSync(path, "utf8"))] as const,
);

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

/** The three private re-draws #2746 handed to the hat, and their sizes. */
const LATE_MOUNTS: [file: string, size: string][] = [
  ["components/feed/CovenFeedFrame.tsx", "size.charm"],
  ["pages/editPraxis/archetypes/CovenEditPraxis.tsx", "glyph.size"],
  ["pages/editPraxis/archetypes/CovenEditPraxis.tsx", "40"],
];

const COMPOSER = "pages/editPraxis/archetypes/CovenEditPraxis.tsx";

describe("Coven's retired pentagram badge (#2726)", () => {
  it("is named in no source file — not exported, not imported, not re-drawn", () => {
    // Whole-tree, because a dir-scoped scan has hidden mounts in this repo
    // before. Tests are excluded by `sourceFiles`, comments by
    // `withoutComments` — see that helper for why the second exclusion exists.
    const offenders = FILES.filter(([, source]) => source.includes("SigilMark")).map(([path]) => path);
    expect(offenders, "`SigilMark` survives in these files").toEqual([]);
  });

  it("draws its star in no source file at all — the scan is tree-wide (#2746)", () => {
    // Narrowed to two files under #2726, because two surfaces outside that
    // ruling's mount list still drew it. They do not any more, so what stands
    // here is the guard a private re-draw cannot walk around: the DRAWING,
    // wherever it is pasted, under whatever name it is pasted as.
    const offenders = FILES.filter(([, source]) => source.includes(BADGE_STAR)).map(
      ([path]) => path,
    );
    expect(
      offenders,
      "the badge drawing survives in these files under some other name",
    ).toEqual([]);
  });

  it("hands the three late re-draws to the hat as well (#2746)", () => {
    for (const [file, size] of LATE_MOUNTS) {
      expect(code(file), `${file} draws no hat at ${size}`).toContain(`<CovenSigil size={${size}}`);
    }
  });

  it("turns the composer masthead on the kit's ONE turning device, at its own tempo", () => {
    const composer = code(COMPOSER);
    // `CovenCat` carries `.cvn-wheel`, whose keyframe and reduced-motion gate
    // live in `motion.ornament.css` at 120s. Asserting the MOUNT is what keeps
    // this honest: a private `<svg className="cvn-wheel">` would satisfy a
    // class assertion while forking the drawing all over again. The duration
    // half reads the source with comments stripped, for the reason
    // `withoutComments` exists: the mount's own note has to be able to say
    // which hook it stopped writing.
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
