/**
 * S.N.I.D.E.'s ornament alternates (#2395). The predicate is tested in
 * `groundIsBusy.test.tsx`; here: both cards consume it, drop the right layers,
 * and leave chrome alone. Lives beside `snideAtoms` since a branch forgotten
 * on one card is the defect.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";

vi.mock("../../../hooks/useFormFactor", () => ({ useFormFactor: () => "desktop" }));
// `useTheme()` throws outside a `ThemeProvider` (#701).
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

/** The card's own opening tag. */
function frame(card: "task" | "praxis", slug: string | null, keep = false): string {
  const markup = under(card, slug, keep);
  const from = markup.indexOf(card === "task" ? "<article" : '<div class="snd-praxis-frame');
  expect(from, "a card to look at").toBeGreaterThan(-1);
  return markup.slice(from, markup.indexOf(">", from));
}

/** The ornament layers; the ramp under them is not ornament. */
const PRINTED = [
  "--faction-snide-note-grain",
  "--faction-snide-note-scan",
  "--faction-snide-note-wash-acid",
  "--faction-snide-note-wash-pink",
];

describe.each(["task", "praxis"] as const)("the %s card's wall alternates", (card) => {
  it("wears all four printed layers on an unthemed route", () => {
    const outer = frame(card, null);
    for (const layer of PRINTED) expect(outer, layer).toContain(layer);
    expect(outer, "the ramp").toContain("--faction-snide-wall-deep");
  });

  it("drops them on a patterned ground and keeps the bare ramp", () => {
    // Any ornamented ground, not just the card's own faction.
    const outer = frame(card, "everymen");
    for (const layer of PRINTED) expect(outer, layer).not.toContain(layer);
    // Plain = ground colour, not a substitute and not transparent.
    expect(outer, "the ramp survives").toContain("--faction-snide-wall-deep");
    expect(outer, "no substitute texture").not.toContain("repeating-linear-gradient");
  });

  it("keeps them on a WASH — a Coven profile is not busy", () => {
    const outer = frame(card, "coven");
    for (const layer of PRINTED) expect(outer, layer).toContain(layer);
  });

  it("keeps them where the page claimed the faction-page exemption", () => {
    const outer = frame(card, "snide", true);
    for (const layer of PRINTED) expect(outer, layer).toContain(layer);
  });

  it("never branches the CHROME", () => {
    // Texture only; border/shadow separate the card on a busy page.
    const [plain, busy] = [frame(card, null), frame(card, "everymen")];
    for (const chrome of ["border:", "box-shadow:"]) {
      expect(busy, chrome).toContain(chrome);
      expect(
        busy.slice(busy.indexOf(chrome)).split(";")[0],
        `${chrome} is the same on both grounds`,
      ).toBe(plain.slice(plain.indexOf(chrome)).split(";")[0]);
    }
    expect(under(card, "everymen"), "the band").toContain("--faction-snide-note-bar");
  });
});

describe("the praxis card's container channel still wins", () => {
  it("keeps the `--snd-praxis-ground` override in front of BOTH grounds", () => {
    // Task detail's slab (#2177) arrives through this channel.
    for (const slug of [null, "everymen"]) {
      expect(frame("praxis", slug), `${slug}`).toContain("var(--snd-praxis-ground,");
    }
  });
});
