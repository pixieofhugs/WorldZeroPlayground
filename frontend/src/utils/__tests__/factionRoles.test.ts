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
import { readIndexCss } from "../../test/indexCss";

/**
 * The seam is the resolver's output (#2659): for every (slug × ground × role),
 * does the token `factionRoleVars` points at resolve in both cascades?
 * `factionTokensDeclared.test.ts` skips interpolated names, so this is the only
 * check that sees a role pointed at an undeclared token. Not a contrast check:
 * that is `factionContrast.test.ts`, which loops over this resolver (#2661).
 */

const themes = readThemes(readIndexCss());

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
    // Owner ruling on #2650's ~50-slot interface. Raising this is a design
    // decision, not a merge fix.
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
    // The acid reads 1.03:1 on the light wall (#2669); `-wall-credit` is gated
    // by `SNIDE_WALL_INKS` (#2343).
    ["accent", "var(--faction-snide-wall-credit)"],
    ["fill", "var(--faction-snide-wall-credit)"],
    // Paired with `fill`; see the block below.
    ["onFill", "var(--faction-snide-wall)"],
  ];

  it("moves exactly the seven roles the wall re-grounds", () => {
    const chrome = factionRoleVars("snide", "rail", "chrome");
    const sheet = factionRoleVars("snide", "rail", "sheet");
    // `factionRoleProperty`, not `--rail-${role}`, which misses `onFill`.
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
    // The near-black slab on this ground is the ADR-0085 defect.
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
 * A ground that overrides `fill` must override `onFill` too, or the pair is an
 * unmeasured contrast bug (S.N.I.D.E. chrome once hit 2.07:1). Structurally via
 * {@link GroundOverride}; contrast is measured in #2661's loop.
 */
describe("a ground cannot move `fill` and leave its paired ink behind", () => {
  it("does not typecheck a fill-only override", () => {
    // @ts-expect-error — `fill` without `onFill` is not a representable ground
    const fillAlone: GroundOverride = { fill: "wall-credit" };
    const pair: GroundOverride = { fill: "wall-credit", onFill: "wall" };
    expect(fillAlone).toBeTruthy();
    expect(pair).toBeTruthy();
  });

  // Runtime half: an `as` cast can still get past the union.
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

describe("a viewer with no faction is pixel-identical by PROOF (#2690, ADR-0089)", () => {
  // The map answers every unidentified slug with the neutral
  // `--faction-default-*` family. The rail's own `{}` guard is a separate
  // exception, held in `factionRoleFallbacks.test.ts`.
  const UNIDENTIFIED = ["na", "albescent", null, undefined, "a-slug-the-server-invented"];

  for (const slug of UNIDENTIFIED) {
    for (const ground of FACTION_GROUNDS) {
      it(`answers with all nine roles for ${String(slug)} on ${ground}`, () => {
        const vars = factionRoleVars(slug, "rail", ground) as Record<string, string>;
        expect(Object.keys(vars).sort()).toEqual(
          FACTION_ROLES.map((role) => factionRoleProperty("rail", role)).sort(),
        );
        for (const role of FACTION_ROLES) {
          expect(vars[factionRoleProperty("rail", role)]).toBe(
            factionRoleVar(slug, role, ground),
          );
        }
      });

      it(`gives ${String(slug)} the neutral family on ${ground}, not a hue of its own`, () => {
        // ADR-0048 / ADR-0083: a hue of its own would out Albescent.
        const vars = factionRoleVars(slug, "rail", ground) as Record<string, string>;
        for (const value of Object.values(vars)) {
          expect(value).toMatch(/^var\(--faction-default(-|\))/);
        }
      });
    }
  }

  it("gives every unidentified slug byte-identical values", () => {
    const answers = UNIDENTIFIED.map((slug) => factionRoleVars(slug, "rail"));
    for (const answer of answers) expect(answer).toEqual(answers[0]);
  });
});
