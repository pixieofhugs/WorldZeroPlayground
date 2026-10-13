import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { sourceFiles as walkSource } from "../../test/sourceScan";
import { readIndexCss } from "../../test/indexCss";

/**
 * The critical-path half of the font kit (#2079).
 *
 * `src/index.css` `@import`s `src/fonts.css`, so every `@font-face` rule in that
 * file lands in the one render-blocking stylesheet. 62 of the 82 rules were for
 * faces only a faction surface can render in — ~1.1 KB gzipped of a CSS budget
 * that had 774 bytes of headroom, paid by every visitor on every route. Those 62
 * now live in `src/fonts.faction.css`, whose only importer is
 * `src/factionFaces.ts`, which is reached only through a chunk boundary. Vite
 * therefore emits it as a second CSS asset attached to async chunks, and
 * `dist/index.html` never mentions it.
 *
 * WHY A GUARD AND NOT A SCREENSHOT
 * -------------------------------
 * Both failure directions are invisible.
 *
 * Strand a family and nothing throws: every rule carries `font-display: swap`,
 * so a surface whose face never arrives paints in the generic fallback and stays
 * there. On a face-defined surface that is a change of identity, and it looks
 * like a slow network rather than a bug — #839's failure class wearing the
 * delivery mechanism's clothes, and the third time this repo has had to guard it
 * (`fontsLoaded.test.ts` holds the family and weight halves).
 *
 * Wire the sheet back onto the critical path and nothing throws either: one
 * static `import` of `factionFaces` from anything the entry chunk reaches puts
 * all 62 rules back in the blocking stylesheet, with the build green and the only
 * symptom a number in `bundle-budget.mjs`.
 *
 * SO THE UNIT OF THE ASSERTION IS A LOAD ROOT, NOT A FILE.
 * "Some archetype imports this component" is the wrong question and it passes on
 * a real defect: `DefaultProfileBody` is imported by `AlbescentProfileBody` (an
 * archetype) AND directly by `FactionProfileBody`, so an unaffiliated player's
 * profile loads the module with no archetype in the tree — and the duel-victor
 * badge's ring legend is Cinzel. The question that catches that is: for every
 * module the app can start loading independently (`main.tsx` and every `import()`
 * target), can everything in ITS static graph get the sheet? Four modules failed
 * it and now import `factionFaces` themselves; `VoteShell`'s logged-out gate is
 * the sharpest of them, since it paints six faction voices for a viewer who has
 * no faction at all.
 */

const FRONTEND_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..");
const SRC_DIR = join(FRONTEND_DIR, "src");
const SHELL_SHEET = join(SRC_DIR, "fonts.css");
const FACTION_SHEET = join(SRC_DIR, "fonts.faction.css");
const FACES_MODULE = join(SRC_DIR, "factionFaces.ts");
const ENTRY_MODULE = join(SRC_DIR, "main.tsx");

/**
 * The families the app SHELL renders in, and therefore the only ones allowed to
 * block first paint: the `--font-display` / `--font-body` / `--font-accent`
 * families, which are also Tailwind's three family utilities (the `@theme
 * inline` block in `src/css/00-prelude.css` since #2918, `tailwind.config.ts`
 * before it) and so reachable from the nav, the sidebar and every neutral
 * page — none of which is behind a chunk boundary.
 */
const SHELL_FAMILIES = new Set(["lora", "courier prime", "bebas neue"]);

// `assets` holds no `.ts`/`.tsx`/`.css` file today, so no explicit exclusion is
// needed beyond the extension match `walkSource` already applies.
const ALL_FILES = walkSource({ dir: SRC_DIR, match: /\.(ts|tsx|css)$/ });
const relative = (file: string): string => file.slice(SRC_DIR.length + 1).replace(/\\/g, "/");

/** The families a generated sheet ships an `@font-face` rule for. */
function familiesIn(sheet: string): Set<string> {
  return new Set(
    [...readFileSync(sheet, "utf8").matchAll(/font-family:\s*'([^']+)'/g)].map((match) =>
      match[1].toLowerCase(),
    ),
  );
}

const ruleCount = (sheet: string): number =>
  [...readFileSync(sheet, "utf8").matchAll(/@font-face\s*\{/g)].length;

/** `--token: value` from index.css; the light cascade wins, families never flip. */
const TOKEN_VALUES = ((): Map<string, string> => {
  const css = readIndexCss();
  const values = new Map<string, string>();
  for (const match of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    if (!values.has(match[1])) values.set(match[1], match[2].trim());
  }
  return values;
})();

/** The faction-only families a `var(--token)` resolves to, following aliases. */
function familiesBehind(
  token: string,
  factionOnly: Set<string>,
  seen = new Set<string>(),
): string[] {
  if (seen.has(token)) return [];
  seen.add(token);
  const value = TOKEN_VALUES.get(token);
  if (value === undefined) return [];
  const families = [...value.matchAll(/["']([^"']+)["']/g)]
    .map((match) => match[1].trim().toLowerCase())
    .filter((family) => factionOnly.has(family));
  for (const alias of value.matchAll(/var\((--[a-z0-9-]+)\)/g)) {
    families.push(...familiesBehind(alias[1], factionOnly, seen));
  }
  return families;
}

/**
 * Every faction-only family a file actually SETS as a `font-family`.
 *
 * Deliberately narrower than `fontsLoaded`'s "does anything mention this name":
 * that question decides whether a family stays on the request, this one decides
 * which sheet it has to be in, so only a family something renders in counts.
 */
function renderedFactionFamilies(file: string, factionOnly: Set<string>): string[] {
  const source = readFileSync(file, "utf8");
  const found = new Set<string>();
  for (const declaration of source.matchAll(/font-?[fF]amily\s*[:=]\s*([^;\n}]+)/g)) {
    for (const quoted of declaration[1].matchAll(/["']([A-Za-z][A-Za-z0-9 ]+)["']/g)) {
      const family = quoted[1].trim().toLowerCase();
      if (factionOnly.has(family)) found.add(family);
    }
    // `fontFamily="IM Fell English, serif"` — the quotes wrap the whole stack.
    const bare = declaration[1].match(/^\s*["']([A-Za-z][A-Za-z0-9 ]+),/);
    if (bare && factionOnly.has(bare[1].trim().toLowerCase())) {
      found.add(bare[1].trim().toLowerCase());
    }
  }
  // A skin routes its faces through `const WITCH = 'var(--font-faction-witch)'`
  // and then sets `fontFamily: WITCH`, so the token and the declaration are not
  // in one expression. In a MODULE, therefore, any faction font token mentioned
  // at all counts.
  //
  // Not in a stylesheet, where the two questions come apart: index.css is the
  // token DICTIONARY, so `--faction-coven-card-font: var(--font-faction-script)`
  // mentions eight of these families while rendering in none of them. A .css file
  // renders in a family only where it sets `font-family` — which the loop above
  // reads, and which must keep working, since `font-family: var(--font-faction-…)`
  // in index.css WOULD be a face demanded from the blocking sheet.
  if (!file.endsWith(".css")) {
    for (const reference of source.matchAll(/var\((--[a-z0-9-]+)\)/g)) {
      for (const family of familiesBehind(reference[1], factionOnly)) found.add(family);
    }
  }
  return [...found].sort();
}

function resolveModule(from: string, specifier: string): string | undefined {
  const base = resolvePath(dirname(from), specifier);
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.css`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return undefined;
}

/**
 * `export { a, default as B } from './x'` — the name a barrel re-exports, and the
 * module that defines it.
 *
 * Needed because `components/factionMarks/index.ts` is a pure re-export barrel:
 * treat a named import of it as an edge to everything it names and `main.tsx`
 * appears to reach `covenSlip` and `PointsRoundel`, which the built entry chunk
 * does not contain — Rollup follows the NAME. Over-counting here does not merely
 * add noise, it fails the assertion below on paths the bundler never loads
 * together, and a guard with false positives gets weakened rather than obeyed.
 */
const REEXPORTS = ((): Map<string, Map<string, string>> => {
  const barrels = new Map<string, Map<string, string>>();
  for (const file of ALL_FILES) {
    if (file.endsWith(".css")) continue;
    const names = new Map<string, string>();
    for (const match of readFileSync(file, "utf8").matchAll(
      /export\s*\{([^}]*)\}\s*from\s*["'](\.[^"']+)["']/g,
    )) {
      const target = resolveModule(file, match[2]);
      if (!target) continue;
      for (const clause of match[1].split(",")) {
        const name = clause.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop()?.trim();
        if (name) names.set(name, target);
      }
    }
    if (names.size > 0) barrels.set(file, names);
  }
  return barrels;
})();

/**
 * Static import edges. `import type` is erased by the compiler and creates no
 * runtime edge; `import()` is deliberately absent, because a dynamic import is
 * the chunk boundary this whole guard is about.
 */
const STATIC_EDGES = new Map<string, string[]>();
const DYNAMIC_EDGES = new Map<string, string[]>();
for (const file of ALL_FILES) {
  if (file.endsWith(".css")) {
    STATIC_EDGES.set(file, []);
    DYNAMIC_EDGES.set(file, []);
    continue;
  }
  const source = readFileSync(file, "utf8");
  const statics = new Set<string>();
  const dynamics = new Set<string>();
  for (const match of source.matchAll(
    /(?:^|[\n;}])\s*import\s+(?!type\s)([^'"]*?from\s*)?["'](\.[^"']+)["']/g,
  )) {
    const target = resolveModule(file, match[2]);
    if (!target) continue;
    statics.add(target);
    const barrel = REEXPORTS.get(target);
    if (!barrel) continue;
    const clause = match[1] ?? "";
    const named = clause.match(/\{([^}]*)\}/);
    if (named && !/\*\s*as/.test(clause)) {
      for (const specifier of named[1].split(",")) {
        const name = specifier.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();
        const defined = barrel.get(name);
        if (defined) statics.add(defined);
      }
    } else {
      for (const defined of barrel.values()) statics.add(defined);
    }
  }
  for (const match of source.matchAll(
    /(?:^|[\n;}])\s*export\s+(?!type\s)[^'"{]*?from\s*["'](\.[^"']+)["']/g,
  )) {
    const target = resolveModule(file, match[1]);
    if (target) statics.add(target);
  }
  for (const match of source.matchAll(/import\(\s*["'](\.[^"']+)["']/g)) {
    const target = resolveModule(file, match[1]);
    if (target) dynamics.add(target);
  }
  STATIC_EDGES.set(file, [...statics]);
  DYNAMIC_EDGES.set(file, [...dynamics]);
}

/** Every file reachable from `roots` by static import alone. */
function staticallyReachable(roots: string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [...roots];
  while (stack.length > 0) {
    const file = stack.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    stack.push(...(STATIC_EDGES.get(file) ?? []));
  }
  return seen;
}

/** The archetype modules the eight faction manifests name in an `import()`. */
const ARCHETYPE_ROOTS = new Set(
  walkSource({ dir: join(SRC_DIR, "factions"), match: /\.ts$/ }).flatMap(
    (file) => DYNAMIC_EDGES.get(file) ?? [],
  ),
);

/** Everything the app can begin loading on its own: the entry, and every chunk. */
const LOAD_ROOTS = new Set([
  ENTRY_MODULE,
  ...ALL_FILES.flatMap((file) => DYNAMIC_EDGES.get(file) ?? []),
]);

describe("the faction faces are off the critical path (#2079)", () => {
  const shell = familiesIn(SHELL_SHEET);
  const faction = familiesIn(FACTION_SHEET);

  it("splits the generated kit into a shell sheet and a faction sheet", () => {
    // A zero anywhere here is the parse having broken, not a clean split.
    expect(ruleCount(SHELL_SHEET)).toBeGreaterThan(10);
    expect(ruleCount(FACTION_SHEET)).toBeGreaterThan(40);
    // The blocking sheet holds the shell's three families and nothing else.
    expect([...shell].sort()).toEqual([...SHELL_FAMILIES].sort());
    // And no family sits in both, or a browser would fetch one face twice.
    expect([...faction].filter((family) => shell.has(family))).toEqual([]);
  });

  it("gives every chunk that draws a faction face a way to fetch the sheet", () => {
    const consumers = new Map(
      ALL_FILES.filter((file) => file !== SHELL_SHEET && file !== FACTION_SHEET)
        .map((file) => [file, renderedFactionFamilies(file, faction)] as const)
        .filter(([, families]) => families.length > 0),
    );
    // Zero consumers would pass this vacuously; the app draws ~80.
    expect(consumers.size).toBeGreaterThan(40);

    const stranded: string[] = [];
    for (const root of [...LOAD_ROOTS].sort()) {
      // An archetype's own loader asks for the sheet, so anything in its graph
      // is covered without a static import of its own.
      if (ARCHETYPE_ROOTS.has(root)) continue;
      const graph = staticallyReachable([root]);
      if (graph.has(FACES_MODULE)) continue;
      for (const [file, families] of consumers) {
        if (graph.has(file)) {
          stranded.push(`${relative(root)} loads ${relative(file)} (${families.join(", ")})`);
        }
      }
    }

    expect(
      stranded.sort(),
      `Each line is a chunk the app can load on its own, a module in its static
` +
        `graph that sets a family from src/fonts.faction.css, and the families.
` +
        `Nothing on that path reaches src/factionFaces.ts, so the sheet is never
` +
        `fetched and the type renders in its generic fallback — silently, because
` +
        `the fallback IS the rendering (#839).
` +
        `Fix it by adding \`import '<relative>/factionFaces'\` to the MODULE that
` +
        `draws the face, the way components/vote/VoteShell.tsx and
` +
        `components/badges/badgeArt.tsx do. Do NOT move the family back into
` +
        `src/fonts.css: that is the critical path, and one family is enough to
` +
        `re-open the 1.1 KB #2079 reclaimed.`,
    ).toEqual([]);
  });

  it("never lets the faction sheet back onto the critical path", () => {
    const eager = staticallyReachable([ENTRY_MODULE]);

    expect(
      eager.has(FACES_MODULE),
      `src/main.tsx statically reaches src/factionFaces.ts, which imports the
` +
        `62-rule faction sheet — so Vite folds it back into the render-blocking
` +
        `stylesheet and #2079's win is gone, with the build green and only
` +
        `bundle-budget.mjs any the wiser. Reach it with a dynamic
` +
        `\`import('.../factionFaces')\` the way factions/lazyArchetype.tsx does,
` +
        `or move the drawing into a lazy chunk.`,
    ).toBe(false);

    // ...and the dynamic reach is the whole mechanism, so assert it is there
    // rather than passing because nothing imports the module at all.
    expect(readFileSync(join(SRC_DIR, "factions", "lazyArchetype.tsx"), "utf8")).toContain(
      "import('../factionFaces')",
    );
  });
});
