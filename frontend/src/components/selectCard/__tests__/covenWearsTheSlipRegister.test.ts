/**
 * The Coven tile and its task card name ONE token family (#2325). The tile's
 * colour arrives as `covenSlip` JS constants, so a `--faction-` grep finds
 * nothing; the sweep follows each import back to its custom properties.
 *
 * Register = `CovenTaskCard` + the `covenSlip` exports it imports + `CovenBand`.
 * Marks (`CovenCauldron`, `CovenSigil`) are out: the cauldron's belly uses the
 * ward `CARD` and is measured as its own pairing.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { stripComments } from "../../../utils/__tests__/cssVars";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** Comments cite retired names on purpose. */
const code = (relative: string): string => stripComments(read(relative));

const TILE = "../CovenSelectCard.tsx";
const SLIP = "../../factionMarks/covenSlip.tsx";

/** Every top-level binding in a module, mapped to its own declaration text. */
function declarations(source: string): Map<string, string> {
  const heads = [...source.matchAll(/^(?:export (?:default )?)?(?:const|function) ([A-Za-z_$][\w$]*)/gm)];
  return new Map(
    heads.map((head, i) => [
      head[1],
      source.slice(head.index!, i + 1 < heads.length ? heads[i + 1].index! : source.length),
    ]),
  );
}

/** The names a module pulls out of `covenSlip`. */
function slipImports(source: string): string[] {
  const clause = source.match(/import \{([^}]*)\} from "[^"]*covenSlip"/);
  expect(clause, "no `covenSlip` import clause to resolve").not.toBeNull();
  return clause![1]
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

const SLIP_DECLS = declarations(code(SLIP));

/** Custom properties behind a binding, following aliases transitively (`SLIP_PANEL` → `CARD`). */
function propsBehind(
  decls: Map<string, string>,
  names: readonly string[],
  seen = new Set<string>(),
): Set<string> {
  const found = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) continue;
    seen.add(name);
    const declaration = decls.get(name);
    if (!declaration) continue;
    for (const [, prop] of declaration.matchAll(/(--[a-z0-9-]+)/g)) found.add(prop);
    const onward = [...decls.keys()].filter(
      (other) => other !== name && new RegExp(`\\b${other}\\b`).test(declaration),
    );
    for (const prop of propsBehind(decls, onward, seen)) found.add(prop);
  }
  return found;
}

/** House tokens (spacing, type ramp, radii) are everyone's. */
const isFactionPaint = (prop: string): boolean =>
  prop.startsWith("--faction-") || prop.startsWith("--font-faction-");

function tokensPainting(relative: string): Set<string> {
  const source = code(relative);
  const props = propsBehind(SLIP_DECLS, slipImports(source));
  for (const [, prop] of source.matchAll(/(--[a-z0-9-]+)/g)) props.add(prop);
  return new Set([...props].filter(isFactionPaint));
}

/** Box + register invariants live in `everySelectTileWearsItsCardsRegister` (#2816). */
describe("the Coven tile wears the spell slip's register (#2325)", () => {
  it("takes the ward family off the tile for good", () => {
    // Banned even if the task card ever adopts `CARD`.
    expect(
      [...tokensPainting(TILE)].filter((prop) => prop.startsWith("--faction-coven-ward-")),
      "the ward family is the faction DETAIL page's; the slip family is the card's",
    ).toEqual([]);
  });

  it("badges itself with the canonical sigil, not the stood-down pentagram", () => {
    const source = code(TILE);
    expect(source, "the mark is the shared `CovenSigil`, never re-drawn inline").toContain("CovenSigil");
    expect(
      source,
      "`SigilMark` was the pentagram badge the card kit stood down when the bands were built (CardMasthead, #2029). It kept four non-card mounts then and lost those too at #2726, so the name should not resolve at all now — this guards the tile against a paste from an old branch",
    ).not.toContain("SigilMark");
  });

  it("sets the hand face at a token, not at a raw size", () => {
    const source = code(TILE);
    expect(source, "the wordmark takes `CovenBand`'s own `--text-title`").toContain(
      'fontSize: "var(--text-title)"',
    );
    expect(
      source,
      "Caveat ships at 400 only (`fonts.faction.css`), so a 700 here is a synthesised faux bold",
    ).not.toMatch(/fontWeight: 700[\s\S]{0,120}HAND|HAND[\s\S]{0,120}fontWeight: 700/);
  });
});
