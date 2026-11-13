import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SRC_DIR, sourceFiles, toRelative } from "../../test/sourceScan";
import { factionBodyVars } from "../factionBodyFace";

/**
 * The app body face must not leak into a faction surface. TABLE: each declared
 * `--faction-<slug>-body-font` wins; na/Albescent/unknown RESET to the app face
 * (so a neutral card nested in an Everymen page stays neutral). SOURCE: every
 * faction surface root spreads `factionBodyVars(slug)`.
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
    const prelude = readFileSync(`${SRC_DIR}css/00-prelude.css`, "utf8");
    expect(prelude).toMatch(/@theme inline reference[^}]*--font-body:\s*var\(--font-body\);/);
  });

  // Surface roots only; leaf marks draw no shared children.
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
