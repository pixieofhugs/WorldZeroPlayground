/**
 * The Coven watermark is one drawing on every surface that turns it (#2041):
 * a player may not meet two watermarks. A source scan, because a pasted old
 * path renders and typechecks fine. (2) is the positive form, so a third
 * device under `.cvn-wheel` fails too:
 *
 *   1. the retired pentagram path appears in no component; and
 *   2. every `.cvn-wheel` mount comes from {@link CovenCat}.
 *
 * Scope is the watermark; the badge is `covenBadgeRetired.test.tsx`'s.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import { CovenCat } from "../covenSlip";
import { sourceFiles } from "../../../test/sourceScan";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const PENTAGRAM = "M50 12 L73.5 84.3 L11.9 39.7 L88.1 39.7 L26.5 84.3 Z";

const FILES = sourceFiles({ dir: SRC, includeTests: true })
  .filter((path) => !/\.test\.tsx?$/.test(path))
  .map((path) => [path, readFileSync(path, "utf8")] as const);

describe("the Coven watermark", () => {
  it("draws the retired pentagram nowhere", () => {
    const offenders = FILES.filter(([, source]) => source.includes(PENTAGRAM)).map(([path]) => path);
    expect(offenders, "the watermark pentagram survives in these files").toEqual([]);
  });

  it("is mounted only through CovenCat", () => {
    // Match `className`, not the string: comments mention `.cvn-wheel`.
    const worn = /className\s*[=:]\s*["'`{ ]*["'`]?cvn-wheel/;
    const offenders = FILES.filter(
      ([path, source]) => worn.test(source) && !path.endsWith("covenSlip.tsx"),
    ).map(([path]) => path);
    expect(offenders, "these mount `.cvn-wheel` without going through CovenCat").toEqual([]);
  });

  it("keeps the class that owns the turn and the reduced-motion gate", () => {
    // Keyframes + reduced-motion gate live in CSS (#911).
    expect(renderToStaticMarkup(<CovenCat size={190} />)).toContain('class="cvn-wheel"');
  });

  it("is decoration, so it carries no accessible name", () => {
    const html = renderToStaticMarkup(<CovenCat size={190} />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("<title");
    expect(html).not.toContain("aria-label");
  });

  it("keeps the whole face inside its box", () => {
    // Design: "a face can't bleed off the card".
    const numbers = renderToStaticMarkup(<CovenCat size={190} />)
      .match(/d="([^"]+)"/g)!
      .flatMap((d) => d.match(/-?\d+(\.\d+)?/g)!.map(Number));
    expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...numbers)).toBeLessThanOrEqual(100);
  });
});
