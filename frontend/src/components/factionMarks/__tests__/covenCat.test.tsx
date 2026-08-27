/**
 * The Coven watermark is ONE drawing, on every surface that turns it (#2041).
 *
 * The pentacle became a cat, and the owner ruling behind that swap is not about
 * the artwork — it is that a player moving between two Coven pages may not meet
 * two different watermarks. #2041 states that ruling over a mount list of two
 * (`CovenTaskCard`, `CovenProfileBody`); `grep` says five, because both detail
 * pages and the praxis composer draw it too. The ruling is what generalises, so
 * all five swapped.
 *
 * That is exactly the shape that decays one mount at a time, and a render test
 * cannot see it: a sixth surface pasting the old pentacle path renders fine,
 * typechecks fine, and is only wrong when you hold two pages side by side. So
 * this is a source scan — cheap enough to keep, and it reads the thing that
 * actually went wrong.
 *
 * Two assertions, and the second is the one with a future:
 *
 *   1. the retired pentagram path appears in no component; and
 *   2. every `.cvn-wheel` mount in the app comes from {@link CovenCat}.
 *
 * (2) is deliberately not "no inline `<svg className="cvn-wheel">`" — it is the
 * positive form, so a mount drawing some THIRD device under the class fails as
 * loudly as one drawing the pentagram again.
 *
 * SCOPE is the WATERMARK, and always was. When this was written the faction had
 * a second pentagram — the `SigilMark` badge — which was out of scope here
 * because it sat in a header as a mark of identity and never turned. That badge
 * is now retired outright and the hat is the faction's one mark;
 * `covenBadgeRetired.test.tsx` guards that. This file is still only about the
 * thing under `.cvn-wheel`.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import { CovenCat } from "../covenSlip";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** The five-pointed star every Coven surface used to turn. */
const PENTAGRAM = "M50 12 L73.5 84.3 L11.9 39.7 L88.1 39.7 L26.5 84.3 Z";

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

describe("the Coven watermark", () => {
  it("draws the retired pentagram nowhere", () => {
    const offenders = FILES.filter(([, source]) => source.includes(PENTAGRAM)).map(([path]) => path);
    expect(offenders, "the watermark pentagram survives in these files").toEqual([]);
  });

  it("is mounted only through CovenCat", () => {
    // The class as a `className`, not the string — every one of these files
    // discusses `.cvn-wheel` in a comment and should go on doing so.
    // `covenSlip.tsx` is where it legitimately appears as a literal.
    const worn = /className\s*[=:]\s*["'`{ ]*["'`]?cvn-wheel/;
    const offenders = FILES.filter(
      ([path, source]) => worn.test(source) && !path.endsWith("covenSlip.tsx"),
    ).map(([path]) => path);
    expect(offenders, "these mount `.cvn-wheel` without going through CovenCat").toEqual([]);
  });

  it("keeps the class that owns the turn and the reduced-motion gate", () => {
    // index.css carries `@keyframes cvn-wheel` and the
    // `prefers-reduced-motion: no-preference` guard around it; the mark's only
    // job is to wear the class (#911 — no component-injected <style>).
    expect(renderToStaticMarkup(<CovenCat size={190} />)).toContain('class="cvn-wheel"');
  });

  it("is decoration, so it carries no accessible name", () => {
    const html = renderToStaticMarkup(<CovenCat size={190} />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("<title");
    expect(html).not.toContain("aria-label");
  });

  it("keeps the whole face inside its box", () => {
    // The design's reason for re-placing the mark: "a face can't bleed off the
    // card the way the pentacle did." Every coordinate is inside 0..100, so a
    // mount that sits the box on its container cannot clip the drawing.
    const numbers = renderToStaticMarkup(<CovenCat size={190} />)
      .match(/d="([^"]+)"/g)!
      .flatMap((d) => d.match(/-?\d+(\.\d+)?/g)!.map(Number));
    expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...numbers)).toBeLessThanOrEqual(100);
  });
});
