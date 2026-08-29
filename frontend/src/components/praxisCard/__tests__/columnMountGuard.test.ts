/**
 * No praxis-card mount may be the direct child of a COLUMN flex container (#2149).
 *
 * `frameBase` carries `flex: 1 1 var(--praxis-card-basis, 394px)` (#1137).
 * `flex-basis` sizes along the MAIN axis, so that 394px is a width in a row —
 * which is every surface it was written for — and a HEIGHT the moment the
 * container is a column. In a column stack with an auto height there is no free
 * space to grow into, so each card is pinned at exactly 394px tall: whitespace
 * under a short card, and on the two archetypes whose frame is `overflow:
 * hidden` (WOW, Albescent) the byline and vote row are simply cut off.
 *
 * WHY THE GUARD IS AT THE MOUNT AND NOT IN `frameBase`. The obvious fix — move
 * the 394 off the basis onto `width` and pin `flex: 0 0 auto` — was measured
 * against the surfaces that mount the card and rejected: the feed rows (`Home`,
 * `/praxis` on both form factors, `DefaultFactionBody`) are direct-child flex
 * rows that GROW the card to fill the line, and `flex-shrink: 0` at a fixed
 * 394px would also overflow a phone sideways. `width: 100%` is load-bearing too
 * — the six faction bodies and both profile bodies nest the card in a
 * `position: relative` wrapper and let it fill that wrapper, which is what keeps
 * the wrapper's absolutely-positioned Task Crown on the card's corner. No
 * item-side declaration can tell a row from a column, so the axis is the
 * CONTAINER's business, exactly as `--praxis-card-basis` already is.
 *
 * CEILING (`renderToStaticMarkup`, no jsdom, no layout, no computed styles):
 * clipping is a layout fact and cannot be observed in this harness. This scans
 * the source instead and pins the one structural precondition for it — the card
 * being a flex item on a column main axis. It cannot prove nothing is clipped;
 * it proves no mount is shaped so that it can be.
 */
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { sourceFiles, toRelative } from "../../../test/sourceScan";

/** A line that opens a JSX element — the mount's nearest enclosing candidate. */
const OPENS_ELEMENT = /^<[A-Za-z]/;

/**
 * The full text of the element that encloses `line`, opening tag only.
 *
 * Walking back from a mount, everything between it and its parent's opening tag
 * is a `{...map(...)}`, a comment or a conditional — never another element open
 * — so the first line that starts with a tag IS the parent. That tag may span
 * several lines (attributes one per line), so read forward to the `>` that ends
 * it.
 */
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
    // A rename or a moved directory must fail loudly here, not quietly stop
    // checking. The number is a floor, not a fixture: adding a surface is fine.
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
