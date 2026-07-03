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
  it("renders the UA gilt-salon avatar for a ua character", () => {
    const html = renderToStaticMarkup(
      <FactionAvatar character={character({ faction_slug: "ua" })} />,
    );
    // Monogram fallback (no avatar_url) — the initial letter, uppercased.
    expect(html).toContain("I");
    // Parchment disc ringed in UA gilt tokens (never hardcoded hex).
    expect(html).toContain("var(--ua-orange)");
    expect(html).toContain("var(--faction-ua-card-font)");
    // The heraldic crest badge is present (UACrest draws --ua-* shield fills).
    expect(html).toContain("var(--ua-gold)");
    expect(html).toContain("var(--ua-paper-warm)");
    // UACrest markup marker — the shield uses an SVG viewBox unique to the crest.
    expect(html).toContain('viewBox="0 0 100 120"');
  });

  it("renders the character portrait when avatar_url is present", () => {
    const html = renderToStaticMarkup(
      <FactionAvatar
        character={character({ faction_slug: "ua", avatar_url: "/media/isolde.png" })}
      />,
    );
    expect(html).toContain("isolde.png");
    // Still badged with the crest.
    expect(html).toContain('viewBox="0 0 100 120"');
  });

  it("falls back to the plain default avatar for an unknown slug", () => {
    const html = renderToStaticMarkup(
      <FactionAvatar character={character({ faction_slug: "totally-unknown" })} />,
    );
    // No UA gilt tokens and no crest badge on the fallback circle.
    expect(html).not.toContain("var(--ua-orange)");
    expect(html).not.toContain('viewBox="0 0 100 120"');
    // Default renders the plain initial circle.
    expect(html).toContain("I");
  });
});
