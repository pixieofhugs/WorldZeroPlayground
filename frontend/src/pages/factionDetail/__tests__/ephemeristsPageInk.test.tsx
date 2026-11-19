/**
 * #1793 — copy outside a `CARD` stands on `--color-bg-page`, so it takes the
 * app's ink; the plate's quiet ink (2.64:1 there) is for copy inside a card.
 * The AA arithmetic stays in `utils/__tests__/factionContrast.test.ts`.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import i18n from "../../../i18n";
import EphemeristsFactionBody from "../archetypes/EphemeristsFactionBody";
import type { FactionDetailState } from "../useFactionDetail";

const state = {
  slug: "ephemerists",
  loading: false,
  faction: { slug: "ephemerists" },
  fetchError: null,
  members: [],
  tasks: [],
  recentPraxis: [],
  membership: {
    state: "member",
    currentFactionSlug: "ephemerists",
    join: async () => {},
    joining: false,
    joinError: null,
  },
} as unknown as FactionDetailState;

const html = renderToStaticMarkup(
  <MemoryRouter>
    <EphemeristsFactionBody state={state} />
  </MemoryRouter>,
);

/** The `<p>` carrying `key`'s copy, as its opening tag. */
function paragraphOf(key: string): string {
  const text = String(i18n.t(key as never, { ns: "factions" } as never));
  expect(text, `no copy for ${key}`).not.toBe(key);
  const at = html.indexOf(text);
  expect(at, `nothing renders ${key}`).toBeGreaterThan(-1);
  return html.slice(html.lastIndexOf("<p", at), at);
}

describe("the Ephemerists faction page's ink outside its cards", () => {
  it.each(["detail.default.tasksEmpty", "detail.default.recentEmpty"])(
    "`%s` reads the page's quiet ink, not the plate's",
    (key) => {
      expect(paragraphOf(key)).toContain("color:var(--color-text-secondary)");
    },
  );

  it("prose inside a card keeps the plate's ink", () => {
    expect(paragraphOf("detail.membersEmpty")).toContain("color:var(--faction-ephemerists-plate-quiet)");
  });
});
