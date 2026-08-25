import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { getAllFactions } from "../factions";
import {
  FACTION_GROUNDS,
  FACTION_ROLES,
  factionRoleProperty,
  factionRoleVar,
  factionRoleVars,
  type FactionRole,
  type GroundOverride,
} from "../factionRoles";
import { readThemes, resolveVar, type Theme } from "./cssVars";

/**
 * THE SEAM IS THE RESOLVER'S OUTPUT (#2659).
 *
 * `factionRoleVars` is the whole of decision 06: a faction supplies a MAP —
 * role → an existing token suffix — and nothing else. So the thing worth
 * measuring is not any rendered surface but the resolver's answer for every
 * (slug × ground × role) triple: which custom properties it declares, and which
 * `--faction-*` token each one points at.
 *
 * That seam has a failure mode nothing else in the repo can see.
 * `factionTokensDeclared.test.ts` — the guard for "looks tokenized, is not" —
 * deliberately skips any name built by interpolation, and says so: *"a dynamic
 * name cannot be checked statically … `factionCssVar()` output is covered by
 * `factions.ts` staying in sync with `index.css` instead."* Every name a role
 * map produces is exactly that kind of name. Point a role at `card-line` (which
 * only the `default` family declares) and tsc, eslint, the raw-value ratchet and
 * that guard all stay green while seven factions render a declaration the
 * browser throws away. The loop below is the missing half: it resolves each
 * role for each registered slug against `index.css` in BOTH cascades.
 *
 * It is NOT a contrast check and must not be read as one. That half is
 * `factionContrast.test.ts`, which since #2661 loops over THIS resolver —
 * every (slug x ground x role) triple, both cascades — rather than scanning
 * `index.css` against a hand-curated pair list. So a role pointed at a token
 * this file proves is DECLARED is measured over there, and the two guards
 * answer the two different questions a map can get wrong: does the name
 * resolve, and is the colour it resolves to legible.
 */

const SRC_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const themes = readThemes(readFileSync(join(SRC_DIR, "index.css"), "utf-8"));

const SLUGS = getAllFactions().map((faction) => faction.slug);
const THEMES: Theme[] = ["light", "dark"];

/** `var(--faction-ua-card-bg)` → `--faction-ua-card-bg`. */
function tokenName(reference: string): string {
  const match = /^var\((--[\w-]+)\)$/.exec(reference);
  expect(match, `${reference} is not a bare var() reference`).not.toBeNull();
  return match![1];
}

describe("every role every faction can be asked for resolves to a real token", () => {
  it("has seven registered slugs to loop over — an empty loop passes vacuously", () => {
    expect(SLUGS.length).toBeGreaterThan(0);
    expect(SLUGS).toContain("snide");
  });

  for (const ground of FACTION_GROUNDS) {
    for (const slug of SLUGS) {
      for (const role of FACTION_ROLES) {
        it(`${slug} · ${ground} · ${role}`, () => {
          const name = tokenName(factionRoleVar(slug, role, ground));
          for (const theme of THEMES) {
            expect(
              resolveVar(name, theme, themes),
              `${name} does not resolve in ${theme} — the map points at a token this family does not declare`,
            ).not.toBeNull();
          }
        });
      }
    }
  }
});

describe("the vocabulary is canonical: same roles for every faction, on every ground", () => {
  it("stays under the dozen that #2650 blew past — the count IS the design", () => {
    // #2650 built a ~50-slot custom-property interface on the smallest faction
    // family and the owner declined to ship it: fifty slots per faction is a
    // component re-expressed as CSS, not a map. This assertion is that ruling
    // made runnable. Raising it is a design decision, not a merge fix.
    expect(FACTION_ROLES.length).toBeLessThanOrEqual(12);
  });

  it("declares the identical property set for every slug and ground", () => {
    const expected = Object.keys(factionRoleVars("ua", "x")).sort();
    expect(expected).toHaveLength(FACTION_ROLES.length);
    for (const ground of FACTION_GROUNDS) {
      for (const slug of SLUGS) {
        expect(
          Object.keys(factionRoleVars(slug, "x", ground)).sort(),
          `${slug} on ${ground} declares a different vocabulary`,
        ).toEqual(expected);
      }
    }
  });

  it("namespaces by the SURFACE's prefix, so a nested host cannot inherit the wrong faction", () => {
    expect(factionRoleVars("ua", "rail")).toHaveProperty("--rail-paper");
    expect(factionRoleVars("ua", "plate")).toHaveProperty("--plate-paper");
  });

  it("kebabs the one role whose name is not already one word", () => {
    expect(factionRoleVars("ua", "rail")).toHaveProperty("--rail-on-fill");
  });
});

describe("a faction that supplies nothing inherits the sheet map whole", () => {
  it("gives Coven the same nine values on the chrome ground as on the sheet", () => {
    expect(factionRoleVars("coven", "rail", "chrome")).toEqual(
      factionRoleVars("coven", "rail", "sheet"),
    );
  });

  it("points the sheet map at the card family, which all eight families declare", () => {
    expect(factionRoleVars("coven", "rail")).toMatchObject({
      "--rail-paper": "var(--faction-coven-card-bg)",
      "--rail-ink": "var(--faction-coven-card-text)",
      "--rail-quiet": "var(--faction-coven-card-muted)",
      "--rail-line": "var(--faction-coven-card-border)",
      "--rail-accent": "var(--faction-coven-card-accent)",
      "--rail-fill": "var(--faction-coven)",
      "--rail-on-fill": "var(--faction-coven-on-fill)",
      "--rail-radius": "var(--faction-coven-card-radius)",
      "--rail-face": "var(--faction-coven-card-font)",
    });
  });
});

describe("a faction overrides for a ground its card sheet cannot serve (#2631, ADR-0085)", () => {
  const MOVED: [FactionRole, string][] = [
    ["paper", "var(--faction-snide-wall)"],
    ["ink", "var(--faction-snide-note-ink)"],
    ["quiet", "var(--faction-snide-note-muted)"],
    ["line", "var(--faction-snide-note-wall-edge)"],
    ["fill", "var(--faction-snide-wall-credit)"],
    // The pair, not a sixth independent choice — see the block below.
    ["onFill", "var(--faction-snide-wall)"],
  ];

  it("moves exactly the six roles the wall re-grounds", () => {
    const chrome = factionRoleVars("snide", "rail", "chrome");
    const sheet = factionRoleVars("snide", "rail", "sheet");
    // `factionRoleProperty`, not `--rail-${role}`. Spelled the second way this
    // loop was blind to `onFill` — the one role whose property name is not its
    // key — so `undefined !== undefined` held for it and the count read five
    // while the pair was broken (#2659 review).
    const moved = FACTION_ROLES.filter(
      (role) =>
        chrome[factionRoleProperty("rail", role) as never] !==
        sheet[factionRoleProperty("rail", role) as never],
    );
    expect(new Set(moved)).toEqual(new Set(MOVED.map(([role]) => role)));
  });

  it("resolves each moved role onto the wall family", () => {
    const chrome = factionRoleVars("snide", "rail", "chrome");
    for (const [role, token] of MOVED) {
      expect(chrome).toHaveProperty(factionRoleProperty("rail", role), token);
    }
    // The slab is pinned near-black in BOTH cascades. Reaching it on this
    // ground is the defect ADR-0085 fixed, not a value to preserve.
    expect(JSON.stringify(chrome)).not.toContain("--faction-snide-card-bg");
  });

  it("leaves geometry and typeface on the card family — neither has a cascade to be wrong in", () => {
    expect(factionRoleVars("snide", "rail", "chrome")).toMatchObject({
      "--rail-radius": "var(--faction-snide-card-radius)",
      "--rail-face": "var(--faction-snide-card-font)",
    });
  });
});

/**
 * THE ONE INVARIANT THE VOCABULARY ITSELF MAKES (#2659 review).
 *
 * `onFill` is in the core BECAUSE `fill` can be overridden per ground — a fill
 * whose paired ink cannot move with it is a contrast bug with no name to fix it
 * at. Then the first and only override in the repo did exactly that: S.N.I.D.E.
 * chrome moved `fill` to `-wall-credit` (#14532d by day) and left `onFill`
 * inheriting `--faction-snide-on-fill` (#14110b, and NOT redefined in the dark
 * cascade). That pair is 2.07:1 in light — under AA, and under 1.4.11's 3:1
 * even for a mark that carries no text.
 *
 * Nothing reads `--rail-on-fill` today, which is exactly why it had to be
 * caught here: this is the vocabulary nine faction lanes get written against,
 * and the first lane to paint on a faction fill in chrome would inherit a
 * broken pair, for the one faction with an override, in the theme people check
 * second.
 *
 * The structural half is gated below and made unrepresentable by
 * {@link GroundOverride}. The measurement half — every (slug × ground) pair
 * read against `index.css` — is #2661, which turns the hand-curated contrast
 * list into a loop over this resolver.
 */
describe("a ground cannot move `fill` and leave its paired ink behind", () => {
  // Compile-time half: the union forbids the shape rather than the review
  // catching it a second time.
  it("does not typecheck a fill-only override", () => {
    // @ts-expect-error — `fill` without `onFill` is not a representable ground
    const fillAlone: GroundOverride = { fill: "wall-credit" };
    const pair: GroundOverride = { fill: "wall-credit", onFill: "wall" };
    expect(fillAlone).toBeTruthy();
    expect(pair).toBeTruthy();
  });

  // Runtime half: an `as` cast can still get past the union, and this reads the
  // resolver's own answer rather than the table it is built from.
  for (const ground of FACTION_GROUNDS) {
    for (const slug of SLUGS) {
      it(`${slug} · ${ground}`, () => {
        const here = factionRoleVars(slug, "rail", ground);
        const sheet = factionRoleVars(slug, "rail", "sheet");
        if (here["--rail-fill" as never] === sheet["--rail-fill" as never]) return;
        expect(
          here["--rail-on-fill" as never],
          `${slug} moves \`fill\` on \`${ground}\` but keeps the sheet's \`onFill\` — an unmeasured pair`,
        ).not.toBe(sheet["--rail-on-fill" as never]);
      });
    }
  }
});

describe("a viewer with no faction is pixel-identical by construction", () => {
  // The hardest half of #2361's acceptance criterion, and the reason the
  // resolver returns an EMPTY object rather than the `default` family: not one
  // custom property is declared, so every `var(--x, <today's token>)` fallback
  // at every read site is the value that already shipped, byte for byte.
  for (const slug of ["na", "albescent", null, undefined, "a-slug-the-server-invented"]) {
    for (const ground of FACTION_GROUNDS) {
      it(`declares nothing for ${String(slug)} on ${ground}`, () => {
        expect(factionRoleVars(slug, "rail", ground)).toEqual({});
      });
    }
  }
});
