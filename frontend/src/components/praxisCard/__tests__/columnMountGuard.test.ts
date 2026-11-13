/**
 * No praxis-card mount may be the direct child of a COLUMN flex container (#2149).
 * `frameBase`'s `flex: 1 1 var(--praxis-card-basis, 394px)` becomes a 394px
 * HEIGHT in a column, clipping `overflow: hidden` cards. Fixing it in
 * `frameBase` was rejected (feed rows grow the card; wrappers rely on
 * `width: 100%`), so the axis is the container's business. No layout here, so
 * this scans source for the precondition.
 */
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { sourceFiles, toRelative } from "../../../test/sourceScan";

/** A line that opens a JSX element — the mount's nearest enclosing candidate. */
const OPENS_ELEMENT = /^<[A-Za-z]/;

/** The opening tag of the element enclosing `line`: the first line back that starts a tag. */
function enclosingTag(lines: string[], line: number): string {
  let open = line - 1;
  while (open >= 0 && !OPENS_ELEMENT.test(lines[open].trim())) open -= 1;
  if (open < 0) return "";
  const tag: string[] = [];
  for (let i = open; i < line; i += 1) {
    tag.push(lines[i].trim());
    if (lines[i].trim().endsWith(">")) break;
  }
  return tag.join(" ");
}

/** `flexDirection: 'column'` (inline style) or Tailwind's `flex-col`. */
const COLUMN = /flexDirection\s*:\s*["']column["']|\bflex-col\b/;

type Mount = { file: string; line: number; tag: string };

/** Doc blocks name the card constantly; only real JSX is a mount. */
const isComment = (text: string) => /^(\*|\/\/|\/\*)/.test(text.trim());

/** The element, not `PraxisCardOut` in a `useState<PraxisCardOut[]>`. */
const MOUNT = /<PraxisCard(?!Out)/;

const mounts: Mount[] = sourceFiles({ match: /\.tsx$/ }).flatMap((file) => {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  return lines.flatMap((text, i) =>
    MOUNT.test(text) && !isComment(text)
      ? [{ file: toRelative(file), line: i + 1, tag: enclosingTag(lines, i) }]
      : [],
  );
});

describe("praxis-card mounts (#2149)", () => {
  it("finds every mount, so the guard cannot pass by scanning nothing", () => {
    // A floor, not a fixture: a rename must fail loudly.
    expect(mounts.length).toBeGreaterThanOrEqual(20);
  });

  for (const { file, line, tag } of mounts) {
    it(`${file}:${line} does not stack the card on a column main axis`, () => {
      expect(
        COLUMN.test(tag),
        `the container at ${file}:${line} is a column flex, so frameBase's ` +
          `flex-basis becomes a height cap on the card. Stack with ` +
          `display: grid (or wrap the card in a block) instead — see #2149.\n` +
          `  ${tag}`,
      ).toBe(false);
    });
  }
});
