/**
 * WOW praxis-detail skin, the chronicle entry (#1121). Shared slots:
 * `archetypeSlots.test.tsx`. Voiced vocabulary is recorded on #1121, not built.
 * `useFormFactor` is mocked.
 */
import { describe, it, expect, vi } from "vitest";
import i18n from "../../../i18n";
import { surfaceMap } from "../../../factions";
import { resolvedArchetype } from "../../../factions/lazyArchetype";
import type { PraxisDetailState } from "../usePraxisDetail";
import type { DuelDetailOut } from "../../../api/duel";
import { aCharacter, aCurrentUser, aDuel, aDuelSide, aMember, aMetatask, aPraxis } from "../../../test/fixtures";
import { CO_MEMBER as SHARED_CO_MEMBER, VOTERS, aPraxisDetailState, indexOf, renderPraxisDetail, skinRenderer } from "../../../test/praxisDetail";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "desktop" | "mobile" }));
vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

// After the mock; the identity check needs the module, not the lazy wrapper.
const { default: WowPraxisDetail } = await import("../archetypes/WowPraxisDetail");

const MEMBER = aMember({ character_display_name: "Wren Abalone" });
const CO_MEMBER = { ...SHARED_CO_MEMBER, character_display_name: "Bram Quilling" };

// No apostrophes: they escape to `&#x27;` and break substring checks.
const PRAXIS = aPraxis({
  task_title: "Hauled the recycling to the depot",
  task_faction_slug: "wow",
  created_by_id: 3,
  created_by_display_name: "Wren Abalone",
  created_by_faction_slug: "wow",
  members: [MEMBER],
});

const VIEWER = aCurrentUser({
  character: aCharacter({ display_name: "Wren Abalone", faction_slug: "wow", level: 4 }),
});

/** A two-sided duel at a given status; this praxis is the challenger's. */
const duel = (status: DuelDetailOut["status"]): DuelDetailOut =>
  aDuel({
    status,
    challenger: aDuelSide({
      display_name: "Wren Abalone",
      faction_slug: "wow",
      points_from_votes: 18,
    }),
    opponent: aDuelSide({
      praxis_id: 2,
      character_id: 4,
      display_name: "Bram Quilling",
      faction_slug: "wow",
      points_from_votes: 15.4,
    }),
  });

const state = (overrides: Partial<PraxisDetailState> = {}): PraxisDetailState =>
  aPraxisDetailState({ praxis: PRAXIS, voters: VOTERS, ...overrides });

const render = skinRenderer("wow", mocks);

describe("WOW claims the praxis-detail surface (#951)", () => {
  it("registers a praxisDetail archetype", () => {
    expect(surfaceMap("praxisDetail")["wow"]).toBeDefined();
  });

  it("is the WOW skin and not the na fallback still wearing its name", () => {
    // #951: WOW rendered the generic Default; the tell is the dress.
    const wow = render(state());
    const { html: na } = renderPraxisDetail("na", state());
    expect(wow.html, "the parchment field").toContain("wow-detail-field");
    expect(na, "which the na page has no notion of").not.toContain("wow-detail-field");
    expect(na, "na's page is the spectrum").toContain("--faction-default-rainbow");
  });

  it("resolves through the manifest thunk to the same component", async () => {
    const Resolved = await resolvedArchetype(surfaceMap("praxisDetail")["wow"]);
    expect(Resolved).toBe(WowPraxisDetail);
  });
});

describe("WOW praxis detail — copy is neutral (ADR-0061)", () => {
  it("reads the shared neutral words in every content slot", () => {
    const { text } = render(
      state({
        praxis: {
          ...PRAXIS,
          // Members is gated on the type (#1274).
          type: "collab",
          members: [MEMBER, CO_MEMBER],
          applied_metatasks: [
            aMetatask({ metatask_faction_slug: "wow" }),
          ],
        },
      }),
    );
    for (const neutral of [
      "Proof",
      "Members",
      "Metatasks",
      "Cast your vote",
      "Who voted",
      "Discussion",
    ]) {
      expect(text, `the shared word for ${neutral}`).toContain(neutral);
    }

    // Recorded on #1121, not built.
    for (const voiced of [
      "The proof",
      "Sworn together by",
      "Charms claimed",
      "Your cheer",
      "The court says",
      "The gallery",
    ]) {
      expect(text, `no voiced copy: ${voiced}`).not.toContain(voiced);
    }
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
          admin_note: "Proof shows a different depot.",
        },
      }),
    );
    expect(failed.text, "the shared failure notice").toContain("marked as failed");
    expect(failed.text, "with the steward note").toContain("different depot");
  });

  it("leaves the report card outside the costume", () => {
    const { html } = render(state());
    // Bounded at `</aside>`: the flag card is its last child.
    const card = html.slice(indexOf(html, "sidebar-card"), indexOf(html, "</aside>"));
    expect(card, "the report card is bare").not.toContain("--faction-wow");
    expect(html, "and reads the shared words").toContain("Flag this praxis");
  });
});

describe("WOW praxis detail — the layout contract (#1129)", () => {
  it("holds the 330px aside on desktop and drops the track on mobile", () => {
    expect(render(state()).html, "the corrected track, not 340").toContain("330px");
    expect(render(state(), "mobile").html, "no aside track on a phone").not.toContain("330px");
  });

  it("shows the crown at BOTH form factors", () => {
    const crown = `title="${i18n.t("feed:taskCrown.title")}"`;
    const crowned = state({ praxis: { ...PRAXIS, is_top_for_task: true } });
    expect(render(crowned).html, "desktop").toContain(crown);
    expect(render(crowned, "mobile").html, "mobile — never form-factor gated").toContain(
      crown,
    );
    expect(render(state(), "mobile").html, "and only when crowned").not.toContain(crown);
  });

  it("carries its ground on the column, never the viewport", () => {
    // WORLD_ZERO_STYLE §5 / #1028: the site background shows around the page.
    const { html } = render(state());
    expect(html, "the field is the column").toContain("wow-detail-field");
    expect(html, "no full-viewport ground").not.toContain("position:fixed");
  });

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

  it("draws no navigation of its own, at either width (#2102)", () => {
    // The breadcrumb is site chrome (`components/nav/Breadcrumb`); its contents
    // are pinned in `pages/__tests__/breadcrumbAcrossSurfaces`.
    for (const factor of ["desktop", "mobile"] as const) {
      const { html } = render(state(), factor);
      const sheet = html.slice(html.indexOf("</nav>") + 1);
      expect(sheet, `${factor}: no crumb inside the surface`).not.toContain('href="/tasks"');
      expect(html, `${factor}: no phone back bar`).not.toContain('href="/praxis"');
    }
  });
});

describe("WOW praxis detail — the dress", () => {
  it("wears the chronicle palette and both faces", () => {
    const { html } = render(state());
    expect(html, "the parchment field").toContain("wow-detail-field");
    expect(html, "the gold frame").toContain("--faction-wow-chronicle-gold");
    expect(html, "MedievalSharp").toContain("--faction-wow-card-font");
    expect(html, "Lora italic").toContain("--faction-wow-body-font");
    // Caveat belongs to Coven alone.
    expect(html, "no Caveat on WOW").not.toContain("--font-faction-script");
    expect(html, "not by repointing Coven").not.toContain("--faction-coven-card-font");
  });

  it("strings the bunting and bobs exactly one bunch of balloons", () => {
    const { html } = render(state());
    // Bunting is asserted by its handle: it measures its container (#2728), so
    // it renders empty without a DOM. Flags: `factionMarks/__tests__/wowBunting.test.tsx`.
    expect(html, "bunting is strung").toContain("data-wow-bunting");
    expect(html.match(/wow-balloon-bunch/g)?.length, "one bunch, not a soup").toBe(1);
    expect(html, "motion is never inline").not.toContain("animation:");
  });

  it("carries no unaffiliated spectrum of its own", () => {
    expect(render(state()).html).not.toContain("--faction-default-rainbow");
  });
});

describe("WOW praxis detail — the state axes", () => {
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
    expect(
      render(state({ isOwner: true, user: VIEWER })).text,
      "the owner does",
    ).toContain("unsubmit");
    expect(
      render(state({ isOwner: true, user: VIEWER })).text,
      "and no link that would round-trip",
    ).not.toContain("edit this praxis");
    expect(
      render(state({ showAdminBar: true })).text,
      "a steward gets the bar",
    ).toContain("ADMIN");
  });
});
