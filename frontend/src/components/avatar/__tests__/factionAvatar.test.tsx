/**
 * Faction avatar dispatch guard (Tier-3 surface). Focuses on the UA variant
 * (#200): a `ua` character must render the gilt-salon avatar (gilt ring +
 * heraldic crest badge), while an unknown/neutral slug falls back to the plain
 * DefaultAvatar circle with no membership badge.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import type { CharacterOut } from "../../../api/auth";
import FactionAvatar from "../FactionAvatar";

function character(overrides: Partial<CharacterOut> = {}): CharacterOut {
  return {
    id: 1,
    username: "Isolde",
    display_name: "Isolde",
    bio: null,
    avatar_url: null,
    location: null,
    level: 3,
    score: 0,
    all_time_score: 0,
    faction_slug: null,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
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
    expect(html).not.toContain("var(--ua-gold)");
    // The sigil badge is present — the ensō's heavy sweep (#849 retired the
    // gilt shield, so the 100x120 viewBox marker is gone with it).
    expect(html).toContain('d="M134 41.2 A68 68 0 1 1 66 158.8"');
  });

  it("renders the character portrait when avatar_url is present", () => {
    const html = renderToStaticMarkup(
      <FactionAvatar
        character={character({ faction_slug: "ua", avatar_url: "/media/isolde.png" })}
      />,
    );
    expect(html).toContain("isolde.png");
    // Still badged with the mark.
    expect(html).toContain('d="M134 41.2 A68 68 0 1 1 66 158.8"');
  });

  it("falls back to the plain default avatar for an unknown slug", () => {
    const html = renderToStaticMarkup(
      <FactionAvatar character={character({ faction_slug: "totally-unknown" })} />,
    );
    // No UA tokens and no ensō badge on the fallback circle.
    expect(html).not.toContain("var(--ua-orange)");
    expect(html).not.toContain('d="M134 41.2 A68 68 0 1 1 66 158.8"');
    // Default renders the plain initial circle.
    expect(html).toContain("I");
  });
});
