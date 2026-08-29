/**
 * THE SEAM: the tile must name no TOKEN its own task card does not (#2328).
 *
 * A SOURCE sweep, not a ratio — the seam #2322 opened for S.N.I.D.E., asked at
 * the sharpened grain #2321's five finished children paid for. WOW is the case
 * that proves why the epic's original wording ("no token FAMILY its task card
 * does not use") is not enough: this tile had no forked family at all. Its
 * ground, its two inks and both its faces were already the decree's. What it
 * had was eight stray NAMES inside families that are otherwise shared, and a
 * family-grained sweep is vacuously true of every one of them.
 *
 * WHAT IT CAUGHT, before the repaint:
 *
 *   --faction-wow-chronicle-border   a synonym for the frame the card spells
 *                                    `-chronicle-gold` (rider 1 below)
 *   --faction-wow-chronicle-shadow   a hand-rolled lift where the card declares
 *                                    a whole `-quest-shadow`
 *   --faction-wow-chip-bg            the FACTION PAGE kit's tag plate, for the
 *   --faction-wow-chip-border        role the decree's crowned plaque answers
 *   --faction-wow-avatar-pill-from   the AVATAR's gilt lozenge, worn as a CTA
 *   --faction-wow-avatar-pill-to     the card had already ruled against
 *   --faction-wow-avatar-pill-text   ("the design's `ctaGold` A/B prop is not
 *   --faction-wow-gilt-border         shipped", WowTaskCard)
 *
 * Every one of those is live, declared and measured in both cascades — the gilt
 * CTA read 8.98:1 — so no lint, no census and no contrast sweep could see any of
 * it. Only the NAME can.
 *
 * ── WHAT COUNTS AS THE TASK CARD'S REGISTER ────────────────────────────────
 *
 * The card AS RENDERED, which for WOW is two sources: `WowTaskCard.tsx` itself
 * (its module-level `MED` / `GOLD` / `PLUM_SURFACE` aliases included, since a
 * text scan of one file sees them anyway) and `WowBand` in
 * `cardMasthead/factionBands` — the masthead carries the plum ground and the
 * gilt lettering, and neither is spelt in the card. ONLY WOW's band: the reach
 * is by reference from `WowBand` outward, so Coven's pink and the Ephemerists'
 * brass never enter this faction's register.
 *
 * IT IS NOT "every module the card mounts", and for WOW the boundary is the
 * load-bearing one. `factionMarks/wowOrnament` draws the balloon knights out of
 * a nine-token balloon ramp, and `WowSigil` draws the crest out of fifteen
 * `--faction-wow-crest-*` names. A sweep that walked into every drawn mark would
 * pronounce a tile painted in balloon pink or crest-rim brown legal. A mark's
 * INTERIOR is the mark's own business (#2325's cauldron finding); what this test
 * governs is the card's REGISTER — the ground it prints on, the inks on that
 * ground, the frame, the lift, the faces and the masthead.
 *
 * ── THE THREE RIDERS ───────────────────────────────────────────────────────
 *
 * 1. A SYNONYM IS PROVEN, NOT WAIVED. `--faction-wow-chronicle-border` is
 *    declared `var(--faction-wow-chronicle-gold)`, so "the frame did not really
 *    change" is a claim about index.css, not about this file. It is asserted
 *    below against the declarations rather than taken on trust — and the tile
 *    now spells the card's name regardless, so the sweep does not depend on it.
 * 2. RESOLVE THE BINDINGS TRANSITIVELY. Coven's tile spelt no `--faction-` name
 *    at all. WOW's spells them inline — but that is a property of today's file,
 *    not a licence, so the tile's import list is pinned: nothing it imports can
 *    carry paint, which is what makes a text scan the transitive answer here.
 * 3. DRAW THE REGISTER'S EDGE DELIBERATELY — the marks paragraph above.
 *
 * No DOM — reading the sources is enough, which is well under the harness's
 * `renderToStaticMarkup` ceiling.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { FACTION_ROLES, factionRoleVar } from "../../../utils/factionRoles";
import { readThemes, resolveVar, stripComments } from "../../../utils/__tests__/cssVars";
import { readIndexCss } from "../../../test/indexCss";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** Comments are the decision record and cite the retired names on purpose. */
const code = (relative: string): string => stripComments(read(relative));

/** One faction's CTA constant, sliced out of the module that holds all eight. */
function ctaSource(name: string): string {
  const module = code("../../taskCard/cardCta.ts");
  const at = module.indexOf(`export const ${name}`);
  expect(at, `no \`${name}\` in taskCard/cardCta.ts`).toBeGreaterThan(-1);
  return module.slice(at, module.indexOf("\n};", at));
}

const TILE = "../WowSelectCard.tsx";
/**
 * Rider 2's one genuine case: `utils/factionRoles` DOES hand a file paint, and
 * a text scan cannot see it (#2674).
 *
 * `factionRoleVars('wow', <prefix>)` declares WOW's nine core roles on a root
 * by INTERPOLATION, so `--faction-wow-card-bg` never appears in the source as a
 * name. Resolving it is exact rather than approximate, which is what keeps this
 * sweep the transitive answer: the resolver can emit this faction's nine core
 * roles and nothing else — not another family, not another faction — so a tile
 * that adopts it cannot smuggle an off-register name in behind it.
 */
const ROLE_MAP_PROPS = FACTION_ROLES.map((role) =>
  factionRoleVar("wow", role).replace(/^var\(|\)$/g, ""),
);

/** Faction paint. House tokens — spacing, the type ramp, radii — are everyone's. */
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

/** One import statement: the module it reads, and the names taken from it. */
interface TileImport {
  from: string;
  names: string[];
}

/**
 * The tile's imports, read per BINDING. A default or namespace clause yields its
 * own single name (`i18n`, `* as factions`), so neither can wear a named
 * import's clothes to slip past the allowlist below.
 */
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
 * Rider 2's pin. A bare string admits the module wholesale; an entry carrying
 * `bindings` admits ONLY those names from it (#2841) — because a module's string
 * helpers and its paint helpers sit side by side, so a path-grained allowlist
 * admitted every export of a file the moment one safe name was taken from it.
 */
const ALLOWED_IMPORTS: readonly (string | { from: string; bindings: readonly string[] })[] = [
  "../../i18n",
  // Resolved, not waived: `ROLE_MAP_PROPS` above adds the nine names this
  // one declares by interpolation to every scan (#2674).
  "../../utils/factionRoles",
  // Resolved, not waived, and pinned to the BINDING: `redactableText` reads the
  // copy catalog through the Albescent gate (#2806). It returns a STRING and
  // names no token. The module's paint helpers — `factionFill`, `factionCssVar`,
  // `factionSpectrumSheet` — are NOT admitted alongside it, which is the whole
  // reason this entry names the binding rather than the path (#2841).
  { from: "../../utils/factions", bindings: ["redactableText"] },
  "../sigil/WowSigil",
  // The CTA's paint, which is the TASK CARD's since #2818 and is resolved
  // the same way: the case below reads `WOW_CARD_CTA`'s own body, so the
  // call is still pinned to a face and a size, one module further along.
  "../taskCard/cardCta",
  "./FactionSelectCard",
];

/**
 * The two invariants this file used to assert here — the fluid 360x300 box
 * (#732) and "names no TOKEN its own task card does not" (#2321) — now live
 * in `everySelectTileWearsItsCardsRegister.test.ts`, derived over all nine
 * kits including the `Default`-backed tile this suite could not reach
 * (#2816). This file keeps everything bespoke to WOW.
 */
describe("the WOW tile wears the quest decree's register (#2328)", () => {
  it("takes the page kit's and the avatar's plates off the tile for good", () => {
    // The specific strays, named. The sweep above would also pass if one of
    // these were ever added to the task card; this says the tile does not want
    // them either way — a pledge placard is a CARD, and the decree is the card
    // this faction already drew.
    const painting = [...tokensPainting(TILE)];
    expect(
      painting.filter((prop) => /^--faction-wow-(chip|gilt|avatar|plate|ground)-/.test(prop)),
      "the chip/gilt/avatar/plate/ground families belong to the faction PAGE and the avatar; the chronicle families are the card's",
    ).toEqual([]);
  });

  it("proves the frame synonym rather than waiving it", () => {
    // Rider 1. The frame moved from `-chronicle-border` to `-chronicle-gold`
    // and the PR says that repaints zero pixels. That is a claim about
    // index.css, so it is measured there — in BOTH cascades, because an alias
    // may be restated under `[data-theme="dark"]` and quietly stop being one.
    const themes = readThemes(readIndexCss());
    for (const theme of ["light", "dark"] as const) {
      expect(
        resolveVar("--faction-wow-chronicle-border", theme, themes),
        `${theme}: the frame swap is only a no-op while these two resolve equal`,
      ).toBe(resolveVar("--faction-wow-chronicle-gold", theme, themes));
    }
  });

  it("imports nothing that could be carrying paint", () => {
    // Rider 2. Coven's tile spelt no `--faction-` name at all — every colour
    // arrived as an imported JS constant, so a grep for `--` reported it clean
    // in the broken state AND the fixed one. This tile spells its names inline,
    // which is what makes the text scan above the transitive answer; pin the
    // import list so that stays true rather than merely being true today.
    // Asked per BINDING since #2841: `utils/factions` exports paint helpers
    // beside the one string helper this tile takes, so a path-grained answer
    // admitted `factionFill` the moment `redactableText` was let in.
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
    // READ AT THE CONSTANT SINCE #2818. The tile spreads `WOW_CARD_CTA` and adds
    // no paint, so the face and the size are spelt once, in `cardCta.ts` — and
    // reading them there is what makes this case measure the CALL again rather
    // than the banner above it, which happens to be set the same way.
    // The constant asks for the role as a CALL rather than as a `var()` read, so
    // the fold is `factionRoleVar` itself — resolved through the one seam, never
    // a second table.
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
