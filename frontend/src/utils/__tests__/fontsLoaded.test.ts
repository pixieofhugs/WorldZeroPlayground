import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guard for the silently-unloaded font family (#839).
 *
 * `fontFamily: "'Playfair Display', serif"` type-checks, lints, tokenises past
 * every ratchet and renders — as generic serif, because that family was never in
 * the loader. It had been that way for months across nine UA surfaces and no
 * check we run could see it: the fallback IS the rendering. Only comparing the
 * families named in source against the families the loader requests catches it.
 *
 * Sibling of factionTokensDeclared (#806) — same failure class, different half
 * of the stylesheet: a name that looks right and resolves to nothing.
 *
 * The reverse direction is a load-time guard rather than a rendering one. That
 * `<link>` is render-blocking and on a third-party origin, so every family in it
 * is weight a visitor pays before first paint whether or not anything uses it.
 * A family outlives the surface that introduced it — delete the last card that
 * named it and the request stays behind, costing bytes forever and silently.
 * See docs/agents/load-time.md.
 */

const FRONTEND_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..");
const SRC_DIR = join(FRONTEND_DIR, "src");
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".css"];

/**
 * Generic CSS families and system-stack fallbacks. These are never loaded and
 * never need to be — they exist precisely to be the fallback.
 */
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

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      // Tests quote family names as prose and fixtures.
      return entry.name === "__tests__" ? [] : collectSourceFiles(path);
    }
    return SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext)) ? [path] : [];
  });
}

/** The families the Google Fonts `<link>` in index.html actually requests. */
function loadedFamilies(): Set<string> {
  const html = readFileSync(join(FRONTEND_DIR, "index.html"), "utf-8");
  return new Set(
    [...html.matchAll(/family=([^&"':]+)/g)].map((match) =>
      decodeURIComponent(match[1]).replace(/\+/g, " ").trim().toLowerCase(),
    ),
  );
}

/**
 * Every quoted family name in a `font-family` / `fontFamily` declaration.
 * Quoted is the whole point: an unquoted token is either a generic keyword or a
 * `var()` reference, and `var()` chains land in index.css where the quoted name
 * ultimately appears anyway.
 */
function namedFamilies(source: string): string[] {
  const declarations = [...source.matchAll(/font-?[fF]amily\s*[:=]\s*([^;\n}]+)/g)]
    .map((match) => match[1])
    // A one-line style object puts the NEXT property on the same line
    // (`{ fontFamily: X, textTransform: "uppercase" }`), and a font-family list
    // is comma-separated too — so cut at the first comma that starts another
    // `property:` pair. Without this the guard "finds" families called
    // uppercase, nowrap and italic.
    .map((declaration) => declaration.split(/,\s*[A-Za-z-]+\s*:/)[0])
    // `factionCssVar("coven", "card-font")` builds a var() reference; its two
    // quoted arguments are a slug and a suffix, not families.
    .map((declaration) => declaration.replace(/factionCssVar\([^)]*\)/g, ""));
  return declarations.flatMap((declaration) =>
    [...declaration.matchAll(/["']([A-Za-z][A-Za-z0-9 ]+)["']/g)].map((match) =>
      match[1].trim().toLowerCase(),
    ),
  );
}

/**
 * Every `--font-*` token index.css declares, and the ones nothing reads (#1293).
 *
 * A token's own declaration carries the quoted family name and index.css is in
 * the corpus the family check searches, so before this every token vouched for
 * itself: declare `--font-faction-blackletter: "UnifrakturCook", …`, read it
 * nowhere, and the family stayed on the render-blocking request forever with the
 * guard green. The honest question is whether anything *reads* `var(--font-…)`.
 *
 * Still deliberately permissive in the other direction — a read counts wherever
 * it appears, including in a comment or a dead branch. Keeping a live token is
 * cheap; dropping one costs a silently-unstyled surface.
 */
function declaredFontTokens(): string[] {
  const css = readFileSync(join(SRC_DIR, "index.css"), "utf-8");
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
  const sources = collectSourceFiles(SRC_DIR).map((file) =>
    readFileSync(file, "utf-8").toLowerCase(),
  );

  it("requests fonts at all (sanity check on the parse)", () => {
    expect(loaded.size).toBeGreaterThan(5);
    expect(loaded.has("bebas neue")).toBe(true);
  });

  it("names no family that the loader never requests", () => {
    const missing = new Set<string>();
    for (const file of [...collectSourceFiles(SRC_DIR)]) {
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
        `itself and holds the family on the render-blocking Google Fonts request.
` +
        `Delete the token — and if it was the family's last reader, the family
` +
        `too (#1293).`,
    ).toEqual([]);
  });

  it("requests no family that nothing names", () => {
    // Deliberately a plain text search, not `namedFamilies`. That helper only
    // reads `font-family` declarations, but most families reach the page through
    // a custom property (`--font-faction-engraved: "Cinzel", serif`), which is
    // not one. For "is this family used at all?", any mention counts — and being
    // too permissive here only risks keeping a font, never dropping a live one.
    // The one mention that must NOT count is an unread token's own declaration:
    // that is the family naming itself (#1293), so those lines are cut first.
    const unread = unreadFontTokens(sources);
    const named = sources.map((source) => withoutDeclarations(source, unread));
    const unused = [...loaded]
      .filter((family) => !named.some((source) => source.includes(family)))
      .sort();

    expect(
      unused,
      `index.html requests ${unused.join(", ")}, which no source file names.
` +
        `The Google Fonts <link> is render-blocking, so an unused family is weight
` +
        `every visitor pays before first paint. Drop it from the URL — if a surface
` +
        `needs it later, adding it back is one edit.`,
    ).toEqual([]);
  });
});

/**
 * The same guard one level down, at the axis spec (#1230).
 *
 * `loadedFamilies` parses `family=([^&"':]+)`, which stops at the colon — so
 * `Cinzel:wght@400;500;600;700;800` passed it identically whether five weights
 * were used or one. The families were honest and the request was still 46 faces
 * across 19 families; eight families accounted for 34 of them.
 *
 * A face is a separate download, so this is the same load-time bug as an unused
 * family, just finer-grained. It is also the same *rendering* bug in reverse:
 * drop a weight something actually sets and the browser does not fail, it
 * synthesises — a fake-bold that looks approximately right. So the evidence bar
 * here is higher than the family check's deliberately-permissive substring
 * search. A weight counts as used only when some brace-delimited scope pins both
 * the family and the weight; a mention in a comment or a dead branch does not.
 */

/** One downloadable face: a family at a weight, upright or italic. */
interface Face {
  family: string;
  weight: number;
  italic: boolean;
}

const faceKey = (face: Face): string =>
  `${face.family}:${face.weight}${face.italic ? "i" : ""}`;

/**
 * Every face the `<link>` requests, parsed out of the `axes@values` spec.
 *
 * `Cinzel:wght@400;500` is two faces; `Lora:ital,wght@0,500;1,400` is an upright
 * 500 and an italic 400; `IM Fell English:ital@1` is one italic face at the
 * default weight; a bare `Anton` is one upright 400.
 */
function loadedFaces(): Face[] {
  const html = readFileSync(join(FRONTEND_DIR, "index.html"), "utf-8");
  const link = html.match(/fonts\.googleapis\.com\/css2\?([^"']+)/)?.[1] ?? "";
  return link.split("&").flatMap((parameter) => {
    const value = parameter.startsWith("family=") ? parameter.slice(7) : "";
    if (!value) return [];
    const [rawFamily, spec] = value.split(":");
    const family = decodeURIComponent(rawFamily).replace(/\+/g, " ").trim().toLowerCase();
    if (!spec) return [{ family, weight: 400, italic: false }];
    const [axisNames, axisValues] = spec.split("@");
    const axes = axisNames.split(",");
    return axisValues.split(";").map((tuple) => {
      const values = tuple.split(",");
      const weightAxis = axes.indexOf("wght");
      const italicAxis = axes.indexOf("ital");
      return {
        family,
        weight: weightAxis === -1 ? 400 : Number(values[weightAxis]),
        italic: italicAxis !== -1 && values[italicAxis] === "1",
      };
    });
  });
}

/** Tailwind's three family utilities (tailwind.config.ts) and its weight scale. */
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

/**
 * String `const` bindings a file can see: its own, plus the ones it imports.
 *
 * Every faction surface routes its family through one (`const CHROME =
 * "var(--font-faction-rounded)"`, then `fontFamily: CHROME`), and the shared
 * ones are imported rather than redeclared — UA's whole skin reads its two cuts
 * off `cards/uaAtoms`. Resolving only local bindings misses those entirely.
 */
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
  // A JSX attribute's scope is its own TAG, not the brace block around it.
  // `<text fontFamily="IM Fell English, serif" fontStyle="italic">` sits inside
  // MediaArt's 12,000-character `switch` body, so every `fontWeight="700"`
  // anywhere in that body counted as this element's — inventing an IM Fell
  // English bold italic, a Bebas Neue bold italic and a Courier Prime bold
  // italic that no plate sets. Harmless while the guard only ever *kept* faces
  // (#1230); the direction below turns an invented face into a demand to load
  // one. Truncating early on an attribute value containing `>` would only drop
  // weights, which is the permissive direction.
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
 * Every face a source file actually sets: each scope that pins a family, paired
 * with the weight and slant pinned alongside it. A scope that names a family and
 * no weight renders at the inherited default, which is 400 everywhere here — no
 * rule in the codebase sets a weight without also setting a family, bar
 * `.markdown-preview strong`, whose family is Lora via `@apply font-display`.
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

  for (const file of collectSourceFiles(SRC_DIR)) {
    const raw = readFileSync(file, "utf-8");
    const source = file.endsWith(".css") ? raw : inlineConstants(file, raw);

    for (const match of source.matchAll(/font-?[fF]amily\s*[:=]/g)) {
      const scope = enclosingScope(source, match.index);
      const families = new Set<string>();
      // Quoted in a stack, or bare before a comma in a JSX attribute
      // (`fontFamily="IM Fell English, serif"`).
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
  const css = readFileSync(join(SRC_DIR, "index.css"), "utf-8");
  tokenValueCache = new Map();
  for (const match of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    // Light theme wins; the dark cascade never repoints a family token.
    if (!tokenValueCache.has(match[1])) tokenValueCache.set(match[1], match[2].trim());
  }
  return tokenValueCache;
}

/**
 * Which available weight a desired one actually renders as — CSS Fonts 4 §5.2.
 *
 * Not a nicety: a declared weight need not be requested to keep a face alive.
 * 22 `font-display` sites set no weight at all, so they ask for 400, and Lora is
 * requested at 500/600 — under this rule they render in the 500 face. Compare
 * requested against declared by equality and Lora 500 looks dead; drop it and
 * all 22 jump to 600. The guard has to resolve the way the browser does, or it
 * recommends deleting the very face a surface is rendering in.
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
    // A bare family is one upright face; `IM Fell English:ital@1` is one italic.
    expect(faces).toContainEqual({ family: "anton", weight: 400, italic: false });
    expect(faces).toContainEqual({ family: "im fell english", weight: 400, italic: true });
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

    // A family with one face has no weight to get wrong — whatever the app sets,
    // that face is what renders. Redundant *faces within a family* are this
    // guard's business; a whole unused family is the family check's, above.
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
      `index.html requests ${unused.join(", ")}, which nothing renders in.
` +
        `Each is a separate download blocking first paint. Drop the axis value
` +
        `from the URL — the family stays, only the weight goes.
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
 * The same axis, the other way round (#1294).
 *
 * #1230 asked "does anything render in this face?" and deleted the answers that
 * were no. It could not ask the converse — a weight a stylesheet sets and the
 * request omits does not fail, it *resolves*: 60 `--font-display` sites asked
 * for 400 and rendered in Lora 500, and 20 more asked for bold and rendered
 * semibold. Nothing on screen says so, which is #839's failure class one axis
 * down: a declaration that looks right and renders as something else.
 *
 * The owner's ruling (#1294) is that the stylesheet is the truth and the loader
 * follows it — where a surface declares a weight, that weight gets requested,
 * rather than the declaration being quietly rewritten to name whichever face the
 * browser happened to substitute.
 *
 * Resolution is CSS Fonts 4's, shared with the check above, so this is not a set
 * comparison: it asks what the browser would actually paint and objects only
 * when that is not what the source asked for.
 *
 * ponytail: this guards WEIGHT, not slant. A declared italic with no italic face
 * requested resolves against the family's upright — which is what the browser
 * does, synthesising the slant — and passes. Telling "this family has no italic"
 * from "this family has an italic we did not request" needs Google's catalogue,
 * which is a network call from a unit test. Bebas Neue is the live instance: it
 * ships one upright face, five na surfaces set `fontStyle: italic` on it, and
 * the oblique is synthetic on every one. Upgrade path is a checked-in catalogue
 * snapshot of the families we load, if a family ever gains an italic we miss.
 */
describe("used weights are requested (#1294)", () => {
  const faces = loadedFaces();
  const families = new Set(faces.map((face) => face.family));

  it("sees the weights source files actually set (sanity check)", () => {
    const declared = declaredFaces(families);
    expect(declared.length).toBeGreaterThan(100);
    // WowSigil's motto band, via `--font-display` — reachable only by resolving
    // the token, and only inside its own scope.
    expect(declared).toContainEqual({ family: "lora", weight: 700, italic: false });
  });

  it("renders every declared weight in a face it requests", () => {
    const substituted = new Set<string>();
    for (const face of declaredFaces(families)) {
      // Slant is matched before weight (CSS Fonts 4 §5.2): with no italic face
      // the browser takes the family's upright and slants it itself, so those
      // are the faces the weight then resolves against.
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
      `Source sets these weights and index.html does not request them, so the
` +
        `browser substitutes: a real face at the wrong weight, or a synthesised
` +
        `fake-bold. Add the axis value to the family's spec in index.html — the
` +
        `family is already loaded, so it is one more face, not one more request.
` +
        `If the family has no such face at all (Bebas Neue is upright 400 and
` +
        `nothing else), the declaration is the thing that is wrong: drop the
` +
        `weight rather than pretending the request can satisfy it (#1294).`,
    ).toEqual([]);
  });
});
