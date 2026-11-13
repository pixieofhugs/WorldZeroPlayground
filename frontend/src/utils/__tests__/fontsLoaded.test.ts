import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  factionRoleVar,
  type FactionGround,
  type FactionRole,
} from "../factionRoles";
import { resolveRoleReads, sourceFiles } from "../../test/sourceScan";
import { readIndexCss } from "../../test/indexCss";

/**
 * Guard for the silently-unloaded font family (#839): a family named in source
 * but never loaded renders as the generic fallback, which no other check sees.
 * The reverse (loaded, never named) is a load-time guard: see
 * docs/agents/load-time.md. Also checks every `@font-face` `src:` exists (#1977).
 *
 * Both generated sheets (`fonts.css`, `fonts.faction.css`) are one loader here;
 * which sheet a family lives in is `factionFaceSplit.test.ts`'s question.
 */

const FRONTEND_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..");
const SRC_DIR = join(FRONTEND_DIR, "src");

/**
 * The generated sheets are the loader, not a source: excluded from
 * `collectSourceFiles`, or every check below passes by self-reference.
 */
const FONT_SHEETS = [join(SRC_DIR, "fonts.css"), join(SRC_DIR, "fonts.faction.css")];

/** Generic families and system-stack fallbacks: never loaded, by design. */
const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-monospace",
  "inherit",
  "initial",
  "unset",
  "georgia",
  "impact",
  "courier new",
  "marker felt",
  "menlo",
  "monaco",
  "consolas",
  "helvetica",
  "helvetica neue",
  "arial",
  "times new roman",
  "segoe ui",
  "trajan pro",
]);

function collectSourceFiles(): string[] {
  return sourceFiles({ dir: SRC_DIR, match: /\.(tsx?|css)$/ }).filter(
    (path) => !FONT_SHEETS.includes(path),
  );
}

/** One `@font-face` block's body, in source order, across both sheets. */
function fontFaceBlocks(): string[] {
  return FONT_SHEETS.flatMap((sheet) =>
    [...readFileSync(sheet, "utf-8").matchAll(/@font-face\s*\{([^}]*)\}/g)].map(
      (match) => match[1],
    ),
  );
}

const blockField = (block: string, name: string): string | undefined =>
  block.match(new RegExp(`${name}\\s*:\\s*([^;]+);`))?.[1].trim();

/** The families the generated sheets actually ship an `@font-face` rule for. */
function loadedFamilies(): Set<string> {
  return new Set(
    fontFaceBlocks().map((block) =>
      (blockField(block, "font-family") ?? "").replace(/["']/g, "").trim().toLowerCase(),
    ),
  );
}

/**
 * Every quoted family name in a `font-family` / `fontFamily` declaration.
 * Unquoted tokens are generics or `var()`s, whose names appear in index.css.
 */
function namedFamilies(source: string): string[] {
  const declarations = [...source.matchAll(/font-?[fF]amily\s*[:=]\s*([^;\n}]+)/g)]
    .map((match) => match[1])
    // Cut at the next `property:` pair on a one-line style object, or
    // `textTransform: "uppercase"` reads as a family.
    .map((declaration) => declaration.split(/,\s*[A-Za-z-]+\s*:/)[0])
    // factionCssVar/factionRoleVar args are a slug + suffix/role, not families.
    .map((declaration) =>
      declaration.replace(/faction(?:CssVar|RoleVar)\([^)]*\)/g, ""),
    );
  return declarations.flatMap((declaration) =>
    [...declaration.matchAll(/["']([A-Za-z][A-Za-z0-9 ]+)["']/g)].map((match) =>
      match[1].trim().toLowerCase(),
    ),
  );
}

/**
 * Every `--font-*` token index.css declares, and the ones nothing reads (#1293):
 * an unread token's declaration would otherwise vouch for its own family.
 * Deliberately permissive: a read anywhere (even a comment) counts.
 */
function declaredFontTokens(): string[] {
  const css = readIndexCss();
  return [...new Set([...css.matchAll(/(--font-[a-z0-9-]+)\s*:/g)].map((match) => match[1]))];
}

function unreadFontTokens(sources: string[]): string[] {
  return declaredFontTokens()
    .filter((token) => !sources.some((source) => source.includes(`var(${token})`)))
    .sort();
}

/** That source with the given tokens' declarations cut out of it. */
function withoutDeclarations(source: string, tokens: string[]): string {
  return tokens.reduce(
    (text, token) => text.replace(new RegExp(`${token}\\s*:[^;]*;`, "g"), ""),
    source,
  );
}

describe("font families are loaded (#839)", () => {
  const loaded = loadedFamilies();
  const sources = collectSourceFiles().map((file) =>
    readFileSync(file, "utf-8").toLowerCase(),
  );

  it("ships fonts at all (sanity check on the parse)", () => {
    expect(loaded.size).toBeGreaterThan(5);
    expect(loaded.has("bebas neue")).toBe(true);
  });

  it("points every @font-face at a file that exists (#1977)", () => {
    const sources = declaredSources();
    // A zero here is the parse having broken, not the stylesheet being clean.
    expect(sources.length).toBeGreaterThan(40);

    const dangling = sources.filter(({ path }) => !existsSync(path)).map(({ url }) => url);
    expect(
      dangling,
      `The generated font sheets point at ${dangling.join(", ")}, which is not on disk.
` +
        `Nothing fails: the browser drops the @font-face and the family renders in
` +
        `whatever generic the stack falls back to, which is the #821 defect
` +
        `(docs/agents/design-fidelity.md). Re-run 'node scripts/fetch-fonts.mjs'
` +
        `rather than hand-editing the path — the stylesheet is generated.`,
    ).toEqual([]);
  });

  it("names no family that the loader never requests", () => {
    const missing = new Set<string>();
    for (const file of [...collectSourceFiles()]) {
      for (const family of namedFamilies(readFileSync(file, "utf-8"))) {
        if (!GENERIC_FAMILIES.has(family) && !loaded.has(family)) {
          missing.add(`${family} (named in ${file})`);
        }
      }
    }
    expect([...missing]).toEqual([]);
  });

  it("declares no --font-* token that nothing reads", () => {
    const unread = unreadFontTokens(sources);

    expect(
      unread,
      `index.css declares ${unread.join(", ")}, which no source file reads.
` +
        `An unread family token is not inert: it names a family, index.css is in
` +
        `the corpus the family check searches, so the declaration vouches for
` +
        `itself and holds the family in the shipped font kit.
` +
        `Delete the token — and if it was the family's last reader, the family
` +
        `too (#1293).`,
    ).toEqual([]);
  });

  it("requests no family that nothing names", () => {
    // Plain text search, not `namedFamilies`: most families arrive via a custom
    // property. Any mention counts, except an unread token's own declaration.
    const unread = unreadFontTokens(sources);
    const named = sources.map((source) => withoutDeclarations(source, unread));
    const unused = [...loaded]
      .filter((family) => !named.some((source) => source.includes(family)))
      .sort();

    expect(
      unused,
      `The generated font sheets ship ${unused.join(", ")}, which no source file names.
` +
        `A family nothing names is woff2 in the repo and @font-face bytes in the
` +
        `render-blocking stylesheet, for nothing. Drop it from FACES in
` +
        `scripts/fetch-fonts.mjs and re-run it — if a surface needs the family
` +
        `later, adding it back is one line and one re-run.`,
    ).toEqual([]);
  });
});

/**
 * The same guard at the weight level (#1230): each face is a separate download.
 * Stricter evidence than the family check, since dropping a used weight makes
 * the browser fake-bold: a weight counts only when one brace scope pins both
 * family and weight.
 */

/** One downloadable face: a family at a weight, upright or italic. */
interface Face {
  family: string;
  weight: number;
  italic: boolean;
}

const faceKey = (face: Face): string =>
  `${face.family}:${face.weight}${face.italic ? "i" : ""}`;

/** Every distinct (family, weight, slant) shipped, deduped across unicode subsets. */
function loadedFaces(): Face[] {
  const seen = new Map<string, Face>();
  for (const block of fontFaceBlocks()) {
    const face: Face = {
      family: (blockField(block, "font-family") ?? "").replace(/["']/g, "").trim().toLowerCase(),
      weight: Number(blockField(block, "font-weight") ?? 400),
      italic: blockField(block, "font-style") === "italic",
    };
    seen.set(faceKey(face), face);
  }
  return [...seen.values()];
}

/** Every `src: url(...)` in the sheets, resolved against `src/` (#821). */
function declaredSources(): { url: string; path: string }[] {
  return FONT_SHEETS.flatMap((sheet) =>
    [...readFileSync(sheet, "utf-8").matchAll(/src:\s*url\(\s*['"]?([^'")]+)/g)].map((match) => ({
      url: match[1],
      path: resolvePath(SRC_DIR, match[1]),
    })),
  );
}

/** Tailwind's three family utilities (the `@theme inline` block in
 *  `src/css/00-prelude.css` since #2918) and its weight scale. */
const TAILWIND_FAMILIES: Record<string, string> = {
  "font-display": "lora",
  "font-body": "courier prime",
  "font-accent": "bebas neue",
};
const TAILWIND_WEIGHTS: Record<string, number> = {
  "font-thin": 100,
  "font-extralight": 200,
  "font-light": 300,
  "font-normal": 400,
  "font-medium": 500,
  "font-semibold": 600,
  "font-bold": 700,
  "font-extrabold": 800,
  "font-black": 900,
};

/** String `const` bindings a file can see: its own plus imported ones. */
const bindingCache = new Map<string, Map<string, string>>();
function stringConstants(file: string, depth = 0): Map<string, string> {
  const cached = bindingCache.get(file);
  if (cached) return cached;
  const bindings = new Map<string, string>();
  bindingCache.set(file, bindings); // set first: import cycles are legal
  if (depth > 3 || !existsSync(file)) return bindings;
  const source = readFileSync(file, "utf-8");
  for (const match of source.matchAll(
    /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(["'`])((?:(?!\2).)*)\2/g,
  )) {
    bindings.set(match[1], match[3]);
  }
  // Role reads (`factionRoleVar("ua", "face")`, #2659) resolve through the real
  // resolver, not a restated role map.
  for (const match of source.matchAll(
    /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*factionRoleVar\(\s*["'`]([\w-]+)["'`]\s*,\s*["'`](\w+)["'`]\s*(?:,\s*["'`](\w+)["'`]\s*)?\)/g,
  )) {
    bindings.set(
      match[1],
      factionRoleVar(
        match[2],
        match[3] as FactionRole,
        (match[4] ?? "sheet") as FactionGround,
      ),
    );
  }
  for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["'](\.[^"']+)["']/g)) {
    const names = match[1]
      .split(",")
      .map((name) => name.trim().split(/\s+as\s+/).pop()?.trim() ?? "");
    for (const extension of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
      const target = resolvePath(dirname(file), match[2] + extension);
      if (!existsSync(target)) continue;
      const exported = stringConstants(target, depth + 1);
      for (const name of names) {
        const value = exported.get(name);
        if (value !== undefined && !bindings.has(name)) bindings.set(name, value);
      }
      break;
    }
  }
  return bindings;
}

/** That file's source with every such binding inlined at its use sites. */
function inlineConstants(file: string, source: string): string {
  const bindings = stringConstants(file);
  return source.replace(/\b([A-Za-z_$][\w$]*)\b/g, (name) => bindings.get(name) ?? name);
}

/** The innermost `{...}` around `index`, with nested blocks stripped out. */
function enclosingScope(source: string, index: number): string {
  // A JSX attribute's scope is its own tag, not the enclosing brace block, or
  // sibling weights in a big `switch` invent faces. Truncating at a `>` in an
  // attribute value only drops weights (the permissive direction).
  if (/^font-?[fF]amily\s*=\s*["']/.test(source.slice(index, index + 16))) {
    const start = source.lastIndexOf("<", index);
    const end = source.indexOf(">", index);
    if (start !== -1 && end !== -1) return source.slice(start, end);
  }
  let depth = 0;
  let start = -1;
  for (let cursor = index; cursor >= 0; cursor--) {
    if (source[cursor] === "}") depth++;
    else if (source[cursor] === "{") {
      if (depth === 0) {
        start = cursor;
        break;
      }
      depth--;
    }
  }
  if (start === -1) return source.slice(index, index + 200);
  depth = 0;
  let end = source.length;
  for (let cursor = start; cursor < source.length; cursor++) {
    if (source[cursor] === "{") depth++;
    else if (source[cursor] === "}") {
      depth--;
      if (depth === 0) {
        end = cursor;
        break;
      }
    }
  }
  // A child's weight must not count as the parent's, so keep depth-0 text only.
  let flat = "";
  depth = 0;
  for (const character of source.slice(start + 1, end)) {
    if (character === "{") depth++;
    else if (character === "}") depth--;
    else if (depth === 0) flat += character;
  }
  return flat;
}

/**
 * Every face a source file sets: each family-pinning scope with its weight and
 * slant. No weight means the inherited default, 400 everywhere here.
 */
function declaredFaces(loadedFamilyNames: Set<string>): Face[] {
  const declared: Face[] = [];
  const record = (families: Iterable<string>, weights: number[], italic: boolean) => {
    for (const family of families) {
      for (const weight of weights.length > 0 ? weights : [400]) {
        declared.push({ family, weight, italic });
      }
    }
  };

  for (const file of collectSourceFiles()) {
    const raw = readFileSync(file, "utf-8");
    const source = file.endsWith(".css") ? raw : inlineConstants(file, raw);

    for (const match of source.matchAll(/font-?[fF]amily\s*[:=]/g)) {
      const scope = enclosingScope(source, match.index);
      const families = new Set<string>();
      // Quoted in a stack, or bare before a comma in a JSX attribute
      // (`fontFamily="Courier Prime, monospace"`).
      for (const quoted of scope.matchAll(/["']\s*([A-Za-z][A-Za-z0-9 ]+)\s*["',]/g)) {
        const family = quoted[1].trim().toLowerCase();
        if (loadedFamilyNames.has(family)) families.add(family);
      }
      for (const reference of scope.matchAll(/var\((--[a-z0-9-]+)\)/g)) {
        for (const family of familiesBehindToken(reference[1], loadedFamilyNames)) {
          families.add(family);
        }
      }
      if (families.size === 0) continue;

      const weights = [
        ...new Set(
          [...scope.matchAll(/font-?[wW]eight\s*[:=][^;\n]*/g)].flatMap((declaration) =>
            [...declaration[0].matchAll(/\b(\d{3})\b/g)].map((digits) => Number(digits[1])),
          ),
        ),
      ];
      record(families, weights, /font-?[sS]tyle\s*[:=]\s*\{?\s*["']?\s*italic/.test(scope));
    }

    // `className="font-display italic font-medium"` sets all three at once.
    for (const match of raw.matchAll(/(?:className\s*=\s*|@apply\s+)["'`]?([^"'`\n;]*)/g)) {
      const classes = match[1];
      const family = Object.entries(TAILWIND_FAMILIES).find(([utility]) =>
        new RegExp(`\\b${utility}\\b`).test(classes),
      )?.[1];
      if (!family) continue;
      const weight = Object.entries(TAILWIND_WEIGHTS).find(([utility]) =>
        new RegExp(`\\b${utility}\\b`).test(classes),
      )?.[1];
      record([family], weight === undefined ? [] : [weight], /\bitalic\b/.test(classes));
    }
  }
  return declared;
}

/** The loaded families a `var(--token)` resolves to, following alias chains. */
function familiesBehindToken(
  token: string,
  loadedFamilyNames: Set<string>,
  seen = new Set<string>(),
): string[] {
  if (seen.has(token)) return [];
  seen.add(token);
  const value = tokenValues().get(token);
  if (value === undefined) return [];
  const families = [...value.matchAll(/["']([^"']+)["']/g)]
    .map((match) => match[1].trim().toLowerCase())
    .filter((family) => loadedFamilyNames.has(family));
  for (const alias of value.matchAll(/var\((--[a-z0-9-]+)\)/g)) {
    families.push(...familiesBehindToken(alias[1], loadedFamilyNames, seen));
  }
  return families;
}

let tokenValueCache: Map<string, string> | undefined;
function tokenValues(): Map<string, string> {
  if (tokenValueCache) return tokenValueCache;
  const css = readIndexCss();
  tokenValueCache = new Map();
  for (const match of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    // Light theme wins; the dark cascade never repoints a family token.
    if (!tokenValueCache.has(match[1])) tokenValueCache.set(match[1], match[2].trim());
  }
  return tokenValueCache;
}

/**
 * Which available weight a desired one renders as (CSS Fonts 4 §5.2). Equality
 * is wrong: a 400 request can be what keeps Lora's 500 face alive.
 */
function matchedWeight(desired: number, available: number[]): number | undefined {
  if (available.includes(desired)) return desired;
  const descending = available.filter((w) => w < desired).sort((a, b) => b - a);
  const ascending = available.filter((w) => w > desired).sort((a, b) => a - b);
  if (desired < 400) return descending[0] ?? ascending[0];
  if (desired > 500) return ascending[0] ?? descending[0];
  // 400–500 inclusive: up to 500 first, then down, then past 500.
  const upToFiveHundred = ascending.filter((w) => w <= 500);
  return upToFiveHundred[0] ?? descending[0] ?? ascending[0];
}

describe("font weights are used (#1230)", () => {
  const faces = loadedFaces();
  const families = new Set(faces.map((face) => face.family));

  it("parses the axis spec, not just the family (sanity check)", () => {
    expect(faces.length).toBeGreaterThan(families.size);
    // A bare family is one upright face; `Lora:ital,wght@1,400` is one italic.
    expect(faces).toContainEqual({ family: "archivo black", weight: 400, italic: false });
    expect(faces).toContainEqual({ family: "lora", weight: 400, italic: true });
  });

  it("resolves a desired weight the way the browser does", () => {
    expect(matchedWeight(400, [500, 600])).toBe(500); // the Lora case
    expect(matchedWeight(700, [500, 600])).toBe(600);
    expect(matchedWeight(600, [400, 600])).toBe(600);
    expect(matchedWeight(500, [400, 700])).toBe(400);
  });

  it("requests no weight that nothing renders in", () => {
    const declared = declaredFaces(families);
    // Every face some declaration actually resolves to.
    const rendered = new Set<string>();
    for (const face of declared) {
      const available = faces
        .filter((candidate) => candidate.family === face.family && candidate.italic === face.italic)
        .map((candidate) => candidate.weight);
      const weight = matchedWeight(face.weight, available);
      if (weight !== undefined) rendered.add(faceKey({ ...face, weight }));
    }

    // A one-face family has no weight to get wrong; unused families are above.
    const multiFace = new Set(
      [...families].filter(
        (family) => faces.filter((face) => face.family === family).length > 1,
      ),
    );
    const unused = faces
      .filter((face) => multiFace.has(face.family) && !rendered.has(faceKey(face)))
      .map((face) => `${face.family} ${face.weight}${face.italic ? " italic" : ""}`)
      .sort();

    expect(
      unused,
      `The generated font sheets ship ${unused.join(", ")}, which nothing renders in.
` +
        `Drop the axis value from the family's spec in FACES (scripts/fetch-fonts.mjs)
` +
        `and re-run it — the family stays, only the weight goes.
` +
        `No declaration resolves to it under CSS font matching, so removing it
` +
        `changes nothing on screen. If a surface really does use one, this guard
` +
        `could not see where: it counts a weight only when a single brace-scope
` +
        `pins both the family and the weight. Pin them together rather than
` +
        `widening the guard, or the fake-bold it exists to catch walks back in.`,
    ).toEqual([]);
  });
});

/**
 * The converse (#1294): a weight source sets but the loader omits silently
 * resolves to another face. Owner ruling: the stylesheet is the truth and the
 * loader follows it.
 *
 * ponytail: guards weight, not slant; a missing italic synthesises and passes
 * (e.g. Bebas Neue). Upgrade: a checked-in font-catalogue snapshot.
 */
describe("used weights are requested (#1294)", () => {
  const faces = loadedFaces();
  const families = new Set(faces.map((face) => face.family));

  it("sees the weights source files actually set (sanity check)", () => {
    const declared = declaredFaces(families);
    expect(declared.length).toBeGreaterThan(100);
    // Lora 700 via `--font-display`: reachable only by resolving the token.
    expect(declared).toContainEqual({ family: "lora", weight: 700, italic: false });
  });

  it("renders every declared weight in a face it requests", () => {
    const substituted = new Set<string>();
    for (const face of declaredFaces(families)) {
      // Slant matches before weight (§5.2): no italic face means the upright.
      const sameSlant = faces.filter(
        (candidate) => candidate.family === face.family && candidate.italic === face.italic,
      );
      const available = (
        sameSlant.length > 0
          ? sameSlant
          : faces.filter((candidate) => candidate.family === face.family && !candidate.italic)
      ).map((candidate) => candidate.weight);
      const rendered = matchedWeight(face.weight, available);
      if (rendered !== face.weight) {
        substituted.add(
          `${face.family} ${face.weight}${face.italic ? " italic" : ""} renders as ${rendered ?? "no face"}`,
        );
      }
    }

    expect(
      [...substituted].sort(),
      `Source sets these weights and the generated font sheets do not ship them, so the
` +
        `browser substitutes: a real face at the wrong weight, or a synthesised
` +
        `fake-bold. Add the axis value to the family's spec in FACES
` +
        `(scripts/fetch-fonts.mjs) and re-run it — for a variable family that is
` +
        `usually not even another file, just another @font-face rule.
` +
        `If the family has no such face at all (Bebas Neue is upright 400 and
` +
        `nothing else), the declaration is the thing that is wrong: drop the
` +
        `weight rather than pretending the request can satisfy it (#1294).`,
    ).toEqual([]);
  });
});

/**
 * The inherited half (#2487): a composer's `pageStyle` sets the face for its
 * whole file, so an unpinned weight there lands on the page face. Safe only in
 * `*EditPraxis` archetypes (one `pageStyle`, one family; preflight resets
 * headings and controls to `inherit`), which is why the walk stops there.
 * Objects only to synthesis (>=600 resolving below 600, §5.2.4), not to
 * substitution, which is a design call.
 */
describe("an inherited page face is not asked to fake a bold (#2487)", () => {
  const COMPOSER_DIR = join(SRC_DIR, "pages", "editPraxis", "archetypes");
  const composers = sourceFiles({ dir: COMPOSER_DIR, match: /EditPraxis\.tsx$/ }).map((path) =>
    basename(path),
  );
  const faces = loadedFaces();
  const familyNames = new Set(faces.map((face) => face.family));

  /**
   * The file with comments blanked to spaces (prose about a weight is not one);
   * blanking keeps indices and line numbers, and hides comment braces.
   */
  const readSource = (file: string): string =>
    inlineConstants(
      file,
      readFileSync(file, "utf-8").replace(
        /(["'`])(?:\\.|(?!\1)[^\\])*\1|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
        (match) => (match.startsWith("/") ? match.replace(/[^\n]/g, " ") : match),
      ),
    );

  /** The families a composer's `pageStyle` puts on everything below it. */
  function pageFamilies(file: string): string[] {
    // Fold role reads first so `var(--x-face)` becomes a real token (#2689).
    const source = resolveRoleReads(readSource(file));
    const anchor = source.indexOf("pageStyle:");
    if (anchor === -1) return [];
    const offset = source.slice(anchor).search(/font-?[fF]amily\s*[:=]/);
    if (offset === -1) return [];
    return [...enclosingScope(source, anchor + offset).matchAll(/var\((--[a-z0-9-]+)\)/g)].flatMap(
      (reference) => familiesBehindToken(reference[1], familyNames),
    );
  }

  /** CSS Fonts 4 §5.2.4 — below 600 the browser has to draw the bold itself. */
  const synthesisesBold = (desired: number, used: number | undefined) =>
    desired >= 600 && (used === undefined || used < 600);

  it("resolves a page face wherever one is declared (sanity check on the anchor)", () => {
    expect(composers.length).toBeGreaterThan(1);
    for (const name of composers) {
      const file = join(COMPOSER_DIR, name);
      // Albescent declares no `pageStyle`; every other one must resolve.
      const declaresPageStyle = readSource(file).includes("pageStyle:");
      expect(pageFamilies(file).length > 0, `${name}: pageStyle anchor moved`).toBe(
        declaresPageStyle,
      );
    }
    expect(pageFamilies(join(COMPOSER_DIR, "SnideEditPraxis.tsx"))).toEqual(["special elite"]);
  });

  it("reads a comment about a weight as prose, not as a declaration", () => {
    const file = join(COMPOSER_DIR, "SnideEditPraxis.tsx");
    // Its comment names the declaration it no longer makes: the live instance.
    expect(readFileSync(file, "utf-8")).toMatch(/fontWeight: 700/);
    expect(readSource(file)).not.toMatch(/font-?[wW]eight/);
  });

  it("knows a faked bold from a substituted one", () => {
    expect(synthesisesBold(700, matchedWeight(700, [400]))).toBe(true); // Special Elite
    expect(synthesisesBold(700, matchedWeight(700, [400, 600]))).toBe(false); // EB Garamond
    expect(synthesisesBold(500, matchedWeight(500, [400]))).toBe(false); // Poiret One
  });

  it("sets no unpinned weight the page face has to synthesise", () => {
    const faked: string[] = [];
    for (const name of composers) {
      const file = join(COMPOSER_DIR, name);
      const source = readSource(file);
      const page = pageFamilies(file);
      const available = faces
        .filter((face) => page.includes(face.family) && !face.italic)
        .map((face) => face.weight);
      for (const declaration of source.matchAll(/font-?[wW]eight\s*[:=][^;\n]*/g)) {
        // A scope that names its own family is #1294's business, not this one.
        if (/font-?[fF]amily/.test(enclosingScope(source, declaration.index))) continue;
        for (const digits of declaration[0].matchAll(/\b(\d{3})\b/g)) {
          const desired = Number(digits[1]);
          if (synthesisesBold(desired, matchedWeight(desired, available))) {
            // `inlineConstants` substitutes within a line, so the count holds.
            const line = source.slice(0, declaration.index).split("\n").length;
            faked.push(`${name}:${line} — fontWeight ${desired} inherits ${page.join(" / ")}`);
          }
        }
      }
    }

    expect(
      [...new Set(faked)].sort(),
      `These weights land on a face the loader ships no cut for, so the browser draws
` +
        `the bold itself — a smear across the letterforms rather than a heavier cut,
` +
        `and one no probe can see because the family still resolves (#2487).
` +
        `Drop the declaration and reach for emphasis the face supports — size,
` +
        `letterspacing, case, or the ink tier. Do NOT add the cut to the payload;
` +
        `the byte budget is already in WARN (#2469). If the element really is meant
` +
        `to wear a family that HAS the cut, name that family in the same style
` +
        `object: pinning them together is what makes the pair checkable.`,
    ).toEqual([]);
  });
});

/**
 * The pinned half (#2597): a weight on a family that ships one cut is either a
 * no-op or a synthesis, so none may be declared. One-cut is derived from the
 * sheets (across both slants), never listed. Evidence bar as `declaredFaces`.
 */
describe("a one-cut family is never asked for a weight (#2597)", () => {
  const faces = loadedFaces();
  const familyNames = new Set(faces.map((face) => face.family));

  /** Families the loader ships exactly one weight for, across both slants. */
  const oneCut = new Set(
    [...familyNames].filter(
      (family) =>
        new Set(faces.filter((face) => face.family === family).map((face) => face.weight)).size ===
        1,
    ),
  );

  /**
   * Files where an inline 400 on a one-cut face is load-bearing: `PraxisTitle`'s
   * `<h2>` also carries `font-semibold`, and the 400 suppresses a fake-bold.
   *
   * Four skins (na, Everymen, Singularity, WOW) keep the synthesised 600 on
   * purpose: owner ruling by eye, #2797. This check cannot follow the
   * class -> prop -> CSS var chain to see them; if it ever learns to and goes
   * red on those four, that is the ruling, not a bug. Do not add cuts to the
   * payload (byte budget in WARN, #2469).
   *
   * ponytail: exempts whole files, not elements; narrow it if this set grows.
   */
  const LOAD_BEARING = new Set([
    "components/praxisCard/desktop/EphemeristsPraxisCard.tsx",
    // #2797: S.N.I.D.E. is the one skin ruled to use 400.
    "components/praxisCard/desktop/SnidePraxisCard.tsx",
  ]);

  it("derives the one-cut families from the sheets rather than a list", () => {
    for (const family of [
      "share tech mono",
      "permanent marker",
      "poiret one",
      "spectral",
      "medievalsharp",
      "bebas neue",
      "archivo black",
      "special elite",
    ]) {
      expect(oneCut.has(family), `${family} is no longer derived as one-cut`).toBe(true);
    }
    // Negative side, or the check passes by matching nothing.
    for (const family of ["lora", "courier prime", "cinzel", "eb garamond"]) {
      expect(oneCut.has(family), `${family} was wrongly derived as one-cut`).toBe(false);
    }
  });

  it("names no weight in a scope that pins a single-cut family", () => {
    const asked: string[] = [];
    for (const file of collectSourceFiles()) {
      if (FONT_SHEETS.includes(file)) continue;
      const rel = file.slice(SRC_DIR.length + 1).replace(/\\/g, "/");
      if (LOAD_BEARING.has(rel)) continue;
      const raw = readFileSync(file, "utf-8").replace(
        /(["'`])(?:\\.|(?!\1)[^\\])*\1|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
        (match) => (match.startsWith("/") ? match.replace(/[^\n]/g, " ") : match),
      );
      const source = resolveRoleReads(file.endsWith(".css") ? raw : inlineConstants(file, raw));

      for (const match of source.matchAll(/font-?[fF]amily\s*[:=]/g)) {
        const scope = enclosingScope(source, match.index);
        if (!/font-?[wW]eight\s*[:=]/.test(scope)) continue;
        const families = new Set<string>();
        for (const quoted of scope.matchAll(/["']\s*([A-Za-z][A-Za-z0-9 ]+)\s*["',]/g)) {
          const family = quoted[1].trim().toLowerCase();
          if (familyNames.has(family)) families.add(family);
        }
        for (const reference of scope.matchAll(/var\((--[a-z0-9-]+)\)/g)) {
          for (const family of familiesBehindToken(reference[1], familyNames)) families.add(family);
        }
        for (const family of families) {
          if (!oneCut.has(family)) continue;
          const line = source.slice(0, match.index).split("\n").length;
          asked.push(`${rel}:${line} — ${family}`);
        }
      }
    }

    expect(
      [...new Set(asked)].sort(),
      `These scopes set a weight beside a family that ships exactly one cut, so the
` +
        `declaration is either inert or a bold the browser has to smear on itself
` +
        `(#2487, #2597). Drop the weight — Tailwind's preflight already resets
` +
        `headings and form controls to \`font-weight: inherit\`, so on a bare <h1>
` +
        `or <h2> with nothing above it setting one, removing it changes no pixel.
` +
        `CHECK THE ANCESTORS FIRST: if anything above the element, or a weight
` +
        `UTILITY CLASS on the element itself, declares a weight, the 400 is what
` +
        `suppresses it and removing it brings the fake bold straight back — add
` +
        `the file to LOAD_BEARING above with the reason instead. Do NOT add the
` +
        `cut to the payload; the byte budget is in WARN (#2469).`,
    ).toEqual([]);
  });
});
