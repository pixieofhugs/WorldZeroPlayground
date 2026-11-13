/**
 * The Albescent drift stops at user media (#1646): the proof photo is the one
 * thing on the sheet that isn't the site's to tint. A blend can't be holed, so
 * the media is LIFTED above the wash. SSR can't measure overlap, so this pins
 * the wiring: a scoped lift rule above the ornaments' z-index, the markup hooks
 * it scopes on, and (#1942) the two stacking traps cleared Albescent-scoped.
 * Task-detail hooks: `pages/taskDetail/__tests__`; feed: `albescentFeedFrame`.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import { ruleBodies, stripComments } from "../../../utils/__tests__/cssVars";
import { aPraxis, aPraxisCard } from "../../../test/fixtures";
import { stripResourceHints } from "../../../test/ssrMarkup";
import type { AdminProps } from "../shared";
import type { CharacterOut } from "../../../api/auth";
import type { MediaItemOut, PraxisCardOut } from "../../../api/praxis";
import type { PraxisDetailState } from "../../../pages/praxisDetail/usePraxisDetail";
import FactionAvatar from "../../avatar/FactionAvatar";
import { DefaultComment } from "../../comments/CommentThread";
import AlbescentPraxisCard from "../desktop/AlbescentPraxisCard";
import DefaultPraxisCard from "../desktop/DefaultPraxisCard";
import AlbescentPraxisDetail from "../../../pages/praxisDetail/archetypes/AlbescentPraxisDetail";
import AlbescentScoreStamp from "../scoreStamp/AlbescentScoreStamp";
import type { StampablePraxis } from "../scoreStamp/ScoreStamp";
import { readIndexCss } from "../../../test/indexCss";

const css = stripComments(
  readIndexCss(),
);

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
  stripResourceHints(renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>));

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
    // `ruleBodies` matches only a list's trailing selector; the regex pins the rest.
    expect(css, "the scoped lift rule").toMatch(SELECTORS);
    expect(lift.length, ".alb-feed .user-media rule must exist").toBeGreaterThan(0);
  });

  it("positions the media, which is what makes z-index apply at all", () => {
    for (const body of lift) {
      expect(body).toMatch(/position\s*:\s*relative/);
    }
  });

  it("clears every Albescent layer that still paints over content", () => {
    // Derived from the ornaments' own z-index. `topZ` throws on an empty set, so
    // a deleted ornament can't silently lower the floor (washes left in #2499,
    // sparks in #2555; `.alb-praxis-card-edge` stands in for the card).
    const floor = Math.max(
      topZ(ruleBodies(css, ".alb-praxis-card-edge")),
      topZ(ruleBodies(css, ".alb-praxis-edge")),
      topZ(ruleBodies(css, ".alb-detail-edge")),
      topZ(ruleBodies(css, ".alb-feed-edge")),
    );
    for (const body of lift) {
      expect(topZ([body]), "media above the light").toBeGreaterThan(floor);
    }
  });

  it("is scoped — no global .user-media rule reorders the other eight skins", () => {
    // The galleries and avatar are shared by all nine skins, some of which stack
    // their own layers; all four mentions must be the one scoped list.
    expect(css.match(/\.user-media/g) ?? []).toHaveLength(4);
  });

  it("clears the task detail's stacking trap, and only under .alb-detail", () => {
    // The shared column at `z-index: 1` is a stacking context capping the photo
    // below `.alb-detail-aurora` (2); `auto` un-caps it under Albescent.
    expect(ruleBodies(css, ".task-detail-sheet")[0], "the shared column's own lift").toMatch(
      /z-index\s*:\s*1/,
    );
    const cleared = ruleBodies(css, ".alb-detail .task-detail-sheet");
    expect(cleared.length, "the Albescent-scoped clearing rule").toBe(1);
    expect(cleared[0]).toMatch(/z-index\s*:\s*auto/);
  });

  it("clears the feed avatar anchor's ceiling the same way", () => {
    // #1893's anchor is a stacking context at 1, same as the earlier-in-DOM
    // aurora; the value lives in a class so it can be overridden.
    const anchor = ruleBodies(css, ".feed-avatar-link")[0];
    expect(anchor, "the anchor's lift, as a class").toBeDefined();
    expect(anchor).toMatch(/z-index\s*:\s*1/);
    expect(anchor, "still out of the flex row's shrink").toMatch(/flex-shrink\s*:\s*0/);
  });

  it("puts the relocated feed ornaments back on the card's border box", () => {
    // The spans sit inside `.sidebar-card` (a stacking context via
    // `backdrop-filter`); abs-pos resolves to the padding box, so `-1px`
    // offsets the 1px border.
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
    const at = css.search(SELECTORS);
    expect(at).toBeGreaterThan(-1);
    const head = css.slice(0, at);
    const depth =
      (head.match(/\{/g) ?? []).length - (head.match(/\}/g) ?? []).length;
    expect(depth, "brace depth before the rule").toBe(0);
  });

  it("leaves the detail's spectrum edge alone, which never reached the media", () => {
    // `.alb-praxis-edge` is masked to the sheet's 2px perimeter: this rule's
    // inset plus the shared `.spectrum-frame::before` exclude (#2407).
    const edge = ruleBodies(css, ".alb-praxis-edge").find((b) => /padding\s*:\s*2px/.test(b));
    expect(edge, "the edge rule").toBeDefined();
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
    // A class list (#2404); word boundaries keep the match exact.
    expect(html, "the scope the lift needs").toMatch(/class="[^"]*\balb-praxis-card\b/);
    expect(html, "the light itself is untouched").toMatch(/class="[^"]*\balb-prism\b/);
    expect(html, "the media region").toContain("user-media");
  });

  it("the empty media slot is chrome, and keeps the drift", () => {
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
 * #2457 — avatar photos under the wash. All mounts route through `FactionAvatar`,
 * so the hook lands once. It rides the DISC, not the `<img>`: the sigil badge
 * overlaps the photo, so `photo > wash > badge` is unsatisfiable and lifting the
 * bare img would slice the sigil. Conditional on a photo: a monogram disc is
 * furniture and keeps the wash. No CSS changed (still four `.user-media`).
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
    expect(html, "the hook opens the disc").toMatch(/^<span class="user-media"/);
    expect(html, "the photograph is inside it").toContain("avatars/adabel.png");
    expect(html, "and so is the sigil stamped on it").toContain(
      "position:absolute;right:-3px;bottom:-3px",
    );
    // Not on the `<img>` too, which keeps the sigil above the face.
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
    // No media items, so the only hook is the byline's.
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
    // Mounted under `.alb-detail` and `.alb-praxis`, so this reaches both lifts.
    expect(composer(FACE), "the viewer's face").toContain("user-media");
    expect(
      composer({ ...FACE, avatar_url: "" }),
      "a monogram composer keeps the wash",
    ).not.toContain("user-media");
  });

  it("does not reorder the other eight skins — the hook is inert off Albescent", () => {
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

/**
 * #2634 — `AlbescentScoreStamp` is `DefaultScoreStamp` + `.alb-stamp .alb-moves`,
 * so na-sheet restructures land here unreviewed. `albescentSpectraMove.test.tsx`
 * checks the rule is childless in SOURCE; this checks the RENDER (#2543): the
 * rule must be EMPTY (for `:empty`) and POSITIONED (so the travelling `::before`
 * doesn't paint over the plate).
 */
describe("the Albescent stamp's rule still travels after #2634's restructure", () => {
  const ruleSpan = (html: string) =>
    html.match(/<span[^>]*class="spectrum-rule"[^>]*>(<\/span>)?/)?.[0] ?? "";

  const stamp = (overrides: Record<string, unknown>) =>
    renderToStaticMarkup(
      <AlbescentScoreStamp
        praxis={
          {
            task_point_value: 12,
            display_multiplier: 1,
            metatask_points: 0,
            points_from_votes: 0,
            habit_bonus_points: 0,
            is_top_for_task: false,
            task_faction_slug: "albescent",
            moderation_status: "visible",
            score: 12,
            ...overrides,
          } as StampablePraxis
        }
      />,
    );

  /** The states #2634 moved rows between; any could end up inside the span. */
  const STATES = {
    "+ metatask": { metatask_points: 20, score: 32 },
    "+ votes": { points_from_votes: 4, score: 16 },
    "+ habit": { habit_bonus_points: 5, score: 17 },
    "× mult, which also draws the subtotal": { display_multiplier: 0.8, score: 9.6 },
  };

  it("wraps the na sheet and nothing else — the wrapper is the whole delta", () => {
    expect(stamp({}), "the marker the cascade scopes on").toMatch(
      /class="alb-stamp alb-moves"/,
    );
  });

  for (const [name, fields] of Object.entries(STATES)) {
    it(`leaves the rule childless and positioned — ${name}`, () => {
      const span = ruleSpan(stamp(fields));
      expect(span, "the rule is drawn in this state").not.toBe("");
      // React never self-closes a span, so childless renders as `…></span>`.
      expect(span, "childless, so `:empty` reaches it").toMatch(/><\/span>$/);
      expect(span, "a containing block for the travelling ::before").toContain(
        "position:relative",
      );
    });
  }

  it("draws exactly one, so the ramp cannot travel twice on one plate", () => {
    // ADR-0083 §3b: one carrier per object. The subtotal's rule is a plain
    // `-card-line` hairline, not a spectrum.
    for (const fields of Object.values(STATES)) {
      const html = stamp(fields);
      expect(html.split("spectrum-rule").length - 1, "one rule").toBe(1);
      expect(html.split("spectrum-dial").length - 1, "one dial").toBe(1);
    }
  });

  it("draws none at all on a bare praxis, where there is no working to rule off", () => {
    // ADR-0076: base-only prints no breakdown.
    expect(stamp({}), "no rule").not.toContain("spectrum-rule");
    expect(stamp({}), "the dial still turns").toContain("spectrum-dial");
  });
});
