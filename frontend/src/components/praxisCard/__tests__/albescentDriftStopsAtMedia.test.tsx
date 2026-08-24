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
 *  1. a rule exists that raises `.user-media` above the ornaments' `z-index`,
 *     and it is SCOPED to the four Albescent wrappers rather than global;
 *  2. those surfaces actually emit `.user-media`, and the Albescent card emits
 *     the wrapper class the rule scopes on;
 *  3. (#1942) the two STACKING TRAPS that made the lift inert on the feed and
 *     the task detail are cleared, and each is cleared Albescent-scoped.
 *
 * The third is the correction #1942 had to make to its own issue body. A
 * `z-index` only competes inside its own stacking context, so a lift that
 * resolves on two surfaces can be a no-op on a third — which is why the numbers
 * below are read from the ornaments' own rules and the traps are asserted by
 * name. The task detail's markup hooks are in `pages/taskDetail/__tests__` and
 * the feed's ornament mount in `components/__tests__/albescentFeedFrame`.
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
import type { CharacterOut } from "../../../api/auth";
import type { MediaItemOut, PraxisCardOut } from "../../../api/praxis";
import type { PraxisDetailState } from "../../../pages/praxisDetail/usePraxisDetail";
import FactionAvatar from "../../avatar/FactionAvatar";
import { DefaultComment } from "../../comments/CommentThread";
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
  const SELECTORS =
    /\.alb-praxis-card\s+\.user-media\s*,\s*\.alb-praxis\s+\.user-media\s*,\s*\.alb-detail\s+\.user-media\s*,\s*\.alb-feed\s+\.user-media\s*\{/;
  const lift = ruleBodies(css, ".alb-feed .user-media");

  it("all four Albescent wrappers share one lift rule", () => {
    // The praxis card, the praxis detail, the task detail and the feed card, in
    // one selector list — #1942 widened #1941's two to four rather than minting
    // a second mechanism. `ruleBodies` matches the trailing selector of a list,
    // so the leading three are pinned by the regex.
    expect(css, "the scoped lift rule").toMatch(SELECTORS);
    expect(lift.length, ".alb-feed .user-media rule must exist").toBeGreaterThan(0);
  });

  it("positions the media, which is what makes z-index apply at all", () => {
    for (const body of lift) {
      expect(body).toMatch(/position\s*:\s*relative/);
    }
  });

  it("clears every Albescent layer that still paints over content", () => {
    // Derived, not typed twice: the sparks sit at 0 on the praxis card, the
    // feed's ring at 1, and the `.alb-praxis-*` / `.alb-detail-*` ornaments at
    // 2. Retune any of them and this fails rather than silently letting light
    // back over the photo.
    //
    // #2499 took the four WASHES out of this list by moving them into the card's
    // own background, where a photograph is in front of them by construction.
    // The sparks replace `.alb-rainbow` as the praxis card's floor — they are
    // positioned at `z-index: 0`, which paints ABOVE non-positioned in-flow
    // content, so the lift is still doing work on that surface.
    const floor = Math.max(
      topZ(ruleBodies(css, ".alb-spark")),
      topZ(ruleBodies(css, ".alb-praxis-edge")),
      topZ(ruleBodies(css, ".alb-detail-edge")),
      topZ(ruleBodies(css, ".alb-feed-edge")),
    );
    for (const body of lift) {
      expect(topZ([body]), "media above the light").toBeGreaterThan(floor);
    }
  });

  it("is scoped — no global .user-media rule reorders the other eight skins", () => {
    // `PraxisMediaGallery` is one component for all nine praxis archetypes,
    // `MediaGallery` serves the detail page and the byline photo + the feed
    // avatar are the shared chassis's, so an unscoped lift would ride over skins
    // that stack their own layers (Ephemerists' plate at 1, Singularity's
    // content at 2). All four mentions in the file are the one scoped list.
    expect(css.match(/\.user-media/g) ?? []).toHaveLength(4);
  });

  it("clears the task detail's stacking trap, and only under .alb-detail", () => {
    // THE LIFT ALONE IS INERT HERE, which is what #1942's first attempt found.
    // `DefaultTaskDetail`'s 1200 column is positioned at `z-index: 1`, i.e. a
    // stacking context, so every descendant was capped at 1 while
    // `.alb-detail-aurora` washed from 2 — no number on the photo could reach
    // past it. `auto` un-caps the subtree without moving the sheet itself.
    expect(ruleBodies(css, ".task-detail-sheet")[0], "the shared column's own lift").toMatch(
      /z-index\s*:\s*1/,
    );
    const cleared = ruleBodies(css, ".alb-detail .task-detail-sheet");
    expect(cleared.length, "the Albescent-scoped clearing rule").toBe(1);
    expect(cleared[0]).toMatch(/z-index\s*:\s*auto/);
  });

  it("clears the feed avatar anchor's ceiling the same way", () => {
    // #1893's lift makes the avatar's anchor a stacking context at 1 — the same
    // level `.alb-feed-aurora` sits at, and earlier in the DOM, so the wash won.
    // The number had to leave the inline style to be overridable at all; the
    // value is unchanged for every other card.
    const anchor = ruleBodies(css, ".feed-avatar-link")[0];
    expect(anchor, "the anchor's lift, as a class").toBeDefined();
    expect(anchor).toMatch(/z-index\s*:\s*1/);
    expect(anchor, "still out of the flex row's shrink").toMatch(/flex-shrink\s*:\s*0/);
  });

  it("puts the relocated feed ornaments back on the card's border box", () => {
    // The two spans moved INSIDE `.sidebar-card` (its `backdrop-filter` makes it
    // a stacking context that nothing inside could escape). An absolutely
    // positioned child resolves against the PADDING box, so `inset: 0` would now
    // start one pixel in and the travelling ring would miss the hairline it is
    // meant to bring alive. The card's border is 1px.
    const ornaments = ruleBodies(css, ".alb-feed-edge").filter((body) =>
      /inset\s*:/.test(body),
    );
    expect(ornaments.length, "the feed ornaments' shared box").toBeGreaterThan(0);
    for (const body of ornaments) {
      expect(body, "offset back out to the border box").toMatch(/inset\s*:\s*-1px/);
    }
    expect(ruleBodies(css, ".sidebar-card")[0], "the 1px this compensates").toMatch(
      /border\s*:\s*1px/,
    );
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
    // The mask moved to the shared `.spectrum-frame::before` list in #2407 — one
    // ring for all six mounts — so what proves it is still masked back to a 2px
    // perimeter is the pairing: this rule's inset, that rule's exclude idiom.
    // `ruleBodies` matches a selector only where nothing follows it before the
    // brace, which is why the shared list ends on `.spectrum-frame::before`.
    expect(ruleBodies(css, ".spectrum-frame::before")[0], "the shared ring").toMatch(
      /content-box/,
    );
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
    // The ground is a class on this same wrapper since #2499, not a span.
    expect(html, "the light itself is untouched").toMatch(/class="[^"]*\balb-prism\b/);
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
    expect(html, "the detail's Albescent scope").toContain('class="alb-praxis alb-moves alb-prism"');
    expect(html, "the media region").toContain("user-media");
    expect(html, "the ornaments still mount").toContain("alb-praxis-ring");
  });
});

/**
 * #2457 — the three photographs the live QA on #2456 found still under the wash.
 *
 * ## The seam is `FactionAvatar`, not the three mounts
 *
 * All three route through one component. The praxis-card byline draws
 * `<FactionAvatar size={28}>`; the comment composer draws
 * `<FactionAvatar size="sm">`; and the reason the issue measured 28, 24 and 20
 * for what look like three different elements is that the `na` skin insets its
 * photo by a 2px spectrum ring. So the hook lands ONCE, in `FactionAvatar`, and
 * every mount under an Albescent wrapper is fixed together — including the
 * praxis-card byline on the praxis list, on praxis detail and on the feed, which
 * is the half of the defect wider than the page it was found on. There is no
 * per-surface markup to check because there is no per-surface markup.
 *
 * ## Why the hook rides the DISC and not the `<img>`
 *
 * Unlike every earlier site (#1941's gallery, #1942/#2456's two plain `<img>`s),
 * this photograph is not alone in its box: the membership sigil is an absolutely
 * positioned sibling clipped to the photo's lower-right, and at the byline's 28px
 * the photo's own edge passes almost exactly through the badge's centre — about
 * half the badge lies over the picture.
 *
 * That makes `photo > wash > badge` UNSATISFIABLE. The badge already paints above
 * the photo (it is a positioned later sibling, and its ring is drawn to read as a
 * cut-out against the face); this issue requires the photo above the wash; and
 * `badge > photo > wash` forces `badge > wash`. Lifting the bare `<img>` would
 * satisfy #1646's furniture rule to the letter and slice the sigil in half on
 * every faction avatar under an Albescent wash — a new defect, not a fix.
 *
 * So the hook goes on the avatar's root disc, which is what `MediaGallery` and
 * `PraxisMediaGallery` already do: `.user-media` marks a REGION that is the
 * player's. The sigil welded onto a photograph rides up with it; the deviation
 * bought is a 15% multiply over a 12-14px disc. And the hook is CONDITIONAL on
 * there being a photograph at all, so a monogram disc — its generated initial,
 * its spectrum ring and its sigil, all the site's own furniture — carries no hook
 * and keeps the wash entire. That is #1646 intact everywhere furniture stands on
 * its own.
 *
 * No CSS changed: the count asserted above is still four, because the lift rule
 * is the one #1941/#1942 already wrote.
 */
describe("the avatar disc a photograph sits on carries the hook (#2457)", () => {
  const FACE: CharacterOut = {
    id: 42,
    username: "ada",
    display_name: "Adabel",
    avatar_url: "avatars/adabel.png",
    faction_slug: "na",
    bio: "",
    tagline: "",
    location: "",
    level: 3,
    score: 0,
    all_time_score: 0,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    badges: [],
    invitations: [],
  };

  const composer = (character: CharacterOut) =>
    render(
      <DefaultComment
        mode="composer"
        character={character}
        value=""
        onChange={() => {}}
        onSubmit={() => {}}
        submitting={false}
      />,
    );

  it("wraps the photograph AND its sigil, because the two cannot be separated", () => {
    const html = render(<FactionAvatar character={FACE} size={28} />);
    // The disc's own root is the hook: it opens the markup, so everything the
    // avatar draws — the photo and the corner sigil that overlaps it — is inside
    // one lifted box and keeps the order it was designed in.
    expect(html, "the hook opens the disc").toMatch(/^<span class="user-media"/);
    expect(html, "the photograph is inside it").toContain("avatars/adabel.png");
    // The corner sigil badge, by the offset that puts it ON the face — the
    // overlap that makes `photo > wash > badge` unsatisfiable in the first place.
    expect(html, "and so is the sigil stamped on it").toContain(
      "position:absolute;right:-3px;bottom:-3px",
    );
    // Once, on the disc — the `<img>` is deliberately NOT hooked a second time,
    // which is what keeps the sigil above the face.
    expect(html.match(/user-media/g) ?? [], "exactly one hook").toHaveLength(1);
  });

  it("leaves a monogram disc unhooked — furniture keeps the wash (#1646)", () => {
    const html = render(
      <FactionAvatar character={{ ...FACE, avatar_url: "" }} size={28} />,
    );
    expect(html, "the generated initial").toContain("A");
    expect(html, "no photograph, no lift").not.toContain("user-media");
  });

  it("lifts the praxis-card byline everywhere that card renders", () => {
    // `media_items: []`, so the only `.user-media` this card can emit is the
    // byline's — the gallery hook #1941 shipped is not in play.
    const praxis = aPraxisCard({
      media_items: [],
      created_by_avatar_url: "avatars/quill.png",
    });
    const html = render(
      <AlbescentPraxisCard praxis={praxis} adminProps={admin(praxis)} />,
    );
    expect(html, "the scope the lift needs").toMatch(/class="[^"]*\balb-praxis-card\b/);
    expect(html, "the author's own face").toContain("avatars/quill.png");
    expect(html.match(/user-media/g) ?? [], "the byline disc, hooked").toHaveLength(1);
  });

  it("lifts the comment composer's own photograph", () => {
    // The composer is mounted inside `.alb-detail` by the task detail page
    // (`pages/taskDetail/__tests__/albescentDetail`) and inside `.alb-praxis` by
    // praxis detail, so the hook here reaches the lift on both.
    expect(composer(FACE), "the viewer's face").toContain("user-media");
    expect(
      composer({ ...FACE, avatar_url: "" }),
      "a monogram composer keeps the wash",
    ).not.toContain("user-media");
  });

  it("does not reorder the other eight skins — the hook is inert off Albescent", () => {
    // Same avatar, no Albescent wrapper anywhere above it: the class is emitted
    // and nothing matches it, which is the whole design of a scoped lift.
    const praxis = aPraxisCard({
      media_items: [],
      created_by_avatar_url: "avatars/quill.png",
    });
    const html = render(
      <DefaultPraxisCard praxis={praxis} adminProps={admin(praxis)} />,
    );
    expect(html, "shared avatar, shared hook").toContain("user-media");
    expect(html, "and no Albescent scope above it").not.toContain("alb-praxis-card");
  });
});
