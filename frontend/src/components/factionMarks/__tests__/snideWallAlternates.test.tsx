/**
 * S.N.I.D.E.'s ornament alternates (#2395, epic #2195).
 *
 * THE SEAM: `the ground a page declared` → `the background declaration the two
 * cards render`. Phase 1 (#2387) already tests the predicate itself in
 * `backdrop/__tests__/groundIsBusy.test.tsx`; nothing here repeats it. What is
 * only checkable at THIS seam is that the cards consume it, that they drop the
 * right layers, and that the chrome beside them does not move.
 *
 * It lives beside `snideAtoms` rather than in either card's folder because the
 * drawing is one drawing with two mounts: a branch added to one card and
 * forgotten on the other is exactly the defect, and a file per card cannot see
 * it. (`covenCat.test.tsx` sits here for the same reason.)
 *
 * SSR-only harness (`renderToStaticMarkup`, no DOM, effects never run) — which
 * is why the ground is reached by rendering a `BackdropContext.Provider`
 * directly, the escape `BackdropContext`'s own note describes. Assertions are
 * about markup given props, never interaction.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";

vi.mock("../../../hooks/useFormFactor", () => ({ useFormFactor: () => "desktop" }));
// `useTheme()` throws outside a `ThemeProvider` by design (#701) and the praxis
// card's score stamp reaches for it. Which half it gets is irrelevant here: the
// ground is a token either way, which is the point of a token dress.
vi.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", toggle: () => {} }),
}));

// Imported after the mocks are registered.
import { BackdropContext } from "../../backdrop/BackdropContext";
import type { PraxisCardOut } from "../../../api/praxis";
import SnideTaskCard from "../../taskCard/SnideTaskCard";
import SnidePraxisCard from "../../praxisCard/desktop/SnidePraxisCard";
import { aTask } from "../../../test/fixtures";

const TASK = aTask({ description: "Fly-post the whole of Corporation Street." });

const PRAXIS = {
  id: 1,
  title: "Fly-posted the whole of Corporation Street",
  task_id: 4,
  task_title: "Say the thing nobody will put their name to",
  created_by_id: 7,
  created_by_display_name: "Vex",
  created_by_faction_slug: "snide",
  created_by_avatar_url: "",
  task_faction_slug: "snide",
  task_level_required: 2,
  task_point_value: 12,
  member_count: 1,
  score: 13.6,
  display_multiplier: 1,
  metatask_points: 0,
  points_from_votes: 4,
  voter_count: 3,
  is_top_for_task: false,
  media_items: [],
  applied_metatasks: [],
} as unknown as PraxisCardOut;

const adminProps = {
  praxis: PRAXIS,
  showAdminControls: false,
  onHide: () => {},
  onFail: () => {},
} as unknown as Parameters<typeof SnidePraxisCard>[0]["adminProps"];

/** Render either card standing on a page that declared `slug`. */
function under(
  card: "task" | "praxis",
  slug: string | null,
  cardsKeepOrnament = false,
): string {
  return renderToStaticMarkup(
    <BackdropContext.Provider value={{ slug, cardsKeepOrnament, setGround: () => {} }}>
      <MemoryRouter>
        {card === "task" ? (
          <SnideTaskCard
            task={TASK}
            basePoints={TASK.point_value}
            multiplier={1}
            inProgressCount={0}
            onSignup={() => {}}
          />
        ) : (
          <SnidePraxisCard praxis={PRAXIS} adminProps={adminProps} />
        )}
      </MemoryRouter>
    </BackdropContext.Provider>,
  );
}

/** The card element's own opening tag — its ground, and nothing nested in it. */
function frame(card: "task" | "praxis", slug: string | null, keep = false): string {
  const markup = under(card, slug, keep);
  const from = markup.indexOf(card === "task" ? "<article" : '<div class="snd-praxis-frame');
  expect(from, "a card to look at").toBeGreaterThan(-1);
  return markup.slice(from, markup.indexOf(">", from));
}

/** The four PRINTED layers — the ornament. The ramp under them is not one. */
const PRINTED = [
  "--faction-snide-note-grain",
  "--faction-snide-note-scan",
  "--faction-snide-note-wash-acid",
  "--faction-snide-note-wash-pink",
];

describe.each(["task", "praxis"] as const)("the %s card's wall alternates", (card) => {
  it("wears all four printed layers on an unthemed route", () => {
    // /tasks, Home, the FieldDesk, both detail pages — the site-wide default,
    // and the case that must not move: this is where the wall is the look.
    const outer = frame(card, null);
    for (const layer of PRINTED) expect(outer, layer).toContain(layer);
    expect(outer, "the ramp").toContain("--faction-snide-wall-deep");
  });

  it("drops them on a patterned ground and keeps the bare ramp", () => {
    // The one live route: a character profile of a player whose faction paints
    // a pattern. `everymen` rather than `snide` on purpose — the predicate is
    // ANY ornamented ground, not the card's own faction (owner ruled (a)).
    const outer = frame(card, "everymen");
    for (const layer of PRINTED) expect(outer, layer).not.toContain(layer);
    // "Either burst, or plain": what is left is the card's GROUND COLOUR, not a
    // substitute texture and not nothing — a transparent slab is not plain.
    expect(outer, "the ramp survives").toContain("--faction-snide-wall-deep");
    expect(outer, "no substitute texture").not.toContain("repeating-linear-gradient");
  });

  it("keeps them on a WASH — a Coven profile is not busy", () => {
    const outer = frame(card, "coven");
    for (const layer of PRINTED) expect(outer, layer).toContain(layer);
  });

  it("keeps them where the page claimed the faction-page exemption", () => {
    // Owner, 2026-08-18: a faction page may carry busy cards on a busy ground.
    // S.N.I.D.E.'s own page is the whole wall, on the whole wall.
    const outer = frame(card, "snide", true);
    for (const layer of PRINTED) expect(outer, layer).toContain(layer);
  });

  it("never branches the CHROME", () => {
    // The law is about the card's BACKGROUND TEXTURE alone. Everything that
    // separates the clipping from what it is pasted to has to survive the
    // branch — on a patterned page it is the ONLY thing left doing that job.
    const [plain, busy] = [frame(card, null), frame(card, "everymen")];
    for (const chrome of ["border:", "box-shadow:"]) {
      expect(busy, chrome).toContain(chrome);
      expect(
        busy.slice(busy.indexOf(chrome)).split(";")[0],
        `${chrome} is the same on both grounds`,
      ).toBe(plain.slice(plain.indexOf(chrome)).split(";")[0]);
    }
    // The masthead band is painted, not the wall showing through, so it is the
    // same strip on either ground.
    expect(under(card, "everymen"), "the band").toContain("--faction-snide-note-bar");
  });
});

describe("the praxis card's container channel still wins", () => {
  it("keeps the `--snd-praxis-ground` override in front of BOTH grounds", () => {
    // Task detail's black slab (#2177) arrives through this channel, and that
    // column themes no backdrop — so the branch must not eat the fallback form.
    for (const slug of [null, "everymen"]) {
      expect(frame("praxis", slug), `${slug}`).toContain("var(--snd-praxis-ground,");
    }
  });
});
