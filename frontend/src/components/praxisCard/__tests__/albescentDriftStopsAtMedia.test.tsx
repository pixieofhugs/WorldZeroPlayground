/**
 * The Albescent drift stops at user media (#1646).
 *
 * ADR-0048 / #821 wash the light over the WHOLE sheet, and every Albescent
 * surface is built that way. This narrows it by one element: the proof photo is
 * the one thing on the sheet that is not the site's to tint. Everything else —
 * copy, score box, seals, footer, the empty slot's dashed drop-target — stays
 * chrome the drift colours.
 *
 * ## The seam
 *
 * THE STYLESHEET CONTRACT, read as source text, plus the class hooks the markup
 * has to emit for that contract to reach anything. The harness is
 * `renderToStaticMarkup` — no DOM, no layout, no computed styles — so nothing
 * here can measure an overlap or prove a photo came out untinted. What it can
 * prove is the two halves of the wiring:
 *
 *  1. a rule exists that raises `.user-media` above the drift's `z-index`, and
 *     it is SCOPED to the two Albescent wrappers rather than global;
 *  2. both surfaces actually emit `.user-media`, and the Albescent card emits
 *     the wrapper class the rule scopes on.
 *
 * Drop either and the other is decorative — a class nobody reads, or a rule
 * nothing matches. The picture itself is visual QA and is stated as outstanding
 * on the PR.
 *
 * ## Why a lift and not a hole
 *
 * There is no way to punch a blended overlay out around a rectangle. A blend
 * composites against what is already painted beneath it, so raising the media
 * above the wash is what excludes it. Hence the z-index floor below is derived
 * from the overlays' own declared values rather than typed in twice.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import { ruleBodies, stripComments } from "../../../utils/__tests__/cssVars";
import { aPraxis, aPraxisCard } from "../../../test/fixtures";
import type { AdminProps } from "../shared";
import type { MediaItemOut, PraxisCardOut } from "../../../api/praxis";
import type { PraxisDetailState } from "../../../pages/praxisDetail/usePraxisDetail";
import AlbescentPraxisCard from "../desktop/AlbescentPraxisCard";
import DefaultPraxisCard from "../desktop/DefaultPraxisCard";
import AlbescentPraxisDetail from "../../../pages/praxisDetail/archetypes/AlbescentPraxisDetail";

const css = stripComments(
  readFileSync(fileURLToPath(new URL("../../../index.css", import.meta.url)), "utf8"),
);

/** The highest `z-index` declared across a set of rule bodies. */
function topZ(bodies: string[]): number {
  const found = bodies.flatMap((body) => [...body.matchAll(/z-index\s*:\s*(-?\d+)/g)]);
  expect(found.length, "a z-index to clear").toBeGreaterThan(0);
  return Math.max(...found.map((m) => Number(m[1])));
}

const PHOTO: MediaItemOut = {
  id: 91,
  praxis_id: 55,
  type: "image",
  file_path: "proofs/estuary.png",
  display_order: 0,
  created_at: "2026-01-01T00:00:00Z",
};

const WITH_PHOTO = aPraxisCard({ media_items: [PHOTO] });
const NO_MEDIA = aPraxisCard({ media_items: [] });

function admin(praxis: PraxisCardOut): AdminProps {
  return {
    praxis,
    showAdminControls: false,
    onHide: () => {},
    onFail: () => {},
    moderateError: null,
  };
}

const render = (node: ReactElement) =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

/** Minimal read-only detail state; `aPraxis` already carries one image. */
function detailState(): PraxisDetailState {
  return {
    loading: false,
    praxis: aPraxis({ task_faction_slug: "albescent" }),
    fetchError: null,
    comments: null,
    voters: [],
    duel: null,
    isOwner: false,
    showAdminBar: false,
    user: null,
    withdrawing: false,
    showWithdrawConfirm: false,
    setShowWithdrawConfirm: () => {},
    withdrawError: null,
    adminFailNote: "",
    setAdminFailNote: () => {},
    showFailInput: false,
    setShowFailInput: () => {},
    moderating: false,
    moderateError: null,
    showFlagForm: false,
    setShowFlagForm: () => {},
    flagReason: null,
    setFlagReason: () => {},
    flagDetail: "",
    setFlagDetail: () => {},
    flagging: false,
    flagError: null,
    setFlagError: () => {},
    flagSubmitted: false,
    handleModerate: async () => {},
    handleWithdraw: async () => {},
    handleFlag: async () => {},
    handleKickMember: async () => {},
  };
}

describe("the stylesheet lifts user media above the Albescent drift (#1646)", () => {
  const SELECTORS = /\.alb-praxis-card\s+\.user-media\s*,\s*\.alb-praxis\s+\.user-media\s*\{/;
  const lift = ruleBodies(css, ".alb-praxis .user-media");

  it("both Albescent wrappers share one lift rule", () => {
    // The card scope and the detail scope, in one selector list — the whole
    // fix. `ruleBodies` matches the trailing selector of a list, so the leading
    // one is pinned by the regex.
    expect(css, "the scoped lift rule").toMatch(SELECTORS);
    expect(lift.length, ".alb-praxis .user-media rule must exist").toBeGreaterThan(0);
  });

  it("positions the media, which is what makes z-index apply at all", () => {
    for (const body of lift) {
      expect(body).toMatch(/position\s*:\s*relative/);
    }
  });

  it("clears every drift layer on both surfaces", () => {
    // Derived, not typed twice: `.alb-rainbow` sits at 0 on the card and the
    // three `.alb-praxis-*` ornaments at 2 on the detail. Retune either and
    // this fails rather than silently letting the wash back over the photo.
    const floor = Math.max(
      topZ(ruleBodies(css, ".alb-rainbow")),
      topZ(ruleBodies(css, ".alb-praxis-edge")),
    );
    for (const body of lift) {
      expect(topZ([body]), "media above the drift").toBeGreaterThan(floor);
    }
  });

  it("is scoped — no global .user-media rule reorders the other eight skins", () => {
    // `PraxisMediaGallery` is one component for all nine praxis archetypes and
    // `MediaGallery` serves the detail page, so an unscoped lift would ride
    // over skins that stack their own layers (Ephemerists' plate at 1,
    // Singularity's content at 2). Both mentions in the file are the one
    // scoped selector list.
    expect(css.match(/\.user-media/g) ?? []).toHaveLength(2);
  });

  it("sits at the top level, so reduced motion still stills the same layers", () => {
    // Not nested in `@media (prefers-reduced-motion: …)` or any other at-rule:
    // stilling the drift must not change which layer it covers.
    const at = css.search(SELECTORS);
    expect(at).toBeGreaterThan(-1);
    const head = css.slice(0, at);
    const depth =
      (head.match(/\{/g) ?? []).length - (head.match(/\}/g) ?? []).length;
    expect(depth, "brace depth before the rule").toBe(0);
  });

  it("leaves the detail's spectrum edge alone, which never reached the media", () => {
    // Of the detail's three ornaments only the aurora and the ring are washes
    // over the sheet; `.alb-praxis-edge` is masked back to the sheet's own 2px
    // perimeter, so it could not land on a photo and needs nothing here.
    const edge = ruleBodies(css, ".alb-praxis-edge").find((b) => /padding\s*:\s*2px/.test(b));
    expect(edge, "the edge rule").toBeDefined();
    expect(edge).toMatch(/content-box/);
  });
});

describe("both Albescent surfaces emit the hook the rule scopes on (#1646)", () => {
  it("the praxis card wraps its sheet in .alb-praxis-card", () => {
    const html = render(
      <AlbescentPraxisCard praxis={WITH_PHOTO} adminProps={admin(WITH_PHOTO)} />,
    );
    // A class LIST since #2404 put the shared spectrum frame on this same
    // wrapper, so the match is on the class rather than on the whole attribute.
    // Still exact — the word boundaries mean an `alb-praxis-cardigan` typo fails
    // here exactly as it did before.
    expect(html, "the scope the lift needs").toMatch(/class="[^"]*\balb-praxis-card\b/);
    expect(html, "the drift itself is untouched").toContain('class="alb-rainbow"');
    expect(html, "the media region").toContain("user-media");
  });

  it("the empty media slot is chrome, and keeps the drift", () => {
    // The dashed drop-target is the site's own furniture, not the player's, so
    // it carries no hook and the wash still crosses it.
    const html = render(
      <AlbescentPraxisCard praxis={NO_MEDIA} adminProps={admin(NO_MEDIA)} />,
    );
    expect(html).toMatch(/class="[^"]*\balb-praxis-card\b/);
    expect(html, "no lift on an empty slot").not.toContain("user-media");
  });

  it("the other eight skins get the hook but no scope, so nothing moves", () => {
    const html = render(
      <DefaultPraxisCard praxis={WITH_PHOTO} adminProps={admin(WITH_PHOTO)} />,
    );
    expect(html, "shared gallery, shared hook").toContain("user-media");
    expect(html, "and no Albescent scope above it").not.toContain("alb-praxis-card");
  });

  it("praxis detail mounts the gallery inside .alb-praxis", () => {
    const html = render(<AlbescentPraxisDetail state={detailState()} />);
    expect(html, "the detail's Albescent scope").toContain('class="alb-praxis"');
    expect(html, "the media region").toContain("user-media");
    expect(html, "the ornaments still mount").toContain("alb-praxis-aurora");
  });
});
