/**
 * Player-profile body dispatch + badge-board guards (#459, ADR-0033).
 *
 * The profile is one faction-agnostic contract; the skin is derived
 * client-side from faction_slug. Until the per-faction skins land (#460),
 * EVERY slug — including null/na — must fall back to the default
 * spectrum-band body, and ③ Badges must render only when badges exist.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";

import type { CharacterOut } from "../../../api/auth";
import FactionProfileBody, {
  FACTION_PROFILE_BODIES,
  type ProfileBodyProps,
} from "../FactionProfileBody";

function makeCharacter(overrides: Partial<CharacterOut> = {}): CharacterOut {
  return {
    id: 7,
    username: "wren",
    display_name: "Wren Aldercross",
    bio: "Keeps a field notebook.",
    avatar_url: null,
    location: null,
    level: 3,
    score: 320,
    all_time_score: 320,
    faction_slug: null,
    status: "active",
    created_at: "2026-06-01T00:00:00Z",
    badges: [],
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
  it("starts with no bespoke skins registered — #460 fills the map", () => {
    expect(Object.keys(FACTION_PROFILE_BODIES)).toHaveLength(0);
  });

  it("renders the default skin for an unaffiliated (null) character", () => {
    const html = renderBody({ faction_slug: null });
    expect(html).toContain("Unaffiliated · faction pending");
    expect(html).toContain("Wren Aldercross");
    expect(html).toContain("No praxis sealed yet");
  });

  it("falls back to the default skin for every faction slug until #460", () => {
    for (const slug of [
      "ua",
      "wow",
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
