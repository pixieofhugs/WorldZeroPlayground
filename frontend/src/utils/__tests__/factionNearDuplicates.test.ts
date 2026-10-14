/**
 * Near-duplicate literal colours inside one faction's palette.
 *
 * Design hand-offs keep adding a hardcoded colour a smidge off one the faction
 * already has (`#201a14` beside `#1f1913`) and nobody's eye catches it. This
 * guard turns the next one into a red build.
 *
 * For each theme it takes every custom property whose own declared value is a
 * solid literal (hex, or `rgb()` at alpha 1), groups them by faction family
 * (`--faction-{key}-*`, plus the archetype-private `--everymen-*`), and fails
 * on any two DISTINCT values closer than NEAR_DUPLICATE_DELTA_E.
 *
 * Why 5: under ~5 CIE76 two colours can't be told apart unless side by side,
 * so the difference can't be intent. Real steps (a background against its
 * divider line) sit well above it.
 *
 * The fix is to point the new token at the existing one with `var(--…)`, not to
 * add a second literal. BASELINE is a ratchet: pairs that predate the guard.
 * It only shrinks — a fixed pair must have its entry deleted.
 *
 * Blind spots: it reads literals in `src/css` token blocks only. Inline hex in
 * TSX, translucent values, gradients and `color-mix` are not seen.
 */

import { describe, expect, it } from "vitest";

import { readIndexCss } from "../../test/indexCss";
import { deltaE76, parseColor } from "../contrast";
import { readThemes, type Theme } from "./cssVars";

const NEAR_DUPLICATE_DELTA_E = 5;

const THEMES = readThemes(readIndexCss());
const SOLID = /^(#[0-9a-f]{3,8}|rgba?\([^()]*\))$/i;

function family(name: string): string | null {
  const faction = /^--faction-([a-z]+)-/.exec(name);
  if (faction) return faction[1];
  // ponytail: --everymen-* is the only archetype-private colour prefix today.
  return name.startsWith("--everymen-") ? "everymen" : null;
}

function hex(c: { r: number; g: number; b: number }): string {
  return "#" + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

/** theme -> key -> measured pair, for every near-duplicate pair in the CSS. */
function measure(): Map<string, { deltaE: number; tokens: [string, string] }> {
  const found = new Map<string, { deltaE: number; tokens: [string, string] }>();
  for (const theme of ["light", "dark"] as Theme[]) {
    const declared = new Map(THEMES.light);
    if (theme === "dark") for (const [k, v] of THEMES.dark) declared.set(k, v);
    // family -> hex -> first token (sorted) that declares it
    const families = new Map<string, Map<string, { name: string; rgba: NonNullable<ReturnType<typeof parseColor>> }>>();
    for (const [name, value] of [...declared].sort(([a], [b]) => a.localeCompare(b))) {
      const fam = family(name);
      if (!fam || !SOLID.test(value)) continue;
      const rgba = parseColor(value);
      if (!rgba || rgba.a !== 1) continue;
      const values = families.get(fam) ?? new Map();
      if (!values.has(hex(rgba))) values.set(hex(rgba), { name, rgba });
      families.set(fam, values);
    }
    for (const [fam, values] of families) {
      const entries = [...values].sort(([a], [b]) => a.localeCompare(b));
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          const [hexA, a] = entries[i];
          const [hexB, b] = entries[j];
          const deltaE = deltaE76(a.rgba, b.rgba);
          if (deltaE < NEAR_DUPLICATE_DELTA_E) {
            found.set(`${theme} | ${fam} | ${hexA} ~ ${hexB}`, {
              deltaE: Math.round(deltaE * 100) / 100,
              tokens: [a.name, b.name],
            });
          }
        }
      }
    }
  }
  return found;
}

/** Pairs that predate the guard. Delete an entry when its pair is fixed. */
const BASELINE: Record<string, { deltaE: number; tokens: [string, string] }> = {
  "dark | coven | #d66796 ~ #dd719c": { deltaE: 3.76, tokens: ["--faction-coven-slip-row-base", "--faction-coven-card-muted"] },
  "dark | coven | #f0d36e ~ #f4d472": { deltaE: 1.88, tokens: ["--faction-coven-moon-star", "--faction-coven-slip-gold"] },
  "light | coven | #14532d ~ #1c5a37": { deltaE: 3.68, tokens: ["--faction-coven-card-credit", "--faction-coven-cast-to"] },
  "light | coven | #c71860 ~ #c82360": { deltaE: 2.65, tokens: ["--faction-coven-accent-ink", "--faction-coven-slip-row-base"] },
  "light | coven | #c9327a ~ #d13a80": { deltaE: 2.58, tokens: ["--faction-coven-slip-deep", "--faction-coven-mast"] },
  "light | coven | #e3d6f6 ~ #e6dbf7": { deltaE: 2.72, tokens: ["--faction-coven-slip-vio", "--faction-coven-slip-lav"] },
  "light | coven | #fdeef3 ~ #fdeef5": { deltaE: 1.02, tokens: ["--faction-coven-card-bg", "--faction-coven-ward-page"] },
  "light | coven | #fdeef3 ~ #fff6fb": { deltaE: 3.17, tokens: ["--faction-coven-card-bg", "--faction-coven-ward-card"] },
  "light | coven | #fdeef5 ~ #fee5f1": { deltaE: 4.95, tokens: ["--faction-coven-ward-page", "--faction-coven-slip-plate-foot"] },
  "light | coven | #fdeef5 ~ #fff6fb": { deltaE: 3.29, tokens: ["--faction-coven-ward-page", "--faction-coven-ward-card"] },
  "light | coven | #fff6fb ~ #ffffff": { deltaE: 4.69, tokens: ["--faction-coven-ward-card", "--faction-coven-mast-ink"] },
  "dark | default | #1c1b24 ~ #1f1e2b": { deltaE: 3.26, tokens: ["--faction-default-card-bg", "--faction-default-composer-field"] },
  "dark | default | #1c1b24 ~ #26252f": { deltaE: 4.95, tokens: ["--faction-default-card-bg", "--faction-default-stamp-bg"] },
  "dark | default | #1f1e2b ~ #26252f": { deltaE: 4.03, tokens: ["--faction-default-composer-field", "--faction-default-stamp-bg"] },
  "light | default | #fffdf9 ~ #ffffff": { deltaE: 2.24, tokens: ["--faction-default-card-bg", "--faction-default-chip-text"] },
  "dark | ephemerists | #0a0c15 ~ #12151f": { deltaE: 4.25, tokens: ["--faction-ephemerists-vote-plate-to", "--faction-ephemerists-plate-band"] },
  "dark | ephemerists | #12151f ~ #171a26": { deltaE: 2.96, tokens: ["--faction-ephemerists-plate-band", "--faction-ephemerists-plate-bg"] },
  "dark | ephemerists | #171a26 ~ #1d2130": { deltaE: 3.99, tokens: ["--faction-ephemerists-plate-bg", "--faction-ephemerists-plate-inner"] },
  "dark | ephemerists | #e9dcc0 ~ #f0e6c8": { deltaE: 3.57, tokens: ["--faction-ephemerists-metal-platinum", "--faction-ephemerists-plate-ink"] },
  "light | ephemerists | #0a0c15 ~ #12151f": { deltaE: 4.25, tokens: ["--faction-ephemerists-vote-plate-to", "--faction-ephemerists-card-text"] },
  "light | ephemerists | #816527 ~ #8a6d2c": { deltaE: 3.52, tokens: ["--faction-ephemerists-accent-ink", "--faction-ephemerists-plate-brass"] },
  "light | ephemerists | #e0d2ac ~ #eadcb6": { deltaE: 3.56, tokens: ["--faction-ephemerists-plate-page", "--faction-ephemerists-plate-bg"] },
  "light | ephemerists | #e9dcc0 ~ #f2e8ce": { deltaE: 4.38, tokens: ["--faction-ephemerists-metal-platinum", "--faction-ephemerists-plate-inner"] },
  "dark | everymen | #0d0907 ~ #14110b": { deltaE: 3.33, tokens: ["--everymen-ink", "--faction-everymen-on-accent"] },
  "dark | everymen | #0d0907 ~ #161009": { deltaE: 3.69, tokens: ["--everymen-ink", "--everymen-masthead-text"] },
  "dark | everymen | #14110b ~ #161009": { deltaE: 1.35, tokens: ["--faction-everymen-on-accent", "--everymen-masthead-text"] },
  "dark | everymen | #221a16 ~ #2c231c": { deltaE: 4.88, tokens: ["--everymen-paper", "--faction-everymen-sheet-panel"] },
  "dark | everymen | #f3e7ce ~ #f4ecd6": { deltaE: 2.68, tokens: ["--everymen-cream", "--faction-everymen-bill-mast-ink"] },
  "light | everymen | #63533b ~ #6c5a40": { deltaE: 3.36, tokens: ["--everymen-quiet", "--everymen-muted"] },
  "light | everymen | #991b1b ~ #a01c21": { deltaE: 2.92, tokens: ["--faction-everymen-card-alarm", "--everymen-deep-accent"] },
  "light | everymen | #b32227 ~ #c1272d": { deltaE: 4.55, tokens: ["--everymen-paper-accent", "--everymen-field"] },
  "light | everymen | #ece1c6 ~ #f4ecd6": { deltaE: 4.76, tokens: ["--everymen-paper", "--everymen-cream"] },
  "dark | singularity | #030b06 ~ #04120a": { deltaE: 3.52, tokens: ["--faction-singularity-term-page", "--faction-singularity-term-cta-ink"] },
  "dark | singularity | #030b06 ~ #050f08": { deltaE: 1.72, tokens: ["--faction-singularity-term-page", "--faction-singularity-card-bg"] },
  "dark | singularity | #030b06 ~ #08150d": { deltaE: 4.73, tokens: ["--faction-singularity-term-page", "--faction-singularity-term-panel"] },
  "dark | singularity | #030b06 ~ #14110b": { deltaE: 4.53, tokens: ["--faction-singularity-term-page", "--faction-singularity-on-accent"] },
  "dark | singularity | #04120a ~ #050f08": { deltaE: 1.88, tokens: ["--faction-singularity-term-cta-ink", "--faction-singularity-card-bg"] },
  "dark | singularity | #04120a ~ #08150d": { deltaE: 1.4, tokens: ["--faction-singularity-term-cta-ink", "--faction-singularity-term-panel"] },
  "dark | singularity | #04120a ~ #0a1a10": { deltaE: 4.88, tokens: ["--faction-singularity-term-cta-ink", "--faction-singularity-term-chrome"] },
  "dark | singularity | #050f08 ~ #08150d": { deltaE: 3.03, tokens: ["--faction-singularity-card-bg", "--faction-singularity-term-panel"] },
  "dark | singularity | #050f08 ~ #14110b": { deltaE: 4.56, tokens: ["--faction-singularity-card-bg", "--faction-singularity-on-accent"] },
  "dark | singularity | #08150d ~ #0a1a10": { deltaE: 3.64, tokens: ["--faction-singularity-term-panel", "--faction-singularity-term-chrome"] },
  "light | singularity | #04120a ~ #050f08": { deltaE: 1.88, tokens: ["--faction-singularity-term-cta-ink", "--faction-singularity-card-bg"] },
  "light | singularity | #04120a ~ #07130c": { deltaE: 0.7, tokens: ["--faction-singularity-term-cta-ink", "--faction-singularity-term-bg"] },
  "light | singularity | #050f08 ~ #07130c": { deltaE: 1.8, tokens: ["--faction-singularity-card-bg", "--faction-singularity-term-bg"] },
  "light | singularity | #050f08 ~ #14110b": { deltaE: 4.56, tokens: ["--faction-singularity-card-bg", "--faction-singularity-on-accent"] },
  "light | singularity | #0b1b12 ~ #0c2016": { deltaE: 3.31, tokens: ["--faction-singularity-term-panel", "--faction-singularity-term-chrome"] },
  "dark | snide | #000000 ~ #0c0a07": { deltaE: 3.11, tokens: ["--faction-snide-amp-screw-rim", "--faction-snide-card-bg"] },
  "dark | snide | #0c0a07 ~ #14110b": { deltaE: 3.05, tokens: ["--faction-snide-card-bg", "--faction-snide-ink"] },
  "dark | snide | #ff69ac ~ #ff71b1": { deltaE: 3.35, tokens: ["--faction-snide-composer-alarm", "--faction-snide-note-pink-ink"] },
  "light | snide | #d8d6c8 ~ #e0ddd1": { deltaE: 2.85, tokens: ["--faction-snide-card-muted", "--faction-snide-wall-deep"] },
  "light | snide | #e0ddd1 ~ #eae6d8": { deltaE: 3.37, tokens: ["--faction-snide-wall-deep", "--faction-snide-composer-field"] },
  "light | snide | #eae6d8 ~ #f4f1e8": { deltaE: 4.71, tokens: ["--faction-snide-composer-field", "--faction-snide-card-text"] },
  "dark | ua | #191410 ~ #1f1913": { deltaE: 3.25, tokens: ["--faction-ua-page", "--faction-ua-card-box-bg"] },
  "dark | ua | #191410 ~ #201a14": { deltaE: 3.7, tokens: ["--faction-ua-page", "--faction-ua-on-accent"] },
  "dark | ua | #1f1913 ~ #201a14": { deltaE: 0.51, tokens: ["--faction-ua-card-box-bg", "--faction-ua-on-accent"] },
  "dark | ua | #1f1913 ~ #241e18": { deltaE: 2.49, tokens: ["--faction-ua-card-box-bg", "--faction-ua-card-bg"] },
  "dark | ua | #201a14 ~ #241e18": { deltaE: 1.98, tokens: ["--faction-ua-on-accent", "--faction-ua-card-bg"] },
  "dark | ua | #241e18 ~ #2d261f": { deltaE: 4.02, tokens: ["--faction-ua-card-bg", "--faction-ua-panel"] },
  "dark | ua | #2d261f ~ #372e25": { deltaE: 4.22, tokens: ["--faction-ua-panel", "--faction-ua-lift"] },
  "dark | ua | #372e25 ~ #3b3229": { deltaE: 1.84, tokens: ["--faction-ua-lift", "--faction-ua-rule"] },
  "dark | ua | #e0672c ~ #e86a2c": { deltaE: 3.17, tokens: ["--faction-ua-rank-4", "--faction-ua-card-chip-bg"] },
  "dark | ua | #f0894a ~ #f08a4e": { deltaE: 1.74, tokens: ["--faction-ua-card-accent", "--faction-ua-glow"] },
  "light | ua | #a5400f ~ #ac4115": { deltaE: 2.78, tokens: ["--faction-ua-card-accent", "--faction-ua-accent-ink"] },
  "light | ua | #ac4115 ~ #b8471a": { deltaE: 3.89, tokens: ["--faction-ua-accent-ink", "--faction-ua-card-chip-bg"] },
  "light | ua | #b8471a ~ #c24a18": { deltaE: 4.6, tokens: ["--faction-ua-card-chip-bg", "--faction-ua-mast"] },
  "light | ua | #dbcbb3 ~ #e4d8c3": { deltaE: 4.99, tokens: ["--faction-ua-rule", "--faction-ua-hair"] },
  "light | ua | #e4d8c3 ~ #e7dcc9": { deltaE: 1.8, tokens: ["--faction-ua-hair", "--faction-ua-page"] },
  "light | ua | #e4d8c3 ~ #f2e0cb": { deltaE: 4, tokens: ["--faction-ua-hair", "--faction-ua-light"] },
  "light | ua | #e7dcc9 ~ #f2e0cb": { deltaE: 3.44, tokens: ["--faction-ua-page", "--faction-ua-light"] },
  "light | ua | #e7dcc9 ~ #f7e7d2": { deltaE: 4.71, tokens: ["--faction-ua-page", "--faction-ua-card-bg"] },
  "light | ua | #f2e0cb ~ #f7e7d2": { deltaE: 2.44, tokens: ["--faction-ua-light", "--faction-ua-card-bg"] },
  "light | ua | #f7e7d2 ~ #fdf0df": { deltaE: 3.87, tokens: ["--faction-ua-card-bg", "--faction-ua-lift"] },
  "dark | wow | #141005 ~ #14110b": { deltaE: 1.94, tokens: ["--faction-wow-ground-to", "--faction-wow-on-accent"] },
  "dark | wow | #141005 ~ #1b1508": { deltaE: 3.32, tokens: ["--faction-wow-ground-to", "--faction-wow-card-bg"] },
  "dark | wow | #14110b ~ #1b1508": { deltaE: 4.59, tokens: ["--faction-wow-on-accent", "--faction-wow-card-bg"] },
  "dark | wow | #1b1508 ~ #221a0c": { deltaE: 3.74, tokens: ["--faction-wow-card-bg", "--faction-wow-duel-lists-bg"] },
  "dark | wow | #221a0c ~ #241c0b": { deltaE: 2.07, tokens: ["--faction-wow-duel-lists-bg", "--faction-wow-avatar-field"] },
  "dark | wow | #241c0b ~ #2a2210": { deltaE: 3.33, tokens: ["--faction-wow-avatar-field", "--faction-wow-chronicle-panel"] },
  "dark | wow | #2a1d02 ~ #2a2210": { deltaE: 4.6, tokens: ["--faction-wow-avatar-pill-text", "--faction-wow-chronicle-panel"] },
  "dark | wow | #e3b84a ~ #e7b94e": { deltaE: 1.79, tokens: ["--faction-wow-stamp-total", "--faction-wow-balloon-5"] },
  "dark | wow | #e9cb7e ~ #f5d583": { deltaE: 4.33, tokens: ["--faction-wow-avatar-ring-lit", "--faction-wow-avatar-pill-from"] },
  "light | wow | #241c0b ~ #2b2412": { deltaE: 4.15, tokens: ["--faction-wow-balloon-eye", "--faction-wow-card-text"] },
  "light | wow | #f1e3b8 ~ #f3e7c4": { deltaE: 4.48, tokens: ["--faction-wow-ground-to", "--faction-wow-chronicle-panel"] },
  "light | wow | #f7eed8 ~ #fbf4e0": { deltaE: 2.38, tokens: ["--faction-wow-detail-inset", "--faction-wow-avatar-field"] },
};

describe("faction palettes carry no near-duplicate literal colours", () => {
  const live = measure();

  it("adds no new near-duplicate pair", () => {
    const fresh = [...live]
      .filter(([key]) => !(key in BASELINE))
      .map(
        ([key, { deltaE, tokens }]) =>
          `${key} (ΔE ${deltaE}): ${tokens[0]} and ${tokens[1]} are indistinguishable — point the new one at the existing one (var(${tokens[0]}) or var(${tokens[1]})) instead of adding a literal.`,
      );
    expect(fresh, "new near-duplicate literals").toEqual([]);
  });

  it("keeps no baseline entry for a pair that is fixed", () => {
    const fixed = Object.keys(BASELINE)
      .filter((key) => !live.has(key))
      .map((key) => `${key} — fixed — delete its entry.`);
    expect(fixed, "BASELINE names a pair that no longer measures under the threshold").toEqual([]);
  });
});
