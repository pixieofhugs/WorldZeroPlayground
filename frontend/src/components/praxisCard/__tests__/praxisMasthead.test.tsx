/**
 * Praxis cards wear the task card's masthead band (#2185).
 *
 * THE SEAM IS THE BAND'S RENDERED MARKUP, reached through the nine praxis skins
 * — the mirror of `taskCard/__tests__/mastheadFactionLink.test.tsx`, which works
 * the same seam on the other kit. Two kits mount one component now, so the
 * interesting assertions are the ones that can only be made with both in view.
 *
 * THE CENTRAL TEST IS BAND-FOR-BAND IDENTITY. The owner's ruling is not "a
 * praxis card gets a band", it is "a praxis card gets THE SAME BAND its task
 * card wears — same ground, same rule, same wordmark face and size". Asserting
 * the paint value by value would restate seven skins in a test file and go stale
 * the first time a token moved; asserting that the two kits emit the IDENTICAL
 * band markup is the property itself, and it fails the moment either side grows
 * a copy of its own. That is the failure this file exists for: before #2185,
 * `EverymenPraxisCard` drew its own red bar (`--everymen-red`, 15px,
 * `--font-accent`, two cogs, no name) while `EverymenTaskCard` drew
 * `--faction-everymen-bill-mast` in Bebas at `--text-title` under a double rule.
 * Both branches were green. Two mastheads for one faction shipped anyway.
 *
 * `na` AND `albescent` MOUNT NO BAND, and that is a rule rather than a gap
 * (ADR-0048, NOT superseded by #2185). A praxis card is PUBLIC — it lands on
 * other players' feeds — so a band naming Albescent would reveal a secret
 * society to a stranger. The negative is asserted here for the same reason the
 * task-card file asserts it: it is the assertion a future "finish the set" sweep
 * has to read before it can delete it.
 *
 * SSR-only harness (renderToStaticMarkup, no DOM, effects never run), so these
 * are assertions about markup given props — never interaction. What a static
 * render cannot see is the hover affordance (a pointer handler) and the cascade;
 * both are eyeballed.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ComponentType } from "react";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";
import i18n from "../../../i18n";
import type { CardProps } from "../../taskCard/TaskCard";
import type { ArchetypeProps } from "../desktop/shared";

vi.mock("../../../hooks/useFormFactor", () => ({ useFormFactor: () => "desktop" }));
// `useTheme()` throws outside a `ThemeProvider` by design (#701) and the score
// stamp reaches for it. Nothing here depends on which half it returns — the band
// is a token dress, and the theme is the cascade's business.
vi.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", toggle: () => {} }),
}));

// Imported after the mocks are registered.
import { surfaceMap } from "../../../factions";
import { aTask, aPraxisCard } from "../../../test/fixtures";
import { ALBESCENT_FACTION_SLUG, factionName } from "../../../utils/factions";

interface Skin {
  slug: string;
  Praxis: ComponentType<ArchetypeProps>;
  Task?: ComponentType<CardProps>;
}

/**
 * The two that mount no band, and must not grow one — the only thing typed
 * here (#2815). Both populations below come off the two registries and are
 * split on this set, which pairs each praxis skin with its OWN task skin
 * without a second table to keep in step: the band-for-band identity claim is
 * only as good as that pairing.
 */
const BANDLESS_SLUGS: ReadonlySet<string> = new Set(["na", ALBESCENT_FACTION_SLUG]);

const TASK_CARDS = surfaceMap("taskCard");
const SKINS: Skin[] = Object.entries(surfaceMap("praxisCard")).map(([slug, Praxis]) => ({
  slug,
  Praxis,
  Task: TASK_CARDS[slug],
}));
const BANDED: Skin[] = SKINS.filter(({ slug }) => !BANDLESS_SLUGS.has(slug));
const BANDLESS: Skin[] = SKINS.filter(({ slug }) => BANDLESS_SLUGS.has(slug));

const adminProps = {
  showAdminControls: false,
  onHide: () => {},
  onFail: () => {},
} as unknown as ArchetypeProps["adminProps"];

function renderPraxis({ slug, Praxis }: Skin): string {
  const praxis = aPraxisCard({ task_faction_slug: slug });
  return renderToStaticMarkup(
    <MemoryRouter>
      <Praxis praxis={praxis} adminProps={{ ...adminProps, praxis }} showCrown />
    </MemoryRouter>,
  );
}

function renderTask(skin: Skin): string {
  const Task = skin.Task as ComponentType<CardProps>;
  const task = aTask();
  return renderToStaticMarkup(
    <MemoryRouter>
      <Task
        task={task}
        basePoints={task.point_value}
        multiplier={1}
        inProgressCount={task.in_progress_count}
        onSignup={() => {}}
      />
    </MemoryRouter>,
  );
}

/**
 * The band's whole element, from its opening `<a` to its closing `</a>`.
 *
 * The first `</a>` after the marker IS the band's own: the band contains a
 * sigil, a wordmark and (for Singularity) three lamps, and no anchor — which is
 * the invariant that makes it legal HTML in the first place.
 */
function band(html: string, slug: string): string {
  const at = html.indexOf(`data-card-masthead="${slug}"`);
  expect(at, "the shared band from #2029").toBeGreaterThan(-1);
  const open = html.lastIndexOf("<", at);
  const close = html.indexOf("</a>", at);
  expect(close, "the band is closed").toBeGreaterThan(-1);
  return html.slice(open, close + "</a>".length);
}

describe.each(BANDED)("$slug praxis card wears its task card's band (#2185)", (skin) => {
  it("emits the identical band markup the task card does", () => {
    // The ruling, as a property. Not "a band exists" and not "the ground is
    // this hex" — the SAME band, which is what one shared painted component
    // makes true and two inline copies only promise.
    expect(band(renderPraxis(skin), skin.slug)).toBe(band(renderTask(skin), skin.slug));
  });

  it("names the faction and goes to the faction page", () => {
    const tag = band(renderPraxis(skin), skin.slug);
    expect(tag, "the band itself is the hit target").toMatch(/^<a /);
    expect(tag, "and it reads the faction it names").toContain(`href="/factions/${skin.slug}"`);
    expect(tag, "the wordmark is the faction's name").toContain(factionName(skin.slug));
    const label = i18n.t("feed:taskCard.mastheadLink", { faction: factionName(skin.slug) });
    expect(tag, "labelled with the destination, not the furniture").toContain(
      `aria-label="${label}"`,
    );
  });

  it("nests no anchor inside another", () => {
    // A band inside the card's own links — the task line, the byline — would be
    // invalid HTML, and the praxis frames vary in how they nest. The band is a
    // top-of-frame SIBLING in every one, so it closes before any other opens.
    const html = renderPraxis(skin);
    const at = html.indexOf(`data-card-masthead="${skin.slug}"`);
    // Cut at the band's own `<`, not at its marker attribute — the marker sits
    // INSIDE the opening tag, so slicing at it would count the band itself as
    // an unclosed anchor and the test would fail on correct markup.
    const before = html.slice(0, html.lastIndexOf("<", at));
    const opened = (before.match(/<a[\s>]/g) ?? []).length;
    const closed = (before.match(/<\/a>/g) ?? []).length;
    expect(opened, "no anchor is still open where the band starts").toBe(closed);
  });
});

describe("the bandless half is still a half", () => {
  // A filter matching nothing leaves `describe.each` an empty array — zero
  // suites, and a silent green on the disclosure claim below.
  it("names exclusions that are still registered praxis skins", () => {
    expect(BANDLESS.map(({ slug }) => slug).sort()).toEqual([...BANDLESS_SLUGS].sort());
  });
});

describe.each(BANDLESS)("$slug praxis card grows no band (#2185, ADR-0048)", (skin) => {
  it("mounts no masthead and links to no faction page", () => {
    const html = renderPraxis(skin);
    // A praxis card is public. A band naming Albescent on a stranger's feed is
    // a disclosure, not a style choice — and `/factions/albescent` is an
    // in-world dead end rather than a faction page.
    expect(html, "no band to hang a link on").not.toContain("data-card-masthead");
    expect(html, "and no faction page anywhere on the card").not.toContain("/factions/");
  });
});
