/**
 * THE SEAM: the tile and its task card must name ONE token family (#2325).
 *
 * A SOURCE sweep, not a ratio — the same seam #2322 opened for S.N.I.D.E., but
 * Coven needs it resolved one level deeper and the issue says why: this tile
 * "names no faction token family at all — its colour arrives as JS constants
 * from `components/factionMarks/covenSlip`". A grep for `--faction-` in the tile
 * finds NOTHING, in either the broken state or the fixed one. So the sweep
 * follows each imported constant back to the custom properties behind it,
 * transitively, and asks the epic's question of those.
 *
 * WHAT IT CAUGHT. The status chip spread `covenSlip`'s `SLIP_PANEL`, whose
 * background is `CARD` — `--faction-coven-ward-card`, the faction DETAIL page's
 * paper. A second surface's ground, boxed up and laid on the slip. Both families
 * are real, declared, measured tokens, so no lint, no census and no contrast
 * sweep could see it; only "does the tile name a family its task card does not?"
 * can.
 *
 * ── WHAT COUNTS AS THE TASK CARD'S REGISTER ────────────────────────────────
 *
 * The card AS RENDERED, which for Coven is three sources: `CovenTaskCard.tsx`
 * itself, the `covenSlip` exports IT imports (resolved the same way), and
 * `CovenBand` in `cardMasthead/factionBands` — the masthead carries the hand
 * face and the sigil's ground, and neither is spelt in the card.
 *
 * IT IS NOT "every module the card mounts", and the boundary is load-bearing
 * rather than convenient. `CovenCauldron` also fills its belly with `CARD`, so a
 * sweep that walked into every drawn mark would have pronounced the ward panel
 * legal. A mark's INTERIOR is the mark's own business — the cauldron is a pot
 * with paper inside it, and `factionContrast.test.ts` measures that as its own
 * pairing ("coven cauldron belly, total figure"). What this test governs is the
 * card's REGISTER: the ground it prints on, the inks on that ground, the rule,
 * the faces and the masthead. `CovenSigil` and `CovenCauldron` are marks and are
 * out for the same reason.
 *
 * No DOM — reading the sources is enough, which is well under the harness's
 * `renderToStaticMarkup` ceiling.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { stripComments } from "../../../utils/__tests__/cssVars";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** Comments are the decision record and cite the retired names on purpose. */
const code = (relative: string): string => stripComments(read(relative));

const TILE = "../CovenSelectCard.tsx";
const TASK_CARD = "../../taskCard/CovenTaskCard.tsx";
const SLIP = "../../factionMarks/covenSlip.tsx";
const BANDS = "../../cardMasthead/factionBands.tsx";

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

/**
 * The custom properties a binding paints with, following the module's own
 * aliases. One level of grep would have missed the whole finding twice over:
 * `SLIP_PANEL` spelt no property itself — it reached `CARD`, `BORDER` and
 * `SHADOW`, and only `CARD` was a stranger — and `CovenBand` keeps its Caveat
 * and its twinkle gold in module-level bindings beside it rather than in its own
 * body.
 */
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

/** Faction paint. House tokens — spacing, the type ramp, radii — are everyone's. */
const isFactionPaint = (prop: string): boolean =>
  prop.startsWith("--faction-") || prop.startsWith("--font-faction-");

function tokensPainting(relative: string): Set<string> {
  const source = code(relative);
  const props = propsBehind(SLIP_DECLS, slipImports(source));
  for (const [, prop] of source.matchAll(/(--[a-z0-9-]+)/g)) props.add(prop);
  return new Set([...props].filter(isFactionPaint));
}

function registerTokens(): Set<string> {
  const bandDecls = declarations(code(BANDS));
  expect(
    [...bandDecls.keys()],
    "no `CovenBand` in cardMasthead/factionBands.tsx",
  ).toContain("CovenBand");
  // ONLY Coven's band. `factionBands` holds all seven, and the reach is by
  // reference from `CovenBand` outward, so WOW's plum and the Ephemerists'
  // brass never enter this faction's register.
  const props = tokensPainting(TASK_CARD);
  for (const prop of propsBehind(bandDecls, ["CovenBand"])) {
    if (isFactionPaint(prop)) props.add(prop);
  }
  return props;
}

describe("the Coven tile wears the spell slip's register (#2325)", () => {
  it("names no token family its own task card does not", () => {
    const register = registerTokens();
    const strays = [...tokensPainting(TILE)].filter((prop) => !register.has(prop));

    expect(
      strays,
      `Each name is a token the DIRECTORY TILE paints with — directly, or through
a \`covenSlip\` constant — and the TASK CARD never names. That is the shape
#2321 calls a forked family, and Coven's instance was
\`--faction-coven-ward-card\` arriving through \`SLIP_PANEL\`: the faction
DETAIL page's paper, boxed up and laid on the slip. Fix it by finding the
\`--faction-coven-slip-*\` role that answers the same question, or by saying
in the PR that the task card has no answer — not by widening this test.`,
    ).toEqual([]);
  });

  it("takes the ward family off the tile for good", () => {
    // The specific fork, named. The sweep above would also pass if `CARD` were
    // ever added to the task card; this says the tile does not want it either
    // way — the ward is the detail page's ground, not a card's.
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

  it("keeps the fluid 360x300 box the directory grid is built on (#732)", () => {
    // Not a colour question, and the one geometry the epic promised not to move:
    // the 375px single-column mobile directory depends on all three.
    const source = code(TILE);
    expect(source).toContain('width: "100%"');
    expect(source).toContain("maxWidth: 360");
    expect(source).toContain("minHeight: 300");
    expect(source, "a fixed height would break the phone column").not.toMatch(/\bheight: 300\b/);
  });
});
