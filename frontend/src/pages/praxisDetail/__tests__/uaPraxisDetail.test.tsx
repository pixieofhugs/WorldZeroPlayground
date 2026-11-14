/**
 * UA praxis-detail skin, the pressed leaf (#1119). Shared slots:
 * `archetypeSlots.test.tsx`. Voiced vocabulary is recorded on #1119, not built.
 * `useFormFactor` is mocked.
 */
import { describe, it, expect, vi } from "vitest";
import { surfaceMap } from "../../../factions";
import { resolvedArchetype } from "../../../factions/lazyArchetype";
import type { PraxisDetailState } from "../usePraxisDetail";
import type { DuelDetailOut } from "../../../api/duel";
import { aCharacter, aCurrentUser, aDuel, aDuelSide, aMember, aMetatask, aPraxis } from "../../../test/fixtures";
import { CO_MEMBER as SHARED_CO_MEMBER, VOTERS, aPraxisDetailState, indexOf, renderPraxisDetail, skinRenderer } from "../../../test/praxisDetail";
import { resolveRoleReads } from "../../../test/sourceScan";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "desktop" | "mobile" }));
vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

// After the mock; the identity check needs the module, not the lazy wrapper.
const { default: UaPraxisDetail } = await import("../archetypes/UaPraxisDetail");

const MEMBER = aMember({ character_display_name: "Wren Abalone" });
const CO_MEMBER = { ...SHARED_CO_MEMBER, character_display_name: "Bram Quilling" };

// No apostrophes: they escape to `&#x27;` and break substring checks.
const PRAXIS = aPraxis({
  task_title: "Sat with the mesa at first light",
  task_faction_slug: "ua",
  title: "Ninety Breaths",
  body_text: "Counted them, lost count twice, began again.",
  created_by_id: 3,
  created_by_display_name: "Wren Abalone",
  created_by_faction_slug: "ua",
  members: [MEMBER],
});

const VIEWER = aCurrentUser({
  character: aCharacter({ display_name: "Wren Abalone", faction_slug: "ua", level: 4 }),
});

/** A two-sided duel at a given status; this praxis is the challenger's. */
const duel = (status: DuelDetailOut["status"]): DuelDetailOut =>
  aDuel({
    status,
    challenger: aDuelSide({
      display_name: "Wren Abalone",
      faction_slug: "ua",
      points_from_votes: 18,
    }),
    opponent: aDuelSide({
      praxis_id: 2,
      character_id: 4,
      display_name: "Bram Quilling",
      faction_slug: "ua",
      points_from_votes: 15.4,
    }),
  });

const state = (overrides: Partial<PraxisDetailState> = {}): PraxisDetailState =>
  aPraxisDetailState({ praxis: PRAXIS, voters: VOTERS, ...overrides });

const render = skinRenderer("ua", mocks);

describe("UA claims the praxis-detail surface (#1119)", () => {

  it("is the UA skin and not the na fallback still wearing its name", () => {
    // #951's bug; the tell is the dress, not a green render.
    const ua = render(state());
    const { html: na } = renderPraxisDetail("na", state());
    expect(ua.html, "the toothed leaf").toContain("ua-praxis-leaf");
    expect(na, "which the na page has no notion of").not.toContain("ua-praxis-leaf");
    expect(na, "na's page is the spectrum").toContain("--faction-default-rainbow");
  });

  it("resolves through the manifest thunk to the same component", async () => {
    const Resolved = await resolvedArchetype(surfaceMap("praxisDetail")["ua"]);
    expect(Resolved).toBe(UaPraxisDetail);
  });
});

describe("UA praxis detail — copy is neutral (ADR-0061)", () => {
  it("reads the shared neutral words in every content slot", () => {
    const { text } = render(
      state({
        praxis: {
          ...PRAXIS,
          // Members is gated on the type (#1274).
          type: "collab",
          members: [MEMBER, CO_MEMBER],
          applied_metatasks: [
            aMetatask({ metatask_faction_slug: "ua" }),
          ],
        },
      }),
    );
    for (const neutral of [
      "Proof",
      "Write-up",
      "Members",
      "Metatasks",
      "Cast your vote",
      "Who voted",
      "Discussion",
    ]) {
      expect(text, `the shared word for ${neutral}`).toContain(neutral);
    }

    // #1119's **Voice** list, minus words that collide with shared strings.
    for (const voiced of [
      "The sheet",
      "Marks",
      "The contest",
      "Revise the sheet",
      "Top mark",
    ]) {
      expect(text, `no voiced copy: ${voiced}`).not.toContain(voiced);
    }
  });

  it("ships no detail.ua.* block for the page to read", async () => {
    // Scoped to `detail`: UA legitimately owns card and comment copy elsewhere.
    const catalog = (await import("../../../locales/en/praxis.json")).default as Record<
      string,
      Record<string, unknown>
    >;
    expect(Object.keys(catalog.detail)).not.toContain("ua");
  });

  it("keeps the moderation chrome in the shared neutral words", () => {
    const flagged = render(
      state({ praxis: { ...PRAXIS, moderation_status: "flagged" }, showAdminBar: true }),
    );
    expect(flagged.text, "the shared flagged banner").toContain("FLAGGED");
    expect(flagged.text, "and its shared sentence").toContain("awaiting admin review");
    expect(flagged.text, "the shared steward bar").toContain("ADMIN");

    const failed = render(
      state({
        praxis: {
          ...PRAXIS,
          moderation_status: "failed",
          admin_note: "Proof shows a different mesa.",
        },
      }),
    );
    expect(failed.text, "the shared failure notice").toContain("marked as failed");
    expect(failed.text, "with the steward note").toContain("different mesa");
  });
});

describe("UA praxis detail — the layout contract (#1129)", () => {

  it("mounts the comments region with the layout's heading, not the thread's", () => {
    const { text } = render(state());
    expect(text, "the layout's section head").toContain("Discussion");
    expect(text, "and not a second heading for the same list").not.toContain("0 comments");
  });

  it("moves the score above the proof on mobile, and draws it exactly once", () => {
    const wide = render(state());
    expect(wide.text.match(/Score/g)?.length, "one score block on desktop").toBe(1);
    expect(indexOf(wide.html, "Proof"), "proof precedes the aside rail").toBeLessThan(
      indexOf(wide.html, "Score"),
    );

    const phone = render(state(), "mobile");
    expect(phone.text.match(/Score/g)?.length, "one score block on mobile").toBe(1);
    expect(indexOf(phone.html, "Score"), "rail rides above the proof").toBeLessThan(
      indexOf(phone.html, "Proof"),
    );
  });
});

describe("UA praxis detail — the dress", () => {
  it("wears the practice palette and both faces", () => {
    const { html } = render(state());
    expect(html, "the toothed leaf").toContain("ua-praxis-leaf");
    expect(html, "Cormorant Garamond").toContain("--faction-ua-card-font");
    expect(html, "EB Garamond").toContain("--faction-ua-body-font");
    expect(html, "the sienna rule").toContain("--faction-ua-card-frame");
    expect(html, "the neutral hairline").toContain("--faction-ua-rule");
  });

  it("draws the lotus once and the ensō only where it is reserved", () => {
    const { html } = render(state());
    // Counted on the ink filter: the colour token recurs on every petal.
    expect(html.match(/<feTurbulence/g)?.length, "one lotus, one ink filter").toBe(1);
    expect(html, "tinted from UA, not a literal").toContain("--faction-ua-card-lotus");
    expect(html, "behind the copy, not over it").toContain("z-index:-1");
    // Ensō is reserved for score + faction mark (§6/#849). Count the prefixed
    // mask only; a bare `enso.webp` count doubles.
    expect(
      html.match(/-webkit-mask-image:url\(\/factionMarks\/enso\.webp\)/g)?.length,
      "score stamp + one faction mark",
    ).toBe(2);
  });

  it("never uses an ink-family token as a fill (#1155)", () => {
    // #1155 measured 1.05:1 when muted text was used as a fill.
    const { html } = render(state());
    for (const ink of ["card-muted", "card-text", "card-body", "card-accent"]) {
      expect(html, `${ink} is ink, never a ground`).not.toContain(
        `background:var(--faction-ua-${ink})`,
      );
    }
    // The rank ramp is an ornament ladder carrying no text.
    expect(html, "the voter rungs grade on the ramp").toContain("--faction-ua-rank-");
  });

  it("gives the rail the stock its mounted components were measured on", () => {
    // `UaScoreStamp`'s box and `UaVote`'s mandala cores are measured against
    // `--faction-ua-card-bg`; `-lift` or `-panel` breaks both.
    const { html } = render(state());
    expect(resolveRoleReads(html), "the rail plates are the sheet").toMatch(
      /background:var\(--faction-ua-card-bg\)/,
    );
  });

  it("carries no unaffiliated spectrum of its own", () => {
    expect(render(state()).html).not.toContain("--faction-default-rainbow");
  });

  it("writes no inline animation — UA is the quiet practice", () => {
    // The vote mandala owns its own reduced-motion gate.
    expect(render(state()).html).not.toContain("animation:");
  });
});

describe("UA praxis detail — the state axes", () => {
  it("renders solo, collab and duel", () => {
    const solo = render(state());
    expect(solo.text, "no roster for a solo").not.toContain("Members");

    const collab = render(
      state({ praxis: { ...PRAXIS, type: "collab", members: [MEMBER, CO_MEMBER] } }),
    );
    expect(collab.text, "both co-authors in the byline").toContain("Bram Quilling");
    expect(collab.text, "and the roster").toContain("Members");

    // ADR-0011: a declined challenge draws no card.
    const declined = render(
      state({
        praxis: { ...PRAXIS, type: "duel", duel_id: 5 },
        duel: duel("declined"),
      }),
    );
    expect(declined.text, "nothing about a duel that never happened").not.toContain("The duel");

    const settled = render(
      state({
        praxis: { ...PRAXIS, type: "duel", duel_id: 5 },
        duel: duel("settled"),
      }),
    );
    expect(settled.text, "the duel card is mounted").toContain("The duel");
    expect(settled.text, "and reads the live standing, never a verdict").toContain("live");
  });

  it("renders as visitor, owner and steward", () => {
    // #1397: on a submitted solo `/edit` redirects back here, so unsubmit is the
    // way into the composer.
    expect(render(state()).text, "a visitor gets no owner controls").not.toContain(
      "unsubmit",
    );
    expect(render(state({ isOwner: true, user: VIEWER })).text, "the owner does").toContain(
      "unsubmit",
    );
    expect(
      render(state({ isOwner: true, user: VIEWER })).text,
      "and no link that would round-trip",
    ).not.toContain("edit this praxis");
    expect(render(state({ showAdminBar: true })).text, "a steward gets the bar").toContain(
      "ADMIN",
    );
  });
});
