import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SRC_DIR, sourceFiles, toRelative } from "../../test/sourceScan";
import { factionBodyVars } from "../factionBodyFace";

/**
 * THE APP BODY FACE MUST NOT LEAK INTO A FACTION'S OWN SURFACE.
 *
 * `--font-body` is Quicksand (`--font-body-base`) for the app, and every shared
 * child inside a faction surface (`.label-*`, the `font-body` utility, a direct
 * `var(--font-body)`) reads it. A surface therefore re-declares it on its root
 * with `factionBodyVars(slug)`; this guard holds both halves:
 *
 *  - the TABLE: each faction that declares a `--faction-<slug>-body-font`
 *    resolves to it, never to the app face; na, Albescent and an unknown slug
 *    RESET to the app face, which is what keeps an Everymen page's Courier Prime
 *    from reaching a neutral card nested inside it (the scope belongs to the
 *    surface root, not the page around it);
 *  - the SOURCE: every faction-named surface root file spreads it for its slug.
 */
const css = sourceFiles({ dir: `${SRC_DIR}css`, match: /\.css$/ })
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");

// Derived, not typed: a faction joins by declaring its body token.
const SLUGS = [...css.matchAll(/--faction-([a-z]+)-body-font:/g)].map((m) => m[1]);

describe("--font-body is scoped per faction surface", () => {
  it("seven factions own a body face", () => {
    expect(SLUGS.length).toBe(7);
  });

  it.each(SLUGS)("%s resolves to its own declared body token, never the app face", (slug) => {
    const value = (factionBodyVars(slug) as Record<string, string>)["--font-body"];
    expect(value).toBe(`var(--faction-${slug}-body-font)`);
    expect(value).not.toContain("--font-body-base");
  });

  it.each(["na", "albescent", null, undefined, "a-slug-the-server-invented"])(
    "%s takes the app body face",
    (slug) => {
      expect((factionBodyVars(slug) as Record<string, string>)["--font-body"]).toBe(
        "var(--font-body-base)",
      );
    },
  );

  it("the app face is Quicksand and the utility follows the custom property", () => {
    expect(css).toMatch(/--font-body-base:\s*"Quicksand"/);
    expect(css).toMatch(/--font-body:\s*var\(--font-body-base\)/);
    const tailwind = readFileSync(`${SRC_DIR}../tailwind.config.ts`, "utf8");
    expect(tailwind).toMatch(/body:\s*\["var\(--font-body\)"\]/);
  });

  // Faction-named files that own a SURFACE ROOT. Leaf marks (avatar, sigil,
  // backdrop, vote dots, lamps) draw no shared children and are not roots.
  const ROOT_SUFFIXES = [
    "TaskCard", "SelectCard", "FeedFrame", "FactionHero", "Seal", "PraxisCard", "ScoreStamp",
    "PraxisDetail", "TaskDetail", "FactionBody", "ProfileBody", "ProposeTask", "EditPraxis",
    "CreateCharacter", "EditCharacter", "FieldDesk", "DuelSealConfirm", "Comment",
  ];
  const files = sourceFiles({ match: /\.tsx$/ });

  it.each(SLUGS)("every %s surface root spreads factionBodyVars for its own slug", (slug) => {
    const Slug = slug[0].toUpperCase() + slug.slice(1);
    const roots = files.filter((f) =>
      ROOT_SUFFIXES.some((s) => new RegExp(`/${Slug}${s}\\.tsx$`).test(f)),
    );
    expect(roots.length, `no ${slug} surface files found`).toBeGreaterThan(5);
    const missing = roots.filter(
      (f) =>
        !new RegExp(`factionBodyVars\\(\\s*['"]${slug}['"]\\s*\\)`).test(readFileSync(f, "utf8")),
    );
    expect(missing.map(toRelative)).toEqual([]);
  });
});
