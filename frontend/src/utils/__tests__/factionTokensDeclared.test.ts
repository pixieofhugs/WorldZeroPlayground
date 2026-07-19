import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { readThemes } from "./cssVars";

/**
 * Guard for the "looks tokenized, is not" failure class (#806).
 *
 * `var(--faction-does-not-exist)` passes tsc, eslint and the no-raw-style-values
 * ratchet — a var() reference looks correctly tokenized to every check we run.
 * At runtime the undefined custom property makes the whole declaration invalid
 * (a color-mix() containing it resolves to nothing), so the chrome silently
 * renders with no colour. Only a name-set comparison can catch it.
 */

const SRC_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".css"];

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    // Tests never render; they quote token names as prose and fixtures.
    // (This file's own docstring trips the guard otherwise — which is a
    // pleasant demonstration that the guard works.)
    if (entry.isDirectory()) {
      return entry.name === "__tests__" ? [] : collectSourceFiles(path);
    }
    return SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))
      ? [path]
      : [];
  });
}

function matchAll(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)].map((match) => match[1]);
}

describe("faction CSS custom properties (#806)", () => {
  // readThemes strips comments and reads both theme blocks, so a token merely
  // *mentioned* in a comment never counts as declared.
  const themes = readThemes(readFileSync(join(SRC_DIR, "index.css"), "utf-8"));
  const declared = new Set(
    [...themes.light.keys(), ...themes.dark.keys()].filter((name) =>
      name.startsWith("--faction-"),
    ),
  );

  it("declares faction tokens in index.css at all (sanity check on the parse)", () => {
    expect(declared.size).toBeGreaterThan(50);
    expect(declared.has("--faction-singularity-card-muted")).toBe(true);
  });

  it("has no var(--faction-*) reference pointing at an undeclared token", () => {
    const orphans: string[] = [];

    for (const file of collectSourceFiles(SRC_DIR)) {
      const source = readFileSync(file, "utf-8");
      for (const token of matchAll(
        source,
        /var\(\s*(--faction-[A-Za-z0-9-]+)/g,
      )) {
        if (!declared.has(token)) {
          orphans.push(`${token} referenced in ${file}`);
        }
      }
    }

    expect(orphans).toEqual([]);
  });
});
