/**
 * The Singularity praxis-detail skin (#1122, epic #1085).
 *
 * `archetypeSlots.test.tsx` already walks this archetype for the slots EVERY
 * praxis-read page must emit, and `duelCard.test.tsx` guards the duel readings
 * themselves. This file guards what is specific to THIS skin:
 *
 *  - the inherited layout contract it must not "fix" — the 330px aside track,
 *    the crown at BOTH form factors, the responsive move of score + duel, and
 *    the comments region carrying exactly one heading;
 *  - the un-skinned moderation chrome (ADR-0061);
 *  - dress-only copy — every string is the shared neutral `detail.*` block, so
 *    the issue's recorded vocabulary must NOT appear;
 *  - and the terminal dress itself: one face, no raw hex, and the three motion
 *    primitives from `index.css` rather than a component-injected `<style>`.
 *
 * Harness note: `renderToStaticMarkup`, no DOM, no effects (SPEC-testing.md), so
 * `useFormFactor` is MOCKED rather than driven off a viewport. Light vs dark is a
 * pure `[data-theme]` cascade with no branch in this component, so there is
 * nothing here to assert about it; it is an eyeball check.
 */
import { describe, it, expect, vi } from "vitest";
import i18n from "../../../i18n";
import type { PraxisDetailState } from "../usePraxisDetail";
import type { DuelDetailOut, DuelStatus } from "../../../api/duel";
import { aCharacter, aCurrentUser, aDuel, aDuelSide, aPraxis } from "../../../test/fixtures";
import { CO_MEMBER, MEMBER, VOTERS, aPraxisDetailState, indexOf, skinRenderer } from "../../../test/praxisDetail";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "desktop" | "mobile" }));
vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

const PRAXIS = aPraxis({
  task_title: "Recover The Lost Array",
  task_faction_slug: "singularity",
  title: "Six Hours Of Uptime",
  body_text: "Rebuilt the index from the write-ahead log.",
  created_by_id: 3,
  created_by_display_name: "Ada",
  created_by_faction_slug: "singularity",
  members: [MEMBER],
});

const VIEWER = aCurrentUser({
  character: aCharacter({ faction_slug: "singularity", level: 4 }),
});

/** `praxis_id: 1` on the challenger is what makes that side "mine". */
const duel = (overrides: Partial<DuelDetailOut> = {}): DuelDetailOut =>
  aDuel({
    challenger: aDuelSide({ faction_slug: "singularity", points_from_votes: 18 }),
    opponent: aDuelSide({
      praxis_id: 2,
      character_id: 4,
      display_name: "Rax",
      faction_slug: "snide",
      points_from_votes: 15.4,
    }),
    ...overrides,
  });

const state = (overrides: Partial<PraxisDetailState> = {}): PraxisDetailState =>
  aPraxisDetailState({ praxis: PRAXIS, voters: VOTERS, ...overrides });

const render = skinRenderer("singularity", mocks);

describe("Singularity praxis detail — the inherited layout contract", () => {
  it("gives the desktop aside the eight designs' 330px track, not the outlier 340", () => {
    const wide = render(state());
    expect(wide.html, "the eight designs' aside track").toContain("0 0 330px");
    expect(wide.html, "the outlier width is absent").not.toContain("340px");

    // Mobile drops the TRACK, not its contents — the rail stacks into flow.
    expect(render(state(), "mobile").html, "no fixed track on mobile").not.toContain(
      "0 0 330px",
    );
  });

  it("shows the crown at BOTH form factors, never gated", () => {
    // ADR-0054: one canonical `TaskCrown`, keyed only on `is_top_for_task`.
    // Where a design hides it on mobile, show it anyway.
    // The mark is the score stamp's corner fleur now — #1710 retired the
    // hero banner. The score block is in both layouts, so it is still never
    // form-factor gated, and it is still the one canonical `TaskCrown`.
    const crown = `title="${i18n.t("feed:taskCrown.title")}"`;
    const crowned = state({ praxis: { ...PRAXIS, is_top_for_task: true } });
    expect(render(crowned, "desktop").html, "crown on desktop").toContain(crown);
    expect(render(crowned, "mobile").html, "crown on mobile too").toContain(crown);
    expect(render(state(), "mobile").html, "and only when crowned").not.toContain(
      crown,
    );
  });

  it("moves score and duel above the proof on mobile, into the aside on desktop", () => {
    const dueling = state({ duel: duel(), praxis: { ...PRAXIS, duel_id: 5 } });

    const wide = render(dueling);
    expect(wide.text.match(/Score/g)?.length, "one score block on desktop").toBe(1);
    expect(wide.text.match(/The duel/g)?.length, "one duel block on desktop").toBe(1);
    expect(indexOf(wide.html, "Proof"), "proof precedes the aside rail").toBeLessThan(
      indexOf(wide.html, "Score"),
    );

    const phone = render(dueling, "mobile");
    expect(phone.text.match(/Score/g)?.length, "one score block on mobile").toBe(1);
    expect(phone.text.match(/The duel/g)?.length, "one duel block on mobile").toBe(1);
    expect(indexOf(phone.html, "Score"), "rail rides above the proof").toBeLessThan(
      indexOf(phone.html, "Proof"),
    );
  });

  it("carries its ground on the column, never the viewport", () => {
    // WORLD_ZERO_STYLE §5 / #1028: the site background must still show around
    // the page. Six of eight task-detail skins shipped `fixed; inset: 0`.
    const { html } = render(state());
    expect(html, "no full-viewport ground").not.toContain("position:fixed");
    expect(html, "capped at the epic's page width").toContain("max-width:1200px");
  });

  it("mounts the comments region with the layout's heading, not the thread's", () => {
    const { text } = render(state());
    expect(text, "the layout's section head").toContain("Discussion");
    expect(text, "and not a second heading for the same list").not.toContain("0 comments");
  });

  it("hides the comment region on a praxis that is not visible", () => {
    const hidden = state({ praxis: { ...PRAXIS, moderation_status: "hidden" } });
    expect(render(hidden).text).not.toContain("Discussion");
  });

  it("draws no navigation of its own, at either width (#2102)", () => {
    // It drew a bespoke trail on desktop and swapped it for a back link to
    // /praxis on mobile. Both are gone: the breadcrumb is neutral site chrome
    // now, drawn once above this column by `components/nav/Breadcrumb`, and what
    // the trail CONTAINS is pinned in `pages/__tests__/breadcrumbAcrossSurfaces`
    // for every skin at both widths. What is left to say here is the negative.
    for (const factor of ["desktop", "mobile"] as const) {
      const { html } = render(state(), factor);
      const sheet = html.slice(html.indexOf("</nav>") + 1);
      expect(sheet, `${factor}: no crumb inside the surface`).not.toContain('href="/tasks"');
      expect(html, `${factor}: no phone back bar`).not.toContain('href="/praxis"');
    }
  });
});

describe("Singularity praxis detail — chrome stays outside the costume", () => {
  it("mounts the report card bare, on its own neutral surface", () => {
    // ADR-0061: moderation and system chrome are neutral in every
    // faction's dress. `PraxisFlagBlock` takes `state` only — there is no style
    // seam to dress it through — and it must still arrive on `.sidebar-card`.
    const { html } = render(state());
    expect(html, "the report card renders").toContain("Flag this praxis");
    expect(html, "on the shared neutral card chrome").toContain("sidebar-card");
  });

  it("keeps the steward bar and the moderation banners neutral", () => {
    expect(render(state()).text, "no steward bar for a visitor").not.toContain("ADMIN");
    const steward = render(state({ showAdminBar: true }));
    expect(steward.text, "the shared bar, unstyled by this skin").toContain("ADMIN");
    expect(steward.html, "on the shared neutral card chrome").toContain("sidebar-card");

    const flagged = render(state({ praxis: { ...PRAXIS, moderation_status: "flagged" } }));
    expect(flagged.text, "the flagged notice reads the shared neutral copy").toContain(
      "FLAGGED",
    );
    expect(flagged.html, "and the shared warning token").toContain("--color-warning");

    const failed = render(
      state({
        praxis: {
          ...PRAXIS,
          moderation_status: "failed",
          admin_note: "The log is from a different node.",
        },
      }),
    );
    expect(failed.text, "the admin note is the banner's body").toContain(
      "The log is from a different node.",
    );
  });
});

describe("Singularity praxis detail — dress only, copy neutral", () => {
  it("speaks the shared neutral detail block", () => {
    const { text } = render(state());
    expect(text).toContain("Proof");
    expect(text).toContain("Write-up");
    expect(text).toContain("Cast your vote");
    expect(text).toContain("Who voted");
    expect(text).toContain("Score");
  });

  it("prints none of the recorded faction vocabulary", () => {
    // #1122's owner ruling (2026-07-28): the voice is RECORDED, not built —
    // there is no `detail.singularity.*` block and this skin is dress only.
    const { text } = render(state({ isOwner: true, user: VIEWER }));
    expect(text.toLowerCase(), "the post verb stays the shared one").not.toContain(
      "transmit",
    );
    expect(text, "no invented node prefix on the byline").not.toContain("NODE_");
  });
});

describe("Singularity praxis detail — the terminal dress", () => {
  it("wears one face, and it is the faction's own token", () => {
    const { html } = render(state());
    expect(html, "Share Tech Mono via the faction token").toContain(
      "--faction-singularity-card-font",
    );
    // The kit's own metaphor, from tokens that already shipped.
    expect(html).toContain("--faction-singularity-term-bg");
    expect(html).toContain("--faction-singularity-term-bright");
  });

  it("draws the raster, the travelling sweep and the blinking caret", () => {
    const { html } = render(state());
    expect(html, "the standing raster").toContain("--faction-singularity-term-scan");
    expect(html, "the sweep gradient").toContain("--faction-singularity-term-sweep");
    expect(html, "and index.css owns its travel").toContain("sg-scan");
    expect(html, "the block cursor on the finding").toContain("sg-cursor");
    // #911: motion lives in index.css under the shared reduced-motion guard, so
    // no archetype injects a <style> block of its own.
    expect(html, "no component-injected keyframes").not.toContain("@keyframes");
  });

  it("paints no raw hex — every colour is a token", () => {
    // `SingularitySelectCard` used to carry grandfathered raw hex that the lint
    // rule could not see, through a module constant. #1609 retired it and #2326
    // moved the tile onto its task card's register, so the example is gone —
    // the rule it stood for is not, and a net-new file still owes this.
    const { html } = render(state());
    const hex = html.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hex, `raw hex in the markup: ${hex.join(", ")}`).toHaveLength(0);
  });

  it("paints the shared duel card in phosphor, through the seam and not a re-point", () => {
    // `DuelCard` used to paint its rows from `--faction-default-*`, which assumes
    // a sheet that is light in light theme; this chassis is near-black in BOTH,
    // so those inks landed at roughly 1:1 and the file overrode the tokens for
    // the subtree. #1153 gave the card an `ink` prop and the workaround came off
    // THIS mount: the same four phosphor values now arrive by contract.
    const dueling = state({ duel: duel(), praxis: { ...PRAXIS, duel_id: 5 } });
    const { html } = render(dueling);
    // The duellist's name and the side's total, in the bright phosphor.
    expect(html, "the rows are painted, not inherited").toContain(
      "color:var(--faction-singularity-term-bright)",
    );
    // The cross-link subtitle, the chevron and the verdict line.
    expect(html, "the quiet copy").toContain("color:var(--faction-singularity-term-dim)");
    // The hairlines between the rows and the verdict.
    expect(html, "the rules").toContain("1px solid var(--faction-singularity-term-hair)");
    // The seam replaced the re-point on THIS mount — the duel panel no longer
    // carries a `--faction-default-card-*` override. (`ON_CHASSIS_INK` survives
    // on the owner controls, the proof frame and the roster, which have no such
    // seam, so the token name is still elsewhere on the page.) Sliced from the
    // card's own `<section>` opener, not from its heading text, so the panel's
    // `style` attribute is inside the window being asserted on.
    const label = html.indexOf("The duel");
    expect(label, "the duel card rendered").toBeGreaterThan(-1);
    const card = html.slice(html.lastIndexOf("<section", label));
    expect(card, "the card itself carries no token re-point").not.toContain(
      "--faction-default-card-text:",
    );
    expect(html, "the spectrum ring is a you-are-here mark, left alone").not.toContain(
      "--faction-default-rainbow:",
    );
  });
});

describe("Singularity praxis detail — the state axes", () => {
  it("renders the score readout from the shared resolver", () => {
    const { text } = render(state());
    expect(text, "base").toContain("12");
    expect(text, "points from votes").toContain("4");
    expect(text, "total — through the shared formatter now, not a private two-decimal register (#1866)").toContain("16");
  });

  it("shows the multiplier row only when the factor is not 1.0", () => {
    expect(render(state()).text, "neutral era hides it").not.toContain("mult");
    const boosted = state({
      praxis: { ...PRAXIS, display_multiplier: 1.1, score: 17.2 },
    });
    expect(render(boosted).text).toContain("×1.10");
  });

  it("draws the duel card on a settled duel and nothing on a declined one", () => {
    const settled = state({ duel: duel(), praxis: { ...PRAXIS, duel_id: 5 } });
    const { text } = render(settled);
    expect(text, "the live reading, whole").toContain("leads by 2.6");
    expect(text, "the rival is a cross-link").toContain("Rax");

    const declined = state({
      duel: duel({ status: "declined" as DuelStatus }),
      praxis: { ...PRAXIS, duel_id: 5 },
    });
    expect(render(declined).text, "no card at all on declined").not.toContain("The duel");
  });

  it("credits every co-author and shows the members section on a published collab", () => {
    const solo = render(state());
    expect(solo.html, "solo links one author").toContain('href="/characters/3"');
    expect(solo.text, "and draws no members section").not.toContain("Members");

    const collab = state({
      praxis: { ...PRAXIS, type: "collab", members: [MEMBER, CO_MEMBER] },
    });
    const { html, text } = render(collab);
    expect(html, "each co-author is reachable").toContain('href="/characters/4"');
    expect(text).toContain("Beth");
    expect(text, "the crew reads as Members, the domain noun").toContain("Members");
    expect(
      html,
      "and the roster's cast-row fill is a lit well, not the faction's blue chrome",
    ).toContain("--faction-singularity-card-muted:var(--faction-singularity-term-panel)");
  });

  it("shows owner controls to a member and nothing to a visitor", () => {
    // #1397: the cluster is anchored on the UNSUBMIT control now. On a
    // submitted solo `/edit` redirects straight back to this page, so the edit
    // link is hidden and unsubmitting is the way into the composer.
    expect(render(state()).text, "a visitor gets no owner controls").not.toContain(
      "unsubmit",
    );
    const owner = state({ isOwner: true, user: VIEWER });
    expect(render(owner).text).toContain("unsubmit");
    expect(render(owner).html, "and nothing that round-trips").not.toContain(
      'href="/praxis/1/edit"',
    );
  });

  it("lists who voted and each voter's own rung, never an average", () => {
    const { html, text } = render(state());
    expect(text).toContain("Who voted");
    expect(html).toContain('href="/characters/11"');
    expect(text, "the count, not the mean").toContain("2 votes");

    const unvoted = state({ voters: [] });
    expect(render(unvoted).text, "no empty voter panel").not.toContain("Who voted");
  });

  it("renders the applied metatask seal read-only, with no add chip", () => {
    // `apply_metatask` requires `in_progress`, so the design's chips would 422.
    const { text } = render(state());
    expect(text).not.toContain("Add a metatask");
  });
});
