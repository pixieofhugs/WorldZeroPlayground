/**
 * Faction avatar dispatch guard. UA (#200) gets the ringed, badged avatar; an
 * unknown slug falls back to DefaultAvatar with no badge.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import type { CharacterOut } from "../../../api/auth";
import { ALBESCENT_FACTION_SLUG, FACTION_RAINBOW_ORDER } from "../../../utils/factions";
import { stripResourceHints } from "../../../test/ssrMarkup";
import FactionAvatar from "../FactionAvatar";

function character(overrides: Partial<CharacterOut> = {}): CharacterOut {
  return {
    id: 1,
    username: "Isolde",
    display_name: "Isolde",
    bio: '',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 3,
    score: 0,
    all_time_score: 0,
    faction_slug: "na",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    badges: [],
    invitations: [],
    ...overrides,
  };
}

describe("FactionAvatar — UA variant (#200)", () => {
  it("renders the UA practice avatar for a ua character", () => {
    const html = renderToStaticMarkup(
      <FactionAvatar character={character({ faction_slug: "ua" })} />,
    );
    expect(html).toContain("I");
    // --faction-ua-* tokens only (#851).
    expect(html).toContain("var(--faction-ua)");
    expect(html).toContain("var(--faction-ua-card-font)");
    expect(html).toContain("var(--faction-ua-lift)");
    expect(html).not.toMatch(/var\(--ua-[a-z]/); // the whole legacy family, deleted in #853
    // The masked brush ensō (#908).
    expect(html).toContain("/factionMarks/enso.webp");
  });

  it("renders the character portrait when avatar_url is present", () => {
    const html = renderToStaticMarkup(
      <FactionAvatar
        character={character({ faction_slug: "ua", avatar_url: "/media/isolde.png" })}
      />,
    );
    expect(html).toContain("isolde.png");
    expect(html).toContain("/factionMarks/enso.webp");
  });

  it("falls back to the plain default avatar for an unknown slug", () => {
    const html = renderToStaticMarkup(
      <FactionAvatar character={character({ faction_slug: "totally-unknown" })} />,
    );
    expect(html).not.toMatch(/var\(--ua-[a-z]/); // the whole legacy family, deleted in #853
    expect(html).not.toContain("/factionMarks/enso.webp");
    expect(html).toContain("I");
  });
});

/**
 * #2217: one mark per faction — the Coven badge is the witch hat. The crescent
 * survives as `CovenVote`'s phase mechanic (`covenVote.test.tsx`), so this
 * asserts on the avatar, not app-wide.
 */
describe("FactionAvatar — Coven wears the hat (#2217)", () => {
  it("badges a coven member with the witch hat, not the crescent", () => {
    const html = renderToStaticMarkup(
      <FactionAvatar character={character({ faction_slug: "coven" })} />,
    );
    // The opening subpath of `CovenSigil`'s one path.
    expect(html).toContain("M4 78C14 66 32 62 50 62");
    expect(html).toContain('fill-rule="evenodd"');
    expect(html).not.toContain("M16.5 12a6.5");
  });
});

/**
 * #2232: the byline portrait rendered as an ellipse. As a flex item the root
 * shrank (preflight's `img { max-width: 100% }` makes min-content zero), so the
 * guard is `flex-shrink: 0` on the root both branches share. No layout in this
 * harness, so the seam is the declaration; covers `DefaultAvatar` and
 * `BadgedAvatar`.
 */
describe("an avatar is a circle in a flex row (#2232)", () => {
  const root = (html: string) =>
    stripResourceHints(html).match(/^<[a-z]+[^>]*>/)?.[0] ?? "";

  it.each([
    ["the unaffiliated ring", "na"],
    ["a registered skin", "singularity"],
    // WOW's plate wraps the shared badge, so it restates the rule (#2241).
    ["the WOW plate", "wow"],
  ])("%s does not yield its width to the name beside it", (_label, slug) => {
    const monogram = renderToStaticMarkup(
      <FactionAvatar character={character({ faction_slug: slug })} />,
    );
    const portrait = renderToStaticMarkup(
      <FactionAvatar
        character={character({ faction_slug: slug, avatar_url: "/media/isolde.png" })}
      />,
    );
    expect(root(monogram)).toContain("flex-shrink:0");
    expect(root(portrait)).toContain("flex-shrink:0");
  });
});

/**
 * #2241 / #2242: the WOW crest sat in the field, competing with the portrait.
 * The crown must be a CORNER badge on both branches; the plate chrome stays.
 */
describe("FactionAvatar — WOW wears its crown at the corner (#2241, #2242)", () => {
  /** The opening subpath of `WowSigil`'s one path: the three-peaked crown. */
  const CROWN = "M12 88L12 24L33 46";

  it("badges a portrait-bearing member with the crown (#2241)", () => {
    const html = renderToStaticMarkup(
      <FactionAvatar
        character={character({ faction_slug: "wow", avatar_url: "/media/isolde.png" })}
      />,
    );
    expect(html).toContain("isolde.png");
    expect(html).toContain(CROWN);
  });

  it("falls back to the house monogram, not the crown, in the field (#2242)", () => {
    const html = renderToStaticMarkup(
      <FactionAvatar character={character({ faction_slug: "wow" })} />,
    );
    expect(html).toContain(">I<");
    expect(html).toContain("var(--faction-wow-card-font)");
    expect(html).toContain("var(--faction-wow-avatar-field)");
    expect(html).toContain(CROWN);
  });

  it("keeps the gilt rope ring, the plum rim and the rank pill", () => {
    const html = renderToStaticMarkup(
      <FactionAvatar character={character({ faction_slug: "wow" })} size={72} />,
    );
    expect(html).toContain("var(--faction-wow-avatar-ring)");
    expect(html).toContain("var(--faction-wow-plum-surface)");
    expect(html).toContain("var(--faction-wow-avatar-pill-text)");
  });
});

/**
 * #2245: `badge={false}` must hold on all nine skins. Seam: the badge clip
 * `right: -3px; bottom: -3px`, which survives mark changes. Slugs are derived
 * so a new skin can't be skipped.
 */
describe("an avatar can be asked not to wear its badge (#2245)", () => {
  const CLIP = "right:-3px;bottom:-3px";
  const SLUGS = ["na", ALBESCENT_FACTION_SLUG, ...FACTION_RAINBOW_ORDER];

  it("covers every skin the app can dispatch to", () => {
    // Nine: the na ring, Albescent's wrapper, and the seven in the rainbow.
    expect(SLUGS).toHaveLength(9);
  });

  it.each(SLUGS)("%s badges by default", (slug) => {
    expect(
      renderToStaticMarkup(<FactionAvatar character={character({ faction_slug: slug })} />),
    ).toContain(CLIP);
  });

  it.each(SLUGS)("%s drops the badge when the surface asks", (slug) => {
    expect(
      renderToStaticMarkup(
        <FactionAvatar character={character({ faction_slug: slug })} badge={false} />,
      ),
    ).not.toContain(CLIP);
  });

  it("drops the badge and nothing else — the disc, its ring and the face stay", () => {
    const html = renderToStaticMarkup(
      <FactionAvatar
        character={character({ faction_slug: "ua", avatar_url: "/media/isolde.png" })}
        badge={false}
      />,
    );
    expect(html).toContain("isolde.png");
    expect(html).toContain("var(--faction-ua)");
    expect(html).not.toContain("/factionMarks/enso.webp");
  });
});
