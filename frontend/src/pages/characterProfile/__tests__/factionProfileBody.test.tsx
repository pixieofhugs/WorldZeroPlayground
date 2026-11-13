/** Player-profile body dispatch + badge-board guards (#459, ADR-0033). */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { CharacterOut } from "../../../api/auth";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "mobile" | "desktop" }));

vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

import FactionProfileBody, {
  type ProfileBodyProps,
} from "../FactionProfileBody";
import { FACTION_MANIFESTS, surfaceMap } from "../../../factions";
import i18n from "../../../i18n";
import { factionName } from "../../../utils/factions";
import { readIndexCss } from "../../../test/indexCss";

function makeCharacter(overrides: Partial<CharacterOut> = {}): CharacterOut {
  return {
    id: 7,
    username: "wren",
    display_name: "Wren Aldercross",
    bio: "Keeps a field notebook.",
    tagline: "",
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
      pointsIntoLevel: 120,
      levelSpan: 300,
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

beforeEach(() => {
  mocks.formFactor = "desktop";
});

describe("FactionProfileBody dispatch", () => {
  it("registers the seven bespoke faction skins (#460, #900)", () => {
    // Albescent's row is not an eighth skin: it hands `DefaultProfileBody` an
    // ornament layer (ADR-0048) — motion, never a skin (#783; enforced below).
    // `na`'s row (#2530) IS `DefaultProfileBody`, so it's filtered out.
    expect(
      Object.keys(surfaceMap("profileBody"))
        .filter((slug) => slug !== "na")
        .sort(),
    ).toEqual(
      ["ephemerists", "everymen", "singularity", "snide", "ua", "coven", "wow", "albescent"].sort(),
    );
  });

  it("gives an albescent profile the same skin as an unaffiliated one (#783)", () => {
    // Treatment, not markup: copy may differ, the skin must not, or a member is
    // visually identifiable.
    const skinOf = (slug: string): string[] =>
      [...renderBody({ faction_slug: slug }).matchAll(/--fc-[a-z]+:([^;"]+)/g)].map(
        (match) => match[1],
      );
    expect(skinOf("albescent")).toEqual(skinOf("na"));
    expect(skinOf("albescent").length).toBeGreaterThan(0);
    // No albescent-shaped class, attribute or token at all (#2632).
    const html = renderBody({ faction_slug: "albescent" });
    expect(html).not.toContain("albescent");
  });

  // Unaffiliated is the slug `na`, not null (ADR-0030).
  it("renders the default skin for an unaffiliated (na) character", () => {
    const html = renderBody({ faction_slug: "na" });
    // Identified by its empty-state copy (the caption went in #1629).
    expect(html).toContain("Wren Aldercross");
    expect(html).toContain(i18n.t("common:profile.praxisEmptyTitle"));
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
    }
  });

  it("never names another faction in a bespoke profile skin (#1291)", () => {
    // Skins were ported from other factions' templates, and ports carry content
    // (Coven once read "Player · Warriors of Whimsy"). Loops the registry.
    const slugs = Object.keys(surfaceMap("profileBody"));
    const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const slug of slugs) {
      const text = renderBody({ faction_slug: slug }).replace(/<[^>]*>/g, " ");
      for (const other of slugs) {
        if (other === slug) continue;
        const name = factionName(other);
        // Letter boundaries: "UA" would match inside all-caps words.
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

/**
 * The identity header on every skin at both widths (#1629), all in the shared
 * `ProfileSkin` (#2996). Slugs come from the manifest index (#2815); the phone is
 * a different tree, hence both widths.
 */
const SLUGS = FACTION_MANIFESTS.map((manifest) => manifest.slug);

/** Every wording the deleted `playerEyebrow` knob ever produced. */
const EYEBROW_FRAGMENTS = ["Player ·", "PLAYER:", "Practising ·", "· the Court"];

const TAGLINE = "Small acts, kept up.";

/** The shared slot's fingerprint in the markup. */
const TAGLINE_MEASURE = "max-width:22ch";

/** Stripped before asserting what a sighted reader meets. */
const SR_HEADING = /<h1 class="sr-only">[\s\S]*?<\/h1>/g;

const nameCount = (html: string) =>
  html.replace(SR_HEADING, "").split("Wren Aldercross").length - 1;

const headings = (html: string) =>
  [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((match) =>
    match[1].replace(/<[^>]*>/g, "").trim(),
  );

describe.each(["desktop", "mobile"] as const)(
  "① identity header on %s (#1629)",
  (formFactor) => {
    const render = (overrides: Partial<CharacterOut> = {}) => {
      mocks.formFactor = formFactor;
      return renderBody(overrides);
    };

    it.each(SLUGS)(
      "carries exactly one <h1>, and it is the display name — %s",
      (slug) => {
        // Exactly one: #1629 once left profiles with no <h1>, and a bespoke
        // header once added a second (#901). `toEqual` fails both ways.
        expect(
          headings(render({ faction_slug: slug, tagline: TAGLINE })),
          `${slug} <h1>s`,
        ).toEqual(["Wren Aldercross"]);
      },
    );

    it.each(SLUGS)("drops the PLAYER · FACTION eyebrow — %s", (slug) => {
      const text = render({ faction_slug: slug }).replace(/<[^>]*>/g, " ");
      for (const fragment of EYEBROW_FRAGMENTS) {
        expect(text, `${slug} still wears "${fragment}"`).not.toContain(fragment);
      }
    });

    it.each(SLUGS)("drops the affiliation caption — %s", (slug) => {
      // na-only copy, asserted everywhere: ports carry it across (#1291).
      expect(render({ faction_slug: slug })).not.toContain("faction pending");
    });

    it.each(SLUGS)("renders the tagline when there is one — %s", (slug) => {
      const html = render({ faction_slug: slug, tagline: TAGLINE });
      expect(html, "the tagline itself").toContain(TAGLINE);
      expect(html, "the shared slot's measure").toContain(TAGLINE_MEASURE);
    });

    it.each(SLUGS)("hides the slot entirely when blank — %s", (slug) => {
      for (const tagline of ["", "   \n "]) {
        const html = render({ faction_slug: slug, tagline });
        expect(html, `${slug} slot on a blank tagline`).not.toContain(
          TAGLINE_MEASURE,
        );
      }
    });

    it.each(SLUGS)(
      "keeps the display name on the credential card and nowhere in the identity column — %s",
      (slug) => {
        const html = render({ faction_slug: slug, tagline: TAGLINE });
        // Visible sites only (the sr-only <h1> is stripped): the credential card
        // is the one site, every slug, both widths (#2231, #2996).
        expect(nameCount(html), `${slug} name sites`).toBe(1);
      },
    );
  },
);

/**
 * Header flair, one per faction (#1630). All lands on the shared `ProfileSkin`,
 * so the risk is a LEAK to all nine: each row asserts the fingerprint on its slug
 * and its absence on the rest. Whether it looks right is an eyeball check (#651).
 */
const OTHER_SLUGS = (slug: string) => SLUGS.filter((other) => other !== slug);

describe.each(["desktop", "mobile"] as const)(
  "① header flair on %s (#1630)",
  (formFactor) => {
    const render = (slug: string) => {
      mocks.formFactor = formFactor;
      return renderBody({ faction_slug: slug, tagline: TAGLINE });
    };

    const onlyOn = (slug: string, fingerprint: string) => {
      expect(render(slug), `${slug} is missing its own flair`).toContain(
        fingerprint,
      );
      for (const other of OTHER_SLUGS(slug)) {
        expect(render(other), `${slug}'s flair leaked onto ${other}`).not.toContain(
          fingerprint,
        );
      }
    };

    // #2213: the level ring is gone (it duplicated the bar) and must not come
    // back. 40% → a 144deg stop is its fingerprint; Everymen's sunburst uses
    // 6deg steps, so dress isn't caught.
    it("draws no level ring on any profile (#2213)", () => {
      for (const slug of SLUGS) {
        const html = render(slug);
        expect(html, `${slug} still draws a level arc`).not.toContain("144deg");
        expect(html, `${slug} still draws the spectrum ring mask`).not.toContain(
          "conic-gradient(transparent 0",
        );
      }
    });

    // The level numeral moved beside the bar; it's the panel's one
    // `--text-title` figure in every skin.
    it("keeps one bar and the level numeral in every panel (#2213)", () => {
      for (const slug of SLUGS) {
        const html = render(slug);
        // One panel per profile, every slug, both widths — no exemptions.
        const bars = html.split("transition:width 300ms").length - 1;
        expect(bars, `${slug} progress bars`).toBe(1);
        // Level 3; ephemerists prints the codex's roman numeral for it.
        expect(html, `${slug} lost the level numeral`).toMatch(
          /font-size:var\(--text-title\);color:[^"]*">(?:3|III)</,
        );
      }
    });

    it("drifts the spectrum frame for albescent and holds it still for na", () => {
      // Albescent is na plus motion (ADR-0048).
      onlyOn("albescent", "alb-profile-edge");
    });

    it("scatters candle sparkles on the coven header only", () => {
      onlyOn("coven", "cvn-profile-spark");
      // Eight distinct delays, or the field pulses in unison.
      const html = render("coven");
      expect(html.split("cvn-profile-spark").length - 1).toBe(8);
      expect(new Set([...html.matchAll(/--cvn-spark-delay:([^;"]+)/g)].map((m) => m[1])).size).toBe(8);
    });

    it("ghosts the lotus into the ua header only", () => {
      // Lotus's own gradient id.
      onlyOn("ua", "wz-lotus-wash");
    });

    it("grounds singularity in a phosphor terminal, not graph paper", () => {
      const html = render("singularity");
      expect(html, "the phosphor raster").toContain(
        "radial-gradient(120% 80% at 12% 0%",
      );
      // The blue graticule is Ephemerists' and must be gone.
      expect(html, "the blue graticule survived").not.toContain("rgba(37,99,235");
      onlyOn("singularity", "radial-gradient(120% 80% at 12% 0%");
    });

    it("pastes the snide tagline up as a ransom slip", () => {
      onlyOn("snide", "rotate(-0.7deg)");
      const html = render("snide");
      expect(html, "the acid ground").toContain(
        "background:var(--faction-snide-acid)",
      );
      expect(html, "the torn strip survived").not.toContain("polygon(0 0,4% 40%");
    });

    // The numeral sits on the cornice band now: brass was 2.83:1 there, the
    // band's mark is 7.59:1 (#2213).
    it("strikes the ephemerists level numeral in the band's mark", () => {
      onlyOn("ephemerists", "color:var(--faction-ephemerists-plate-band-ink)");
    });
  },
);

/**
 * #1630's perpetual animations sit behind `prefers-reduced-motion: no-preference`,
 * checked in the stylesheets. Brace-counted because `@media` blocks nest. Reads
 * both the entry sheet and the deferred `motion.ornament.css` (#2407).
 */
describe("#1630 motion sits behind the reduced-motion guard", () => {
  const css = [
    readIndexCss(),
    readFileSync(
      fileURLToPath(new URL("../../../motion.ornament.css", import.meta.url)),
      "utf8",
    ),
  ].join("\n");

  /** [inside no-preference blocks, outside them]. */
  const partitionByGuard = (source: string): [string, string] => {
    const OPEN = "@media (prefers-reduced-motion: no-preference)";
    let inside = "";
    let outside = "";
    let cursor = 0;
    for (;;) {
      const start = source.indexOf(OPEN, cursor);
      if (start < 0) {
        outside += source.slice(cursor);
        return [inside, outside];
      }
      outside += source.slice(cursor, start);
      let depth = 0;
      let index = source.indexOf("{", start);
      const bodyStart = index;
      for (; index < source.length; index += 1) {
        if (source[index] === "{") depth += 1;
        else if (source[index] === "}") {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      inside += source.slice(bodyStart, index + 1);
      cursor = index + 1;
    }
  };

  const [GUARDED, UNGUARDED] = partitionByGuard(css);

  it.each(["alb-profile-edge", "cvn-profile-spark"])(
    "%s animates only under no-preference",
    (className) => {
      // `::before` optional: #2498 moved the travel onto it.
      const animates = new RegExp(`\\.${className}(::before)?\\s*\\{[^}]*animation`);
      expect(animates.test(GUARDED), `${className} guarded rule`).toBe(true);
      expect(animates.test(UNGUARDED), `${className} UNguarded rule`).toBe(false);
    },
  );
});
