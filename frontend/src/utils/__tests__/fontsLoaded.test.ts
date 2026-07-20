import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
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
  "blackletter",
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

describe("font families are loaded (#839)", () => {
  const loaded = loadedFamilies();

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
});
