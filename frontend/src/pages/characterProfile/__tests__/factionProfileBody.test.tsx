/**
 * Player-profile body dispatch + badge-board guards (#459, ADR-0033).
 *
 * The profile is one faction-agnostic contract; the skin is derived
 * client-side from faction_slug. The seven faction skins landed in #460; the
 * default spectrum-band body remains the fallback for null / na / unknown, and
 * ③ Badges must render only when badges exist regardless of skin.
 */
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
import { surfaceMap } from "../../../factions";
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
    // Each faction claims the surface in its own manifest; the dispatcher just
    // reads them, so this asserts the manifests still cover all seven.
    //
    // Albescent joined the list with #1630 and is NOT an eighth skin. It claims
    // the row to hand `DefaultProfileBody` one inert ornament layer (ADR-0048's
    // "Default PLUS a flourish"), which is the only way a flourish can land ON
    // the na identity band rather than over the whole page. #783's ruling that a
    // profile is exactly where a secret society would give itself away is what
    // makes that the ceiling: motion, never a skin. The assertion directly below
    // is the one that enforces it.
    // `na` is filtered out, not appended: it has a row since #2530
    // (`factions/default.ts`) and it is the one row that is not a bespoke
    // skin — it IS `DefaultProfileBody`, which the next assertion pins.
    expect(
      Object.keys(surfaceMap("profileBody"))
        .filter((slug) => slug !== "na")
        .sort(),
    ).toEqual(
      ["ephemerists", "everymen", "singularity", "snide", "ua", "coven", "wow", "albescent"].sort(),
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
    //
    // #1626 narrowed it by ONE register and #2632 UNNARROWED it: the vellum
    // reveal register that carve-out existed for is deleted outright, so the
    // substitution it needed goes with it and the claim is the plain one again.
    // No albescent-shaped class, attribute or token appears in this markup —
    // neither the deleted THEME block `--faction-albescent-*` that "no trace"
    // was originally written about, nor anything else.
    const html = renderBody({ faction_slug: "albescent" });
    expect(html).not.toContain("albescent");
  });

  // Unaffiliated is the slug `na`, not a missing one (ADR-0030), and since
  // #1400 `CharacterOut` is the generated type, which says so: `faction_slug`
  // is `string`. `CSS_KEY` maps `na` to `default` — exactly where the `null`
  // this used to pass already landed.
  it("renders the default skin for an unaffiliated (na) character", () => {
    const html = renderBody({ faction_slug: "na" });
    // The "Unaffiliated · faction pending" caption this used to assert was
    // deleted by #1629 — see the identity-header block below, which now guards
    // its absence on every skin. The default skin is still identified here by
    // its own empty-state copy.
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
      // Still the credential card's name — the identity column's copy of it
      // went with #1629.
      expect(html, `${slug} renders a profile`).toContain("Wren Aldercross");
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

/**
 * The identity header, at both widths and on every skin (#1629).
 *
 * Three deletions and one arrival, all in the SHARED layer — `ProfileSkin` for
 * the seven kits, `DefaultProfileBody`'s two branches for na / albescent / any
 * unskinned slug. The sweep is one loop over the slugs rather than an assertion
 * per skin, so the next bespoke body is covered the moment its manifest row
 * lands; the form-factor axis is here because the phone stack is a separate
 * component, not the same layout at a narrower width.
 */
const SLUGS = [
  "na",
  "albescent",
  "ua",
  "coven",
  "snide",
  "ephemerists",
  "singularity",
  "everymen",
  "wow",
];

/** Every wording the deleted `playerEyebrow` knob ever produced. A skin that
 *  grows the line back reads as one of these, whatever it calls it. */
const EYEBROW_FRAGMENTS = ["Player ·", "PLAYER:", "Practising ·", "· the Court"];

const TAGLINE = "Small acts, kept up.";

/** The measure the shared slot sets — its fingerprint in the markup. */
const TAGLINE_MEASURE = "max-width:22ch";

/** The visually-hidden heading the shared layer mounts — stripped before any
 *  assertion about what a SIGHTED reader meets. */
const SR_HEADING = /<h1 class="sr-only">[\s\S]*?<\/h1>/g;

const nameCount = (html: string) =>
  html.replace(SR_HEADING, "").split("Wren Aldercross").length - 1;

/** The text of every `<h1>` in the render, in document order. */
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
        // COUNT, not presence, and it is the whole test. Deleting the identity
        // column's name (#1629) took the route's only <h1> with it on every
        // skin but one, so a profile shipped with no top level to its document
        // outline — a screen-reader user lost the "what page am I on" landmark
        // and `CredentialCard`'s name is a <div>, so the card supplies nothing.
        // The other half is the opposite defect: WOW's phone header already
        // owns a VISIBLE <h1> (#901), so a shared heading mounted blindly would
        // hand that one profile two. `toEqual` on the array fails both ways.
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
      // na-only copy, but asserted everywhere: it is the line a ported template
      // carries across (#1291), and nothing should reintroduce it.
      expect(render({ faction_slug: slug })).not.toContain("faction pending");
    });

    it.each(SLUGS)("renders the tagline when there is one — %s", (slug) => {
      const html = render({ faction_slug: slug, tagline: TAGLINE });
      expect(html, "the tagline itself").toContain(TAGLINE);
      expect(html, "the shared slot's measure").toContain(TAGLINE_MEASURE);
    });

    it.each(SLUGS)("hides the slot entirely when blank — %s", (slug) => {
      // "" is the wire default and a whitespace-only draft is the other blank a
      // player can type. Neither may leave an empty display line behind.
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
        // VISIBLE sites only — `nameCount` strips the sr-only <h1>, which is
        // the point of it: restoring the document outline must not restore the
        // display line the design deleted.
        //
        // ONE site, every slug, both form factors. The name reads off the
        // credential card, which is why the column no longer repeats it. The
        // second site was the praxis section's "Submitted by {name}" eyebrow,
        // and #2231 deleted it: a character page shows that character's own
        // praxis, so the byline could only ever name the character whose page
        // it is. The phone stack never drew it.
        //
        // WOW's phone skin is the one profile with NO credential card — its
        // header IS an avatar hoop over an <h1> name (#901). Deleting that name
        // would leave a nameless profile, which is the opposite of what the
        // design asks for, so it keeps its one copy and takes the tagline under
        // it. Flagged on the PR.
        expect(nameCount(html), `${slug} name sites`).toBe(1);
      },
    );
  },
);

/**
 * ① Identity-header FLAIR, one bespoke treatment per faction (#1630).
 *
 * The seam is the same one above occupies — the markup `FactionProfileBody`
 * renders for a (slug × form factor) cell — and the failure mode these guard is
 * not "the treatment is missing" but "the treatment LEAKED". Every one of these
 * lands on a shared layer (`ProfileSkin` for seven kits, `DefaultProfileBody`
 * for na / albescent), so the cheap mistake is a knob that dresses all nine
 * profiles instead of one. Each row therefore asserts the fingerprint on its own
 * slug AND its absence on the other eight.
 *
 * What is NOT assertable here (`renderToStaticMarkup`, no DOM, no effects, and
 * axe cannot read a gradient or a `background-clip` — #651): whether any of this
 * LOOKS right. Every one of these is an eyeball check in both themes, and the
 * two animated ones in the reduced-motion state as well.
 */
const OTHER_SLUGS = (slug: string) => SLUGS.filter((other) => other !== slug);

/** The one profile that draws no progression panel at all: WOW's phone face is
 *  the bespoke pavilion (#901), which carries neither ring nor bar and which
 *  #2213 deliberately left alone. */
const noPanel = (formFactor: "desktop" | "mobile", slug: string) =>
  formFactor === "mobile" && slug === "wow";

describe.each(["desktop", "mobile"] as const)(
  "① header flair on %s (#1630)",
  (formFactor) => {
    const render = (slug: string) => {
      mocks.formFactor = formFactor;
      return renderBody({ faction_slug: slug, tagline: TAGLINE });
    };

    /** Present on `slug`, absent on every other slug. */
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

    // #2213: the level RING is gone from all nine profiles, and is NOT to be
    // restored as a fix if a kit reads bare without it. It plotted exactly the
    // percentage the bar beneath it plots — one number, two instruments — so
    // the ring went and the bar stayed, the bar being the within-level reading
    // on every other surface too (#2127). This block used to assert the
    // opposite: that na and albescent wear a spectrum-CUT ring and the other
    // seven a single-scalar arc — i.e. "every slug has a ring, na's is just cut
    // differently". That is the reading the ruling reversed.
    //
    // `progressPercent: 40` became a 144deg stop in every one of those conics,
    // which makes the angle the ring's fingerprint across all nine skins at
    // once. Everymen's header sunburst is the only other conic on a profile and
    // it is cut in 6deg steps, so this catches a ring without catching dress.
    it("draws no level ring on any profile (#2213)", () => {
      for (const slug of SLUGS) {
        const html = render(slug);
        expect(html, `${slug} still draws a level arc`).not.toContain("144deg");
        expect(html, `${slug} still draws the spectrum ring mask`).not.toContain(
          "conic-gradient(transparent 0",
        );
      }
    });

    // The other half of that ruling: the ring's SECOND job survives it. A bar
    // cannot say which level you are on, so the numeral relocated out of the
    // disc into text beside the bar, and the panel must carry exactly one of
    // each. Asserted against the style string because that is the only handle a
    // `renderToStaticMarkup` suite has — the numeral is the panel's one
    // `--text-title` figure in all nine skins.
    it("keeps one bar and the level numeral in every panel (#2213)", () => {
      for (const slug of SLUGS) {
        const html = render(slug);
        const bars = html.split("transition:width 300ms").length - 1;
        expect(bars, `${slug} progress bars`).toBe(noPanel(formFactor, slug) ? 0 : 1);
        if (noPanel(formFactor, slug)) continue;
        // Level 3; ephemerists prints the codex's roman numeral for it.
        expect(html, `${slug} lost the level numeral`).toMatch(
          /font-size:var\(--text-title\);color:[^"]*">(?:3|III)</,
        );
      }
    });

    it("drifts the spectrum frame for albescent and holds it still for na", () => {
      // The contrast IS the treatment: Albescent is na plus MOTION (ADR-0048),
      // so the class must be on exactly one of the two.
      onlyOn("albescent", "alb-profile-edge");
    });

    it("scatters candle sparkles on the coven header only", () => {
      onlyOn("coven", "cvn-profile-spark");
      // Eight marks, each with its own delay — one shared delay would pulse the
      // field in unison, which is the drawing this table exists to prevent.
      const html = render("coven");
      expect(html.split("cvn-profile-spark").length - 1).toBe(8);
      expect(new Set([...html.matchAll(/--cvn-spark-delay:([^;"]+)/g)].map((m) => m[1])).size).toBe(8);
    });

    it("ghosts the lotus into the ua header only", () => {
      // Lotus's own gradient id — the mark's fingerprint, not a class we chose.
      onlyOn("ua", "wz-lotus-wash");
    });

    it("grounds singularity in a phosphor terminal, not graph paper", () => {
      const html = render("singularity");
      expect(html, "the phosphor raster").toContain(
        "radial-gradient(120% 80% at 12% 0%",
      );
      // "the blue graph paper is the Ephemerists' plate" — the blue graticule is
      // the thing being replaced, so its absence is half the assertion.
      expect(html, "the blue graticule survived").not.toContain("rgba(37,99,235");
      onlyOn("singularity", "radial-gradient(120% 80% at 12% 0%");
    });

    it("pastes the snide tagline up as a ransom slip", () => {
      onlyOn("snide", "rotate(-0.7deg)");
      const html = render("snide");
      expect(html, "the acid ground").toContain(
        "background:var(--faction-snide-acid)",
      );
      // The torn acid strip along the header top is dropped.
      expect(html, "the torn strip survived").not.toContain("polygon(0 0,4% 40%");
    });

    // Was the level LABEL, in the plate's brass. #2213 deleted the ring, which
    // took the hub disc that painted `surface` under both of the panel's texts:
    // the label joined its two neighbours on `headerMuted`, and the NUMERAL's
    // ink moved with its ground, from the plate's brass (2.83:1 on the cornice
    // band it now sits on) to the band's own mark at 7.59:1. Still `onlyOn`,
    // because the leak this table guards is a kit's ink reaching all nine.
    it("strikes the ephemerists level numeral in the band's mark", () => {
      onlyOn("ephemerists", "color:var(--faction-ephemerists-plate-band-ink)");
    });
  },
);

/**
 * Every perpetual animation this issue adds sits behind the repo's shared
 * `prefers-reduced-motion: no-preference` guard (the `ep-edge` / `ep-drift`
 * pattern). Asserted against the STYLESHEET rather than the markup, because
 * that is where the guard lives and a component cannot be asked about it.
 *
 * Brace-counted rather than regex-sliced on purpose: `@media` blocks nest, and
 * a guard that only checks the class name appears "somewhere near" a
 * no-preference block passes for a rule that sits just outside one.
 *
 * BOTH SHEETS, since #2407 moved `.alb-profile-edge`'s travel into the deferred
 * `motion.ornament.css`. The question this asks is unchanged — is the animation
 * gated — and the answer must not depend on which sheet delivers it; reading
 * only the entry sheet would turn a correct deferral into a red test, and
 * reading only the deferred one would stop noticing an ungated twin left behind.
 */
describe("#1630 motion sits behind the reduced-motion guard", () => {
  const css = [
    readIndexCss(),
    readFileSync(
      fileURLToPath(new URL("../../../motion.ornament.css", import.meta.url)),
      "utf8",
    ),
  ].join("\n");

  /** The source split into (inside a no-preference block, outside it). */
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
      // The pseudo-element is optional because #2498 moved `.alb-profile-edge`'s
      // travel onto a `::before` — a pre-painted ramp slid by transform. The
      // question is still "is the animation gated", on whichever element runs it,
      // and an ungated `.alb-profile-edge { animation }` still fails below.
      const animates = new RegExp(`\\.${className}(::before)?\\s*\\{[^}]*animation`);
      expect(animates.test(GUARDED), `${className} guarded rule`).toBe(true);
      expect(animates.test(UNGUARDED), `${className} UNguarded rule`).toBe(false);
    },
  );
});
