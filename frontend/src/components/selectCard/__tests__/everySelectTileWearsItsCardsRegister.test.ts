/**
 * THE SEAM: two of the select-tile invariants are faction-INVARIANT, and
 * before #2816 both were written out by hand in the seven bespoke
 * `*WearsThe*Register.test.ts` files next door — never derived, and never
 * asserted for the `Default`-backed tile (`na`, and by construction
 * `albescent`, which is `DefaultSelectCard` plus a geometry-only wrapper).
 *
 *  1. `keeps the fluid 360x300 box the directory grid is built on (#732)` —
 *     four identical `toContain`/`not.toMatch` calls, copied seven times.
 *  2. `names no token family its own task card does not (#2321)` — the
 *     register rule. The SHAPE of that check is the same seven times over
 *     (does the tile paint with a name its task card's rendered register never
 *     does?), but the RESOLUTION is genuinely bespoke per kit — Coven and the
 *     Ephemerists spell zero literal `--` tokens in their own file, reaching
 *     their palette through a JS module instead, while WOW spells every name
 *     inline. That is `frontend/CLAUDE.md`'s no-unify rule at work: this file
 *     does not flatten those seven recipes into one algorithm — it relocates
 *     each recipe's `strays()` answer here, unmodified, and loops the shared
 *     assertion over it. The seven sibling files keep everything ELSE they
 *     assert (the ward family, the wordmark, the plate register, the CTA
 *     face…); only the two titled invariants above move.
 *
 * Both loops derive their membership from `surfaceMap('factionSelectCard')`
 * — never a typed list (#2815) — so a tenth kit that registers a tile and
 * forgets to wire it into `TILE_PATHS` / `REGISTER` below fails loudly
 * (`TILE_PATHS[slug]` / `REGISTER[slug]` reads `undefined`) instead of
 * silently passing.
 *
 * ── ALBESCENT IS EXCLUDED, NAMED, NOT SILENTLY DROPPED ──────────────────────
 *
 * `AlbescentSelectCard.tsx` is a geometry-only wrapper (#2632): it repeats the
 * `width: 100% / maxWidth: 360` half of invariant 1 as its own flex-item
 * contract, but mounts `minHeight: 300` and every register token by rendering
 * `DefaultSelectCard` — it names no `--faction-` token of its own at all. So
 * a per-file source scan of the wrapper alone would either miss `minHeight`
 * (a false red) or, for the register, vacuously pass on an empty tile
 * (asserting nothing). Covering `na` covers Albescent's tile BY CONSTRUCTION,
 * and `albescentRedactsAndUnlocksTogether` already covers the one thing that
 * IS the wrapper's own — the redaction gate — so a ninth copy here would
 * duplicate one and fake the other.
 *
 * No DOM: `renderToStaticMarkup` is the harness's ceiling and nothing here
 * even needs it — reading the sources is enough, exactly as the seven files
 * this one replaces already established.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { stripComments } from "../../../utils/__tests__/cssVars";
import { surfaceMap } from "../../../factions";
import { ALBESCENT_FACTION_SLUG } from "../../../utils/factions";
import { FACTION_ROLES, factionRoleVar } from "../../../utils/factionRoles";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** Comments are the decision record and cite retired names on purpose. */
const code = (relative: string): string => stripComments(read(relative));

/**
 * The nine registered kits, minus Albescent (see the file header). `na` stays
 * in — it is the whole point of #2816 — and is the row that used to be
 * absent from both invariants.
 */
const SLUGS = Object.keys(surfaceMap("factionSelectCard")).filter(
  (slug) => slug !== ALBESCENT_FACTION_SLUG,
);

const BANDS = "../../cardMasthead/factionBands.tsx";
const CTA_MODULE = "../../taskCard/cardCta.ts";

/* -------------------------------------------------------------------------- */
/* Shared low-level readers — textually identical across the seven originals */
/* -------------------------------------------------------------------------- */

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

/** The custom properties a binding paints with, following the module's own aliases. */
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

/** Every custom property literally spelled in a source, deduplicated. */
function literalProps(source: string): Set<string> {
  return new Set([...source.matchAll(/(--[a-z0-9-]+)/g)].map((match) => match[0]));
}

/**
 * One faction's band, sliced out of the module that holds all nine.
 *
 * The anchor is `function <name>(` and NOT `function <name>()`: what this file
 * reads is which token families a band's SOURCE names, which has nothing to do
 * with whether it takes props. `UaBand` grew one in #2995 — an `inert` arm for
 * the two composer surfaces that mount it inside a `<form>` — and the empty
 * parens made this row fail on a band whose paint had not changed by a byte.
 */
function bandSlice(bandsSource: string, fnName: string): string {
  const at = bandsSource.indexOf(`function ${fnName}(`);
  expect(at, `no \`${fnName}\` in cardMasthead/factionBands.tsx`).toBeGreaterThan(-1);
  return bandsSource.slice(at, bandsSource.indexOf("\n}", at));
}

/** One faction's CTA constant, sliced out of the module that holds all nine. */
function ctaSlice(name: string): string {
  const module = code(CTA_MODULE);
  const at = module.indexOf(`export const ${name}`);
  expect(at, `no \`${name}\` in taskCard/cardCta.ts`).toBeGreaterThan(-1);
  return module.slice(at, module.indexOf("\n};", at));
}

/* -------------------------------------------------------------------------- */
/* Invariant 1 — the fluid 360x300 box (#732)                                 */
/* -------------------------------------------------------------------------- */

/**
 * Tile source per slug. Derived from the ACTUAL registered path, not a
 * capitalisation guess: every one of these is the same file the seven
 * bespoke suites (and `factionSelectCardDispatch.test.tsx`) already name.
 */
const TILE_PATHS: Record<string, string> = {
  coven: "../CovenSelectCard.tsx",
  ephemerists: "../EphemeristsSelectCard.tsx",
  everymen: "../EverymenSelectCard.tsx",
  singularity: "../SingularitySelectCard.tsx",
  snide: "../SnideSelectCard.tsx",
  ua: "../UaSelectCard.tsx",
  wow: "../WowSelectCard.tsx",
  na: "../DefaultSelectCard.tsx",
};

describe("every select tile keeps the fluid 360x300 box the directory grid is built on (#732)", () => {
  it("covers every kit but Albescent's wrapper (see file header)", () => {
    expect(SLUGS.sort()).toEqual(
      ["coven", "ephemerists", "everymen", "na", "singularity", "snide", "ua", "wow"].sort(),
    );
  });

  it.each(SLUGS)("%s", (slug) => {
    const path = TILE_PATHS[slug];
    expect(path, `${slug} has no row in TILE_PATHS — wire its tile in`).toBeDefined();
    const source = code(path);
    // Not a colour question, and the one geometry the epic promised not to
    // move: the 375px single-column mobile directory depends on all three.
    expect(source).toContain('width: "100%"');
    expect(source).toContain("maxWidth: 360");
    expect(source).toContain("minHeight: 300");
    expect(source, "a fixed height would break the phone column").not.toMatch(/\bheight: 300\b/);
  });
});

/* -------------------------------------------------------------------------- */
/* Invariant 2 — names no token family its own task card does not (#2321)     */
/* -------------------------------------------------------------------------- */

/** Faction paint. House tokens — spacing, the type ramp, radii — are everyone's. */
const isFactionPaint = (prop: string): boolean =>
  prop.startsWith("--faction-") || prop.startsWith("--font-faction-");

// ---- coven (#2325) ---------------------------------------------------------

const COVEN_TILE = TILE_PATHS.coven;
const COVEN_TASK_CARD = "../../taskCard/CovenTaskCard.tsx";
const COVEN_SLIP = "../../factionMarks/covenSlip.tsx";

function covenSlipImports(source: string): string[] {
  const clause = source.match(/import \{([^}]*)\} from "[^"]*covenSlip"/);
  return clause ? clause[1].split(",").map((name) => name.trim()).filter(Boolean) : [];
}

function covenPaint(relative: string): Set<string> {
  const source = code(relative);
  const props = propsBehind(declarations(code(COVEN_SLIP)), covenSlipImports(source));
  for (const prop of literalProps(source)) props.add(prop);
  return new Set([...props].filter(isFactionPaint));
}

function covenStrays(): string[] {
  const bandDecls = declarations(code(BANDS));
  const register = covenPaint(COVEN_TASK_CARD);
  for (const prop of propsBehind(bandDecls, ["CovenBand"])) if (isFactionPaint(prop)) register.add(prop);
  return [...covenPaint(COVEN_TILE)].filter((prop) => !register.has(prop));
}

// ---- ephemerists (#2323) ---------------------------------------------------

const EPH_TILE = TILE_PATHS.ephemerists;
const EPH_TASK_CARD = "../../taskCard/EphemeristsTaskCard.tsx";
const EPH_PLATE = "../../factionMarks/ephemeristsPlate.tsx";

/** `ephemeristsPlate.tsx`'s palette, as `{ EXPORT_NAME: '--custom-property' }`. */
function ephemeristsPalette(): Map<string, string> {
  const source = code(EPH_PLATE);
  const map = new Map<string, string>();
  for (const [, name, prop] of source.matchAll(/export const (\w+) = "var\((--[\w-]+)\)";/g)) {
    map.set(name, prop);
  }
  return map;
}

/** Every `eph.X` the tile names, resolved to the custom property behind it. */
function ephemeristsTokensNamedByTile(): string[] {
  const source = code(EPH_TILE);
  const palette = ephemeristsPalette();
  const used: string[] = [];
  for (const [, name] of source.matchAll(/\beph\.(\w+)\b/g)) {
    const prop = palette.get(name);
    if (prop !== undefined) used.push(prop);
  }
  return used;
}

function ephemeristsStrays(): string[] {
  const register = [code(EPH_TASK_CARD), code(EPH_PLATE)].join("\n");
  return ephemeristsTokensNamedByTile().filter((prop) => !register.includes(prop));
}

// ---- everymen (#2327) -------------------------------------------------------

const EM_TILE = TILE_PATHS.everymen;
const EM_TASK_CARD = "../../taskCard/EverymenTaskCard.tsx";

/** Everymen's kit is spelled under bare `--everymen-*` as well as `--faction-everymen-*`. */
const isEverymenPaint = (prop: string): boolean =>
  prop.startsWith("--faction-") || prop.startsWith("--font-") || prop.startsWith("--everymen-");

const everymenPropsIn = (source: string): Set<string> =>
  new Set([...literalProps(source)].filter(isEverymenPaint));

function everymenStrays(): string[] {
  const bandDecls = declarations(code(BANDS));
  const register = everymenPropsIn(code(EM_TASK_CARD));
  for (const prop of propsBehind(bandDecls, ["EverymenBand"])) if (isEverymenPaint(prop)) register.add(prop);
  const ctaDecls = declarations(code(CTA_MODULE));
  for (const prop of propsBehind(ctaDecls, ["EVERYMEN_CARD_CTA"])) if (isEverymenPaint(prop)) register.add(prop);
  return [...everymenPropsIn(code(EM_TILE))].filter((prop) => !register.has(prop));
}

// ---- singularity (#2326) ---------------------------------------------------

const SG_TILE = TILE_PATHS.singularity;

function singularityRegisterSource(): string {
  const bands = code(BANDS);
  return [
    code("../../taskCard/SingularityTaskCard.tsx"),
    code("../../factionMarks/SingularityReadout.tsx"),
    code("../../factionMarks/SingularityProcessLight.tsx"),
    bandSlice(bands, "SingularityBand"),
    ctaSlice("SINGULARITY_CARD_CTA"),
  ].join("\n");
}

function singularityStrays(): string[] {
  const register = singularityRegisterSource();
  return [...literalProps(code(SG_TILE))]
    .filter((prop) => prop.startsWith("--faction-") || prop.startsWith("--font-"))
    .filter((prop) => !register.includes(prop));
}

// ---- snide (#2322) ----------------------------------------------------------

const SN_TILE = TILE_PATHS.snide;

function snideRegisterSource(): string {
  const bands = code(BANDS);
  return [
    code("../../taskCard/SnideTaskCard.tsx"),
    code("../../factionMarks/snideAtoms.tsx"),
    bandSlice(bands, "SnideBand"),
    ctaSlice("SNIDE_CARD_CTA"),
  ].join("\n");
}

function snideStrays(): string[] {
  const register = snideRegisterSource();
  return [...literalProps(code(SN_TILE))]
    .filter(
      (prop) => prop.startsWith("--faction-") || prop.startsWith("--font-") || prop.startsWith("--snide-"),
    )
    .filter((prop) => !register.includes(prop));
}

// ---- ua (#2324) ---------------------------------------------------------------

const UA_TILE = TILE_PATHS.ua;
/** The one proven synonym: `-parchment` reads the praxis-card-only exception's stock. */
const UA_GROUND_SYNONYM_PUBLIC_NAME = "--faction-ua-parchment";

function uaRegisterSource(): string {
  const bands = code(BANDS);
  return [
    code("../../taskCard/UaTaskCard.tsx"),
    code("../../factionMarks/uaAtoms.tsx"),
    bandSlice(bands, "UaBand"),
  ].join("\n");
}

function uaStrays(): string[] {
  const register = uaRegisterSource();
  return [...literalProps(code(UA_TILE))]
    .filter((prop) => prop.startsWith("--faction-") || prop.startsWith("--font-"))
    .filter((prop) => prop !== UA_GROUND_SYNONYM_PUBLIC_NAME)
    .filter((prop) => !register.includes(prop));
}

// ---- wow (#2328) --------------------------------------------------------------

const WOW_TILE = TILE_PATHS.wow;
const WOW_TASK_CARD = "../../taskCard/WowTaskCard.tsx";

/** `factionRoleVars('wow', …)` hands a file paint by INTERPOLATION (#2674). */
const WOW_ROLE_MAP_PROPS = FACTION_ROLES.map((role) =>
  factionRoleVar("wow", role).replace(/^var\(|\)$/g, ""),
);

function wowTokensPainting(relative: string): Set<string> {
  const source = code(relative);
  const props = new Set(literalProps(source));
  if (/factionRoleVars\(\s*["']wow["']/.test(source)) {
    for (const prop of WOW_ROLE_MAP_PROPS) props.add(prop);
  }
  return new Set([...props].filter(isFactionPaint));
}

function wowStrays(): string[] {
  const bandDecls = declarations(code(BANDS));
  const register = wowTokensPainting(WOW_TASK_CARD);
  for (const prop of propsBehind(bandDecls, ["WowBand"])) if (isFactionPaint(prop)) register.add(prop);
  return [...wowTokensPainting(WOW_TILE)].filter((prop) => !register.has(prop));
}

// ---- na / Default (#2816, new) -------------------------------------------------

const NA_TILE = TILE_PATHS.na;
const NA_TASK_CARD = "../../taskCard/DefaultTaskCard.tsx";
/**
 * `DefaultSelectCard`'s own docblock: "VISUAL LANGUAGE — the Default PRAXIS
 * card (#820, #842)". Unlike the eight kits above, na's tile is documented as
 * patterning off the PRAXIS card, not the task card — and `DefaultTaskCard`'s
 * own head names the divergence on purpose: it picks Lora "deliberately NOT
 * `--faction-default-card-font`, which is Bebas Neue: the face #839 chose for
 * the unaffiliated PRAXIS card." So na's register is the union of both cards
 * — the one documented split in the kit, not a narrowing to dodge a finding.
 */
const NA_PRAXIS_CARD = "../../praxisCard/desktop/DefaultPraxisCard.tsx";

function naStrays(): string[] {
  const register = new Set([
    ...[...literalProps(code(NA_TASK_CARD))].filter(isFactionPaint),
    ...[...literalProps(code(NA_PRAXIS_CARD))].filter(isFactionPaint),
  ]);
  return [...literalProps(code(NA_TILE))].filter(isFactionPaint).filter((prop) => !register.has(prop));
}

// ---- the loop -----------------------------------------------------------------

const REGISTER: Record<string, () => string[]> = {
  coven: covenStrays,
  ephemerists: ephemeristsStrays,
  everymen: everymenStrays,
  singularity: singularityStrays,
  snide: snideStrays,
  ua: uaStrays,
  wow: wowStrays,
  na: naStrays,
};

describe("every select tile names no token family its own task card does not (#2321)", () => {
  it.each(SLUGS)("%s", (slug) => {
    const compute = REGISTER[slug];
    expect(compute, `${slug} has no row in REGISTER — wire its recipe in`).toBeTypeOf("function");

    const strays = compute();
    expect(
      strays,
      `Each name is a token the ${slug} DIRECTORY TILE paints with and the
TASK CARD (na: the task card AND the praxis card — see the comment above)
never names — the shape #2321 calls a forked family. Fix it by finding the
role on the card that answers the same question, or by saying in the PR that
the task card has no answer — not by widening this test.`,
    ).toEqual([]);
  });
});
