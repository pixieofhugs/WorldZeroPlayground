/**
 * Player-profile body dispatch + badge-board guards (#459, ADR-0033).
 *
 * The profile is one faction-agnostic contract; the skin is derived
 * client-side from faction_slug. The seven faction skins landed in #460; the
 * default spectrum-band body remains the fallback for null / na / unknown, and
 * ③ Badges must render only when badges exist regardless of skin.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";

import type { CharacterOut } from "../../../api/auth";
import FactionProfileBody, {
  type ProfileBodyProps,
} from "../FactionProfileBody";
import { surfaceMap } from "../../../factions";
import { factionName } from "../../../utils/factions";

function makeCharacter(overrides: Partial<CharacterOut> = {}): CharacterOut {
  return {
    id: 7,
    username: "wren",
    display_name: "Wren Aldercross",
    bio: "Keeps a field notebook.",
    avatar_url: '',
    location: '',
    level: 3,
    score: 320,
    all_time_score: 320,
    faction_slug: "na",
    status: "active",
    created_at: "2026-06-01T00:00:00Z",
    badges: [],
    invitations: [],
    ...overrides,
  };
}

function renderBody(overrides: Partial<CharacterOut> = {}) {
  const props: ProfileBodyProps = {
    character: makeCharacter(overrides),
    submissions: [],
    proposedTasks: [],
    progression: {
      nextLevel: 4,
      currentThreshold: 200,
      nextThreshold: 500,
      progressPercent: 40,
    },
    identityActions: null,
  };
  return renderToStaticMarkup(
    <MemoryRouter>
      <FactionProfileBody {...props} />
    </MemoryRouter>,
  );
}

describe("FactionProfileBody dispatch", () => {
  it("registers the seven bespoke faction skins (#460, #900)", () => {
    // Each faction claims the surface in its own manifest; the dispatcher just
    // reads them, so this asserts the manifests still cover all seven.
    //
    // Albescent is absent on purpose (#783): it claims no profile skin, so a
    // member's profile IS the default one. That is the point — a profile is
    // exactly where a secret society would give itself away.
    expect(Object.keys(surfaceMap("profileBody")).sort()).toEqual(
      ["ephemerists", "everymen", "singularity", "snide", "ua", "coven", "wow"].sort(),
    );
  });

  it("gives an albescent profile the same skin as an unaffiliated one (#783)", () => {
    // The requirement stated at the surface a reader actually looks at, and
    // stated about TREATMENT rather than markup. The two profiles are not
    // byte-identical and should not be: an Albescent member has a faction, so
    // their profile names it, where an unaffiliated player's says "faction
    // pending". Copy differs; the skin must not — that is what would make a
    // member visually identifiable in a list of players.
    const skinOf = (slug: string): string[] =>
      [...renderBody({ faction_slug: slug }).matchAll(/--fc-[a-z]+:([^;"]+)/g)].map(
        (match) => match[1],
      );
    expect(skinOf("albescent")).toEqual(skinOf("na"));
    expect(skinOf("albescent").length).toBeGreaterThan(0);
    // And no trace of the deleted token block. This is the assertion that
    // caught CredentialCard still painting from --faction-albescent-card-bg.
    expect(renderBody({ faction_slug: "albescent" })).not.toContain("albescent");
  });

  // Unaffiliated is the slug `na`, not a missing one (ADR-0030), and since
  // #1400 `CharacterOut` is the generated type, which says so: `faction_slug`
  // is `string`. `CSS_KEY` maps `na` to `default` — exactly where the `null`
  // this used to pass already landed.
  it("renders the default skin for an unaffiliated (na) character", () => {
    const html = renderBody({ faction_slug: "na" });
    expect(html).toContain("Unaffiliated · faction pending");
    expect(html).toContain("Wren Aldercross");
    expect(html).toContain("No praxis sealed yet");
  });

  it("renders a profile for every faction slug (bespoke skin or default)", () => {
    for (const slug of [
      "ua",
      "coven",
      "snide",
      "ephemerists",
      "singularity",
      "everymen",
      "albescent",
      "na",
    ]) {
      const html = renderBody({ faction_slug: slug });
      expect(html, `${slug} renders a profile`).toContain("Wren Aldercross");
      // The faction-pending line is unaffiliated-only copy.
      if (slug !== "na") {
        expect(html, `${slug} is not labelled faction-pending`).not.toContain(
          "faction pending",
        );
      }
    }
  });

  it("never names another faction in a bespoke profile skin (#1291)", () => {
    // The seam is the rendered markup. Every one of these skins was ported from
    // another faction's design template, and a template port carries CONTENT
    // across as easily as it carries geometry — Coven's identity eyebrow read
    // "Player · Warriors of Whimsy" for exactly that reason. A per-faction body
    // that names a DIFFERENT faction is always a bug, so this is one loop over
    // the registry rather than one assertion per skin: the next port is covered
    // the moment its manifest row lands.
    const slugs = Object.keys(surfaceMap("profileBody"));
    const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const slug of slugs) {
      const text = renderBody({ faction_slug: slug }).replace(/<[^>]*>/g, " ");
      for (const other of slugs) {
        if (other === slug) continue;
        const name = factionName(other);
        // Letter boundaries, not a bare substring: `names.ua` is "UA", which
        // would otherwise match inside any all-caps word containing it.
        const mention = new RegExp(`(?<![A-Za-z])${escape(name)}(?![A-Za-z])`);
        expect(
          mention.test(text),
          `${slug} profile names ${other} ("${name}")`,
        ).toBe(false);
      }
    }
  });

  it("hides ③ Badges when the character has none", () => {
    const html = renderBody({ badges: [] });
    expect(html).not.toContain(">Badges<");
  });

  it("shows ③ Badges with names when present", () => {
    const html = renderBody({
      badges: [
        { key: "sock_puppeteer", name: "Sock Puppeteer" },
        { key: "sock_puppet", name: "Sock Puppet" },
      ],
    });
    expect(html).toContain("Badges");
    expect(html).toContain("2 earned");
    expect(html).toContain("Sock Puppeteer");
    expect(html).toContain("Sock Puppet");
    expect(html).toContain("Sock Puppeteer badge"); // aria-label of the mapped art
  });

  it("shows the progression bar toward level+1", () => {
    const html = renderBody();
    expect(html).toContain("next · lvl 4");
    expect(html).toContain("120 / 300 pts this level");
  });
});
