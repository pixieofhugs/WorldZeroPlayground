/**
 * Part A of the contrast foundation (#651) — the token-value test.
 *
 * WHY THIS EXISTS. The same contrast bug has been fixed three times, one
 * instance at a time (#595, #594, #649), and each eyeball audit left siblings
 * alive. 7 factions x 2 themes x ~6 surfaces is a few hundred pairings; no
 * human and no file-reading agent covers that reliably. So the audit is
 * mechanical — and once mechanical, the audit and the regression guard are the
 * same artifact. SPEC-faction-ui-profile.md §4 item 15 already *requires* AA
 * verification at faction registration; this is the test that bullet always
 * should have been.
 *
 * WHAT IT CATCHES. The *value* shape of the bug: a token whose declared color
 * simply doesn't clear AA against the surface it is documented to sit on, in
 * either theme. It cannot catch the *pairing* shape (a component grabbing
 * `--everymen-ink` for text on `--everymen-paper`) — pairings only exist once
 * rendered, which is what `e2e/contrast.spec.ts` (Part B) is for.
 *
 * THE MANIFEST is the §3 token contract, not a guess: the standard
 * `--faction-{key}-card-*` suffix set, the faction fills under
 * `--color-text-on-accent`, and the archetype-private primitives whose roles
 * index.css states verbatim ("text on gold/parchment elements", "bright text
 * on dark elements", "primary text on vellum").
 *
 * ALPHA IS COMPOSITED. Several inks are rgba, and measuring them un-composited
 * is exactly what let #594's 2.78:1 muted ink ship green.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { AA_LARGE, AA_NORMAL, contrastRatio, formatRatio, parseColor } from "../contrast";
import { readThemes, resolveVar, type Theme } from "./cssVars";

const CSS_PATH = fileURLToPath(new URL("../../index.css", import.meta.url));
const THEMES = readThemes(readFileSync(CSS_PATH, "utf8"));
const BOTH_THEMES: Theme[] = ["light", "dark"];

/** Every faction that supplies the standard `--faction-{key}-card-*` block (§3). */
const CARD_KEYS = [
  "ua",
  "everymen",
  "wow",
  "snide",
  "ephemerists",
  "singularity",
  "default",
] as const;

/**
 * Factions whose primary is a solid fill that carries text. `default` (na) is
 * absent on purpose: ADR-0039 says the unaffiliated fill is a *gradient*, not
 * a hue, and its neutral `--faction-default` hex is canvas/SVG only — it is
 * never a text backdrop. That is why #649 counts 14 pairs (7 x 2), not 16.
 */
const FILL_KEYS = CARD_KEYS.filter((key) => key !== "default");

type Pair = {
  /** Human label — this is what a failure message has to make actionable. */
  what: string;
  surface: string;
  text: string;
  /** AA floor. Defaults to 4.5; set AA_LARGE only where the role is large display type. */
  floor?: number;
};

const CARD_PAIRS: Pair[] = CARD_KEYS.flatMap((key) => [
  { what: `${key} card body text`, surface: `--faction-${key}-card-bg`, text: `--faction-${key}-card-text` },
  { what: `${key} card muted text`, surface: `--faction-${key}-card-bg`, text: `--faction-${key}-card-muted` },
  // "metadata / decorative accent" (§3) — metadata is text, so it owes 4.5:1.
  { what: `${key} card accent`, surface: `--faction-${key}-card-bg`, text: `--faction-${key}-card-accent` },
]);

/**
 * #649 — text on each faction's solid fill. The global `--color-text-on-accent`
 * (#ffffff) failed AA on 7 of these 14 pairs, so each faction now owns a
 * per-theme `--faction-{key}-on-fill` (white or ink); this measures that token.
 */
const FILL_PAIRS: Pair[] = FILL_KEYS.map((key) => ({
  what: `${key} fill, on-fill`,
  surface: `--faction-${key}`,
  text: `--faction-${key}-on-fill`,
}));

/**
 * Archetype-private primitives. Each entry is a role index.css states in
 * words; nothing here is inferred from how a component happens to use a token.
 */
const ARCHETYPE_PAIRS: Pair[] = [
  // Everymen — "the paper surface + its text FLIP in dark"; ink is structure:
  // "borders, rules, text on gold/parchment elements".
  { what: "everymen paper", surface: "--everymen-paper", text: "--everymen-paper-text" },
  { what: "everymen paper, muted", surface: "--everymen-paper", text: "--everymen-muted" },
  { what: "everymen cream element, ink", surface: "--everymen-cream", text: "--everymen-ink" },
  { what: "everymen gold element, ink", surface: "--everymen-gold", text: "--everymen-ink" },
  { what: "everymen poster field, cream", surface: "--everymen-field", text: "--everymen-cream" },

  // Ephemerists — "the VELLUM surface + its text FLIP in dark"; --eph-ink
  // "stays dark in both themes"; --eph-parchment is "bright text on dark elements".
  { what: "ephemerists vellum", surface: "--eph-vellum", text: "--eph-vellum-text" },
  { what: "ephemerists vellum, muted", surface: "--eph-vellum", text: "--eph-muted" },
  { what: "ephemerists vellum, rubric", surface: "--eph-vellum", text: "--eph-rubric" },
  { what: "ephemerists gold element, ink", surface: "--eph-gold", text: "--eph-ink" },
  { what: "ephemerists parchment element, ink", surface: "--eph-parchment", text: "--eph-ink" },
  { what: "ephemerists lapis field, parchment", surface: "--eph-field", text: "--eph-parchment" },

  // S.N.I.D.E. — the flyposted wall is the one SNIDE surface that flips.
  { what: "snide flyposted wall", surface: "--faction-snide-wall", text: "--faction-snide-wall-text" },
  { what: "snide deep wall", surface: "--faction-snide-wall-deep", text: "--faction-snide-wall-text" },
  { what: "snide xerox paper, ink", surface: "--faction-snide-paper", text: "--faction-snide-ink" },

  // UA — always-light gilt salon (#240); --ua-ink is "brown ink — all text".
  { what: "ua sheet, ink", surface: "--ua-paper", text: "--ua-ink" },
  { what: "ua sheet, secondary", surface: "--ua-paper", text: "--ua-sub" },
  { what: "ua sheet, mono labels", surface: "--ua-paper", text: "--ua-muted" },
  { what: "ua wall, ink", surface: "--ua-wall", text: "--ua-ink" },

  // Albescent has no rows here on purpose (#783): it has no tokens left to
  // measure. It renders Default's surfaces, which `default` already covers.
];

const PAIRS: Pair[] = [...CARD_PAIRS, ...FILL_PAIRS, ...ARCHETYPE_PAIRS];

/**
 * Part C — the baseline allowlist (the ratchet).
 *
 * This spec was red on landing: the bug family is real and pre-dates the
 * guard. Rather than block the guard on the fixes, known failures are
 * enumerated here so the suite is green and NEW violations are blocked —
 * mirroring the repo's `no-raw-style-values` ratchet doctrine.
 *
 * **This list only ever shrinks.** Fixing a token means DELETING its line, not
 * editing the ratio: an allowlisted pair that starts passing fails this test
 * on purpose. Never add a line for new work.
 *
 * `ratio` is the measured value at the time of landing; `issue` is the child
 * that owns the fix. `651` means "found by the sweep, listed in #651's audit
 * comment, awaiting triage into a child".
 */
const BASELINE: Record<string, { ratio: number; issue: number }> = {
  // ── #649 fixed: `--faction-{key}-on-fill` now carries AA-legible text on every
  //    faction fill in both themes, so the 7 failing white-on-fill pairs are gone. ──

  // ── Albescent faint ink — the sibling #594 left alive (named in #651) ──

  // ── Found by this sweep — awaiting triage into children (#651 audit comment) ──
  // Card accents used as metadata text (§3: "metadata / decorative accent").
  "light | ua card accent": { ratio: 4.27, issue: 651 },
  "light | everymen card accent": { ratio: 4.49, issue: 651 },
  "light | wow card accent": { ratio: 2.81, issue: 651 },
  "dark | ua card accent": { ratio: 4.27, issue: 651 },
  "dark | everymen card accent": { ratio: 4.16, issue: 651 },
  "dark | ephemerists card accent": { ratio: 3.72, issue: 651 },
  // The same rubric vermilion, reached through its archetype-private primitive.
  "dark | ephemerists vellum, rubric": { ratio: 3.72, issue: 651 },
  // UA mono metadata labels on the gilt sheet, both themes (UA never dims).
  "light | ua sheet, mono labels": { ratio: 3.06, issue: 651 },
  "dark | ua sheet, mono labels": { ratio: 3.06, issue: 651 },
};

function key(theme: Theme, pair: Pair): string {
  return `${theme} | ${pair.what}`;
}

function resolveColor(name: string, theme: Theme) {
  const raw = resolveVar(name, theme, THEMES);
  return { raw, color: raw === null ? null : parseColor(raw) };
}

describe("faction token contrast (WCAG AA)", () => {
  for (const theme of BOTH_THEMES) {
    describe(theme, () => {
      for (const pair of PAIRS) {
        it(`${pair.what} clears AA`, () => {
          const surface = resolveColor(pair.surface, theme);
          const text = resolveColor(pair.text, theme);

          // Fail loudly, never skip: an unresolvable or non-solid token is a
          // hole in the audit, and a silent hole is what makes axe useless here.
          expect(surface.color, `${pair.surface} (${theme}) resolved to "${surface.raw}" — not a solid color`).not.toBeNull();
          expect(text.color, `${pair.text} (${theme}) resolved to "${text.raw}" — not a solid color`).not.toBeNull();
          expect(surface.color!.a, `${pair.surface} is a surface — it must be opaque`).toBe(1);

          const floor = pair.floor ?? AA_NORMAL;
          const ratio = contrastRatio(text.color!, surface.color!);
          const allowed = BASELINE[key(theme, pair)];

          if (allowed) {
            expect(
              ratio,
              `${key(theme, pair)} now measures ${formatRatio(ratio)} and clears AA — delete its BASELINE entry (owned by #${allowed.issue}).`,
            ).toBeLessThan(floor);
            expect(
              ratio,
              `${key(theme, pair)} measures ${formatRatio(ratio)} but its BASELINE entry records ${allowed.ratio} — update the entry so the debt list stays honest.`,
            ).toBeCloseTo(allowed.ratio, 1);
            return;
          }

          expect(
            ratio,
            `${key(theme, pair)}: ${pair.text} (${text.raw}) on ${pair.surface} (${surface.raw}) = ${formatRatio(ratio)}, needs ${floor}:1.`,
          ).toBeGreaterThanOrEqual(floor);
        });
      }
    });
  }

  it("has no stale baseline entries", () => {
    const live = new Set(BOTH_THEMES.flatMap((theme) => PAIRS.map((pair) => key(theme, pair))));
    const stale = Object.keys(BASELINE).filter((entry) => !live.has(entry));
    expect(stale, "BASELINE names a pair the manifest no longer measures").toEqual([]);
  });

  it("uses the WCAG large-text floor only where a role is large display type", () => {
    // Guard against the floor becoming an escape hatch: 3:1 is a real WCAG
    // allowance, not a way to launder a failing token.
    const large = PAIRS.filter((pair) => pair.floor === AA_LARGE);
    expect(large.every((pair) => pair.what.includes("display"))).toBe(true);
  });
});
