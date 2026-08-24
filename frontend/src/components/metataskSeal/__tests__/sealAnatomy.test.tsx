/**
 * ONE ANATOMY FOR ALL NINE SEALS (#2562).
 *
 * ## The seam
 *
 * The RENDERED MARKUP of a dispatched seal. Nine skins paint nine different
 * stickers and that is the point of the kit; what the owner ruled is that the
 * three fields stop landing in nine different places. So every assertion below
 * is about ANATOMY — which shared drawings a seal mounts and where its controls
 * sit — and never about a skin's paint, which stays each skin's own.
 *
 * Three things hold for every issuing faction:
 *
 *  1. THE HEADER IS THE CARD KITS' MASTHEAD. `data-card-masthead="<slug>"` is
 *     `CardMasthead`'s own hook and no skin can emit it by accident, so this is
 *     the assertion that a seal MOUNTS the shared band rather than drawing a
 *     ninth lookalike — the failure mode `CardMasthead`'s docstring names ("seven
 *     agents each inventing this shape yields seven slightly different
 *     mastheads"). It also has to be the ISSUING faction's, because a seal is a
 *     foreign sticker: a WOW card can carry a Snide seal.
 *  2. THE BONUS IS A FIGURE OVER A CAPTION, which is the score stamp's anatomy
 *     and the reason `detail.seal.bonus` split into two keys. The retired
 *     one-line "+N PTS" must be gone from all nine at once — a skin left behind
 *     still renders, and renders the old shape.
 *  3. THE PEEL CONTROL IS A SIBLING OF THE BAND, never inside it. The band is an
 *     anchor (#2167) and the `×` is a button; nesting them is invalid HTML and
 *     puts a control inside a link's hit box. The `×` moved onto the band's
 *     top-right in this issue, which is exactly the move that makes the mistake
 *     easy — so it is asserted rather than assumed.
 *
 * The per-faction ornament that STOOD DOWN is asserted at the end, by name. A
 * mark that was removed and quietly re-added is a "does it render" test's blind
 * spot, and two of these (WOW's wax dot, Everymen's rubber stamp) are the
 * reported defect itself.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";

import "../../../i18n";
import i18n from "../../../i18n";
import MetataskSeal from "../MetataskSeal";
import { factionName } from "../../../utils/factions";
import type { TaskOut } from "../../../api/tasks";

const POINTS = 10;

function metatask(slug: string): TaskOut {
  return {
    id: 7,
    title: "Do the task in space",
    description: "",
    point_value: POINTS,
    level_required: 1,
    status: "active",
    task_type: "metatask",
    created_by: 1,
    primary_faction_slug: "na",
    metatask_faction_slug: slug,
    created_at: "2026-01-01T00:00:00Z",
    in_progress_count: 0,
    created_by_display_name: "",
    created_by_avatar_url: "",
    created_by_faction_slug: null,
    created_by_level: 0,
    signup_reason: null,
    in_progress_praxis_id: null,
    can_sign_up: false,
    allowed_modes: [],
    eligible_for_current_user: false,
    start_here: false,
  };
}

function seal(slug: string, removable = false): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <MetataskSeal
        metatasks={[metatask(slug)]}
        removable={removable}
        onRemove={removable ? () => {} : undefined}
      />
    </MemoryRouter>,
  );
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * Every issuing faction a metatask can carry — INCLUDING the two that mount no
 * masthead anywhere else in the kit. Banding `na` and `albescent` is the owner's
 * ruling on this issue and it is scoped to this surface; ADR-0048 still holds on
 * the task card and the praxis card, where `cardMasthead/factionBands.tsx`
 * exports no band for either.
 */
const ISSUERS = [
  "na",
  "albescent",
  "coven",
  "ephemerists",
  "everymen",
  "singularity",
  "snide",
  "ua",
  "wow",
] as const;

describe.each(ISSUERS)("the %s seal wears the one anatomy (#2562)", (slug) => {
  it("mounts the shared masthead, once, for the ISSUING faction", () => {
    expect(occurrences(seal(slug), `data-card-masthead="${slug}"`)).toBe(1);
  });

  it("the band names the issuing faction", () => {
    expect(seal(slug)).toContain(factionName(slug));
  });

  it("draws the bonus as a figure over a POINTS caption", () => {
    const html = seal(slug);
    // The `+` stays: a metatask bonus is an ADDEND, where a score stamp's total
    // is not. Without it the seal claims the praxis is worth ten points.
    expect(html).toContain(i18n.t("praxis:detail.seal.bonusFigure", { points: POINTS }));
    expect(html).toContain(i18n.t("praxis:card.stamp.points", { count: POINTS }));
  });

  it("no longer prints the retired one-line bonus", () => {
    // The key is gone from the catalog, so `t()` would echo the key back — the
    // literal is what a skin left behind would still be rendering.
    expect(seal(slug)).not.toContain(`+${POINTS} PTS`);
  });

  it("hangs the peel control OUTSIDE the band's anchor", () => {
    const html = seal(slug, true);
    const removeLabel = i18n.t("praxis:detail.seal.remove");
    const control = html.indexOf(`aria-label="${removeLabel}"`);
    expect(control, "the × is rendered when removable").toBeGreaterThan(-1);
    const bandCloses = html.indexOf("</a>");
    expect(bandCloses, "the band is an anchor").toBeGreaterThan(-1);
    expect(control, "the × sits after the band closes").toBeGreaterThan(bandCloses);
  });

  it("omits the peel control where no surface asks for one", () => {
    expect(seal(slug)).not.toContain(i18n.t("praxis:detail.seal.remove"));
  });
});

describe("the ornament that stood down (#2562)", () => {
  it("WOW no longer stamps a plum wax dot in the mark's corner", () => {
    // THE REPORTED DEFECT. The disc was the only `border-radius:50%` on this
    // seal, so its absence is the whole assertion — and it cannot come back as
    // a differently-painted disc without failing here.
    expect(seal("wow")).not.toContain("border-radius:50%");
  });

  it("Everymen keeps the cog and drops the rubber-stamp treatment", () => {
    const html = seal("everymen");
    expect(html, "the shared cog is the mark").toContain("<circle cx=\"12\" cy=\"12\" r=\"3\"");
    expect(html, "the crooked strike").not.toContain("rotate(-8deg)");
    expect(html, "the ink-into-paper blend").not.toContain("mix-blend-mode:multiply");
  });

  it("UA's lotus wax disc stands out of the mark's way", () => {
    expect(seal("ua")).not.toContain("var(--faction-ua-card-lotus)");
  });

  it("the Ephemerists' winged disc stands down for the band's own mark", () => {
    // Two faction marks on one seal is what `CardMasthead` exists to prevent;
    // the band's sigil is the mark now, so the slip's overlapping disc goes and
    // the 58px left gutter it held goes with it.
    expect(seal("ephemerists")).not.toContain("var(--faction-ephemerists-plate-band)");
  });
});
