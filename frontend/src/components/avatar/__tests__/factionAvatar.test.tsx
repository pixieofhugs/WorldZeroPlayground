/**
 * Faction avatar dispatch guard (Tier-3 surface). Focuses on the UA variant
 * (#200): a `ua` character must render the gilt-salon avatar (gilt ring +
 * heraldic crest badge), while an unknown/neutral slug falls back to the plain
 * DefaultAvatar circle with no membership badge.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import type { CharacterOut } from "../../../api/auth";
import { ALBESCENT_FACTION_SLUG, FACTION_RAINBOW_ORDER } from "../../../utils/factions";
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
    // Monogram fallback (no avatar_url) — the initial letter, uppercased.
    expect(html).toContain("I");
    // The disc is ringed and badged in --faction-ua-* tokens only. The legacy
    // gilt family is no longer read here (#851); the ring is the practice's
    // orange and the badge sits on the lifted surface.
    expect(html).toContain("var(--faction-ua)");
    expect(html).toContain("var(--faction-ua-card-font)");
    expect(html).toContain("var(--faction-ua-lift)");
    expect(html).not.toMatch(/var\(--ua-[a-z]/); // the whole legacy family, deleted in #853
    // The sigil badge is present — the masked brush ensō (#849 retired the
    // gilt shield; #908 made this the one ensō on every UA surface).
    expect(html).toContain("/factionMarks/enso.webp");
  });

  it("renders the character portrait when avatar_url is present", () => {
    const html = renderToStaticMarkup(
      <FactionAvatar
        character={character({ faction_slug: "ua", avatar_url: "/media/isolde.png" })}
      />,
    );
    expect(html).toContain("isolde.png");
    // Still badged with the mark.
    expect(html).toContain("/factionMarks/enso.webp");
  });

  it("falls back to the plain default avatar for an unknown slug", () => {
    const html = renderToStaticMarkup(
      <FactionAvatar character={character({ faction_slug: "totally-unknown" })} />,
    );
    // No UA tokens and no ensō badge on the fallback circle.
    expect(html).not.toMatch(/var\(--ua-[a-z]/); // the whole legacy family, deleted in #853
    expect(html).not.toContain("/factionMarks/enso.webp");
    // Default renders the plain initial circle.
    expect(html).toContain("I");
  });
});

/**
 * #2217 — ONE MARK PER FACTION. The badge on a Coven member's avatar is the
 * witch hat, the same drawing `FactionSigil` hands out for a Coven TASK. It was
 * a crescent moon, kept by #1209 on the argument that a PENTAGRAM would be mud
 * at badge size; the hat is drawn to survive 15px, so that argument never
 * defended the moon against it, and the owner reversed the keep-ruling.
 *
 * The crescent is not gone from the kit — `CovenVote`'s phase plate builds a
 * 1-5 rating out of moon phases, which is a mechanic and not a badge. That
 * split (and `covenVote.test.tsx`, which guards it) is why this asserts on the
 * AVATAR rather than on "the app draws no crescent".
 */
describe("FactionAvatar — Coven wears the hat (#2217)", () => {
  it("badges a coven member with the witch hat, not the crescent", () => {
    const html = renderToStaticMarkup(
      <FactionAvatar character={character({ faction_slug: "coven" })} />,
    );
    // The hat's brim — the opening subpath of `CovenSigil`'s one path.
    expect(html).toContain("M4 78C14 66 32 62 50 62");
    expect(html).toContain('fill-rule="evenodd"');
    // The crescent this badge used to draw, gone from this mount.
    expect(html).not.toContain("M16.5 12a6.5");
  });
});

/**
 * #2232 — the byline portrait rendered as an ellipse.
 *
 * Every avatar root is a `width: dim; height: dim` inline-block, and every
 * surface that shows a name beside a face is a flex row: the praxis card's
 * byline, the duel banner's rival face, the comment leaves. As a flex item the
 * root took the initial `flex-shrink: 1`, and its automatic minimum size is its
 * CONTENT's min-content — which for a portrait is zero, because Tailwind's
 * preflight gives every `img` a `max-width: 100%`. So a long display name (the
 * reporter's wraps to two lines) pulled the root narrower while the img kept
 * the height it was handed inline: a 28px circle painted 20 x 28.
 *
 * The monogram fallback has the same root and the same exposure — its `<span>`
 * is sized `width: 100%` of that root — so the guard belongs on the root, the
 * one thing both branches and all eight skins share. `RosterAvatar` on the
 * praxis card already carried `flex: none` for this reason; the shared surface
 * did not.
 *
 * A layout assertion is impossible in this harness (no DOM, no fonts), so the
 * seam is the declaration. Both roots are covered: `DefaultAvatar` (na, in
 * FactionAvatar.tsx) and `BadgedAvatar` (the seven registered skins).
 */
describe("an avatar is a circle in a flex row (#2232)", () => {
  const root = (html: string) => html.match(/^<[a-z]+[^>]*>/)?.[0] ?? "";

  it.each([
    ["the unaffiliated ring", "na"],
    ["a registered skin", "singularity"],
    // WOW's plate is its own root — the gilt ring wraps the shared badge, so
    // the rule has to be restated on the outer span (#2241).
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
 * #2241 / #2242 — WOW wore its crest IN THE FIELD, so the crest and the
 * portrait competed for one slot: a member WITH a portrait wore no faction
 * mark (#2241), a member WITHOUT one never got a monogram (#2242). One defect,
 * reported from both ends.
 *
 * The exemption `WowAvatar` carried was written against the OLD gilt crest and
 * flagged for veto in #897; `WowSigil` is a Sigil Studies v2 mark drawn to
 * survive badge size, so the owner vetoed it. The seam is the dispatcher's
 * rendered markup, because that is where both halves are visible at once: the
 * crown must be a CORNER badge on both branches, never the field.
 *
 * The gilt rope ring, the plum inner rim and the rank pill stay — adopting the
 * shared badge is not licence to flatten the plate into a plain circle — so
 * the chrome is asserted too.
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
    // The initial, in the chronicle's own hand on the flipping field.
    expect(html).toContain(">I<");
    expect(html).toContain("var(--faction-wow-card-font)");
    expect(html).toContain("var(--faction-wow-avatar-field)");
    // Still marked — the crown is the corner badge, not the field.
    expect(html).toContain(CROWN);
  });

  it("keeps the gilt rope ring, the plum rim and the rank pill", () => {
    const html = renderToStaticMarkup(
      <FactionAvatar character={character({ faction_slug: "wow" })} size={72} />,
    );
    expect(html).toContain("var(--faction-wow-avatar-ring)");
    expect(html).toContain("var(--faction-wow-crest-field-rim)");
    expect(html).toContain("var(--faction-wow-avatar-pill-text)");
  });
});

/**
 * #2245 — `badge={false}`, and it has to be a promise ALL NINE skins keep.
 *
 * The desktop Players roster gives the faction a column of its own with a large
 * linked sigil in it, so the 17px mark welded to the face two columns left says
 * the same thing again and smaller. That is the only caller today, and the flag
 * would be worse than useless if it were honoured by eight skins out of nine:
 * one faction's members would keep a badge nobody else's has, and the surface
 * that asked has no way to tell.
 *
 * SEAM: the badge's own clip, `right: -3px; bottom: -3px`, which `DefaultAvatar`
 * and `BadgedAvatar` both write and nothing else on an avatar does. Asserting
 * on the clip rather than on nine glyphs is what lets one loop cover the lot —
 * and what keeps this passing when a faction changes its mark, which #2217 and
 * #2241 have both already done.
 *
 * The loop is derived, not typed out: a skin added to the manifest without a
 * line here would otherwise be exactly the one that gets it wrong.
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
