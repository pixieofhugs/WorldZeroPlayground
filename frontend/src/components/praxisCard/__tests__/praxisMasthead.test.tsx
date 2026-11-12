/**
 * Praxis cards wear the task card's masthead band (#2185); mirror of
 * `taskCard/__tests__/mastheadFactionLink.test.tsx`. The central test is
 * band-for-band IDENTITY with the task card: before #2185 Everymen shipped two
 * different mastheads with both branches green. `na` and `albescent` mount no
 * band (ADR-0048): a public card naming Albescent would disclose it. SSR-only.
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
// `useTheme()` throws outside a `ThemeProvider` (#701); the score stamp uses it.
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

/** The bandless pair (#2815). Both populations come off the registries, so each
 *  praxis skin pairs with its OWN task skin. */
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

/** The band from `<a` to `</a>`; it contains no anchor, so the first `</a>` is its own. */
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
    const html = renderPraxis(skin);
    const at = html.indexOf(`data-card-masthead="${skin.slug}"`);
    // Cut at the band's own `<`: the marker sits inside its opening tag.
    const before = html.slice(0, html.lastIndexOf("<", at));
    const opened = (before.match(/<a[\s>]/g) ?? []).length;
    const closed = (before.match(/<\/a>/g) ?? []).length;
    expect(opened, "no anchor is still open where the band starts").toBe(closed);
  });
});

describe("the bandless half is still a half", () => {
  // An empty filter would give `describe.each` zero suites: a silent green.
  it("names exclusions that are still registered praxis skins", () => {
    expect(BANDLESS.map(({ slug }) => slug).sort()).toEqual([...BANDLESS_SLUGS].sort());
  });
});

describe.each(BANDLESS)("$slug praxis card grows no band (#2185, ADR-0048)", (skin) => {
  it("mounts no masthead and links to no faction page", () => {
    const html = renderPraxis(skin);
    // `/factions/albescent` is also an in-world dead end.
    expect(html, "no band to hang a link on").not.toContain("data-card-masthead");
    expect(html, "and no faction page anywhere on the card").not.toContain("/factions/");
  });
});
