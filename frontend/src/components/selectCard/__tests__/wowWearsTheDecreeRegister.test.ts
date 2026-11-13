/**
 * The WOW tile names no TOKEN its own task card does not (#2328). A name-grained
 * sweep: WOW had no forked family, only stray names (chip/gilt/avatar plates,
 * `-chronicle-border`) inside shared ones, all live and AA-passing.
 *
 * Register = `WowTaskCard.tsx` + `WowBand`. Not the marks it mounts: a mark's
 * interior (balloon ramp, crest) is its own business (#2325).
 *
 * Riders: (1) the frame synonym is proven in index.css, not waived; (2) the
 * tile's imports are pinned so a text scan stays the transitive answer.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { FACTION_ROLES, factionRoleVar } from "../../../utils/factionRoles";
import { readThemes, resolveVar, stripComments } from "../../../utils/__tests__/cssVars";
import { readIndexCss } from "../../../test/indexCss";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** Comments cite retired names on purpose. */
const code = (relative: string): string => stripComments(read(relative));

function ctaSource(name: string): string {
  const module = code("../../taskCard/cardCta.ts");
  const at = module.indexOf(`export const ${name}`);
  expect(at, `no \`${name}\` in taskCard/cardCta.ts`).toBeGreaterThan(-1);
  return module.slice(at, module.indexOf("\n};", at));
}

const TILE = "../WowSelectCard.tsx";
/**
 * `factionRoleVars('wow', …)` hands paint by INTERPOLATION (#2674), invisible to
 * a text scan; it can emit only WOW's nine roles, so resolving it is exact.
 */
const ROLE_MAP_PROPS = FACTION_ROLES.map((role) =>
  factionRoleVar("wow", role).replace(/^var\(|\)$/g, ""),
);

/** House tokens (spacing, type ramp, radii) are everyone's. */
const isFactionPaint = (prop: string): boolean =>
  prop.startsWith("--faction-") || prop.startsWith("--font-faction-");

function tokensPainting(relative: string): Set<string> {
  const source = code(relative);
  const props = new Set<string>();
  for (const [, prop] of source.matchAll(/(--[a-z0-9-]+)/g)) props.add(prop);
  if (/factionRoleVars\(\s*["']wow["']/.test(source)) {
    for (const prop of ROLE_MAP_PROPS) props.add(prop);
  }
  return new Set([...props].filter(isFactionPaint));
}

interface TileImport {
  from: string;
  names: string[];
}

/** Per BINDING; a default/namespace clause yields its own single name. */
function importsOf(source: string): TileImport[] {
  return [...source.matchAll(/^import (?:type )?(.*?) from "([^"]+)";$/gm)].map((match) => ({
    from: match[2],
    names: match[1]
      .replace(/^\{|\}$/g, " ")
      .split(",")
      .map((name) => name.replace(/^type /, "").trim())
      .filter(Boolean),
  }));
}

/**
 * A bare string admits the module; `bindings` admits ONLY those names (#2841),
 * since string helpers and paint helpers share modules.
 */
const ALLOWED_IMPORTS: readonly (string | { from: string; bindings: readonly string[] })[] = [
  "../../i18n",
  // Resolved via `ROLE_MAP_PROPS` (#2674).
  "../../utils/factionRoles",
  // Names one token (`--faction-wow-body-font`) and no colour.
  { from: "../../utils/factionBodyFace", bindings: ["factionBodyVars"] },
  // Returns a string, names no token (#2806); paint helpers stay out (#2841).
  { from: "../../utils/factions", bindings: ["redactableText"] },
  "../sigil/WowSigil",
  // Seal + ornament drawings (#3144); a mark's interior isn't governed here.
  "../factionMarks/WowSelectMarks",
  // Structure only (#3139).
  "./selectCardBlocks",
  // The task card's CTA paint (#2818); read at the constant below.
  "../taskCard/cardCta",
  "./FactionSelectCard",
];

/** Box + register invariants live in `everySelectTileWearsItsCardsRegister` (#2816). */
describe("the WOW tile wears the quest decree's register (#2328)", () => {
  it("takes the page kit's and the avatar's plates off the tile for good", () => {
    // Banned even if the task card ever adopts them.
    const painting = [...tokensPainting(TILE)];
    expect(
      painting.filter((prop) => /^--faction-wow-(chip|gilt|avatar|plate|ground)-/.test(prop)),
      "the chip/gilt/avatar/plate/ground families belong to the faction PAGE and the avatar; the chronicle families are the card's",
    ).toEqual([]);
  });

  it("proves the frame synonym rather than waiving it", () => {
    // Rider 1, in BOTH cascades: dark may restate the alias.
    const themes = readThemes(readIndexCss());
    for (const theme of ["light", "dark"] as const) {
      expect(
        resolveVar("--faction-wow-chronicle-border", theme, themes),
        `${theme}: the frame swap is only a no-op while these two resolve equal`,
      ).toBe(resolveVar("--faction-wow-chronicle-gold", theme, themes));
    }
  });

  it("imports nothing that could be carrying paint", () => {
    // Rider 2: an imported JS colour constant would be invisible to the scan.
    const source = code(TILE);
    const imports = importsOf(source);

    expect(
      imports.length,
      "an import split over several lines would slip this scan entirely",
    ).toBe((source.match(/^import /gm) ?? []).length);

    expect(
      imports.map((entry) => entry.from).sort(),
      "a new import here needs `propsBehind` resolving it, the way #2325 resolves `covenSlip`",
    ).toEqual(
      ALLOWED_IMPORTS.map((entry) => (typeof entry === "string" ? entry : entry.from)).sort(),
    );

    for (const entry of ALLOWED_IMPORTS) {
      if (typeof entry === "string") continue;
      const taken = imports.filter((i) => i.from === entry.from).flatMap((i) => i.names);
      expect(
        taken.filter((name) => !entry.bindings.includes(name)),
        `\`${entry.from}\` is admitted for { ${entry.bindings.join(", ")} } and nothing
else: each of those names is resolved above, and every other export of that module
is unresolved paint as far as this sweep is concerned. Widen the binding set only
with the same proof the listed ones carry — never because the path is on the list.`,
      ).toEqual([]);
    }
  });

  it("badges itself with the canonical crest, never a re-drawn one", () => {
    const source = code(TILE);
    expect(source, "the mark is the shared `WowSigil`").toContain("WowSigil");
    expect(source, "a sigil is never re-drawn inline (#2321)").not.toContain("<svg");
  });

  it("sets the call in the decree's own face and size", () => {
    // Read at the constant (#2818): the tile spreads `WOW_CARD_CTA` unchanged.
    const cta = ctaSource("WOW_CARD_CTA");
    expect(cta, "the face is asked for as the `face` ROLE (#2674)").toContain(
      'fontFamily: factionRoleVar("wow", "face")',
    );
    expect(factionRoleVar("wow", "face"), "and that role is MedievalSharp").toBe(
      "var(--faction-wow-card-font)",
    );
    expect(cta, "the decree's CTA IS `--text-content`").toContain(
      'fontSize: "var(--text-content)"',
    );
    expect(
      code(TILE),
      "the raw 16 was a `no-raw-style-values` exemption arguing a label token would flatten the placard; the decree's CTA IS `--text-content`, so the exemption went with it",
    ).not.toContain("local/no-raw-style-values -- ornament: the CTA");
  });
});
