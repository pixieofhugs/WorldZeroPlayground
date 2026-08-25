/**
 * Content-slot invariant guard (ADR-0002, issue #151).
 *
 * Every per-faction surface — praxis card and task card — must render the same
 * CONTENT slots while looking wildly different. The slots are convention-only
 * (no rigid wrapper, by design — archetypes must stay free to *arrange* them),
 * so this test walks each dispatcher map and asserts every registered archetype
 * still emits the invariant slots. A new archetype that drops a slot fails here.
 *
 * We render to static markup (no DOM needed) and assert on the structural
 * anchors a slot leaves behind: the slot's text, and for the task link the
 * `/tasks/:id` href. Distinctive fixture values (id 7, points 4242, single-word
 * title) keep the substring checks from colliding with incidental markup.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { surfaceMap } from "../../factions";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import DefaultPraxisCard from "../praxisCard/desktop/DefaultPraxisCard";
import { DefaultComment } from "../comments/CommentThread";
import i18n from "../../i18n";
import { factionName } from "../../utils/factions";
import type { PraxisCardOut, PraxisMemberOut, MediaItemOut } from "../../api/praxis";
import type { CommentOut } from "../../api/comments";
import { aPraxisCard, aTask } from '../../test/fixtures'

function markup(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
  // Tag-stripped text — some archetypes split the title across spans (SNIDE's
  // ransom-note letters, the Ephemerists' lapis last-word), so the title slot
  // only reads contiguously once the wrapping tags are removed.
  return { html, text: html.replace(/<[^>]*>/g, "") };
}

// ─── Praxis cards ─────────────────────────────────────────────────────────────

const PRAXIS = aPraxisCard({
  id: 1,
  task_title: "Reforestation",
  task_point_value: 10,
  task_level_required: 1,
  title: "Photosynthesis",
  created_by_id: 3,
  created_by_display_name: "Ada",
  score: 4.2,
  points_from_votes: 0,
  task_faction_slug: "ua",
});

const PRAXIS_ADMIN = {
  praxis: PRAXIS,
  showAdminControls: false,
  onHide: () => {},
  onFail: () => {},
  moderateError: null,
};

// Default fallback is a registered renderable too — guard it alongside the map.
const praxisArchetypes = {
  ...surfaceMap('praxisCard'),
  __default__: DefaultPraxisCard,
};

describe("praxis-card content-slot invariant", () => {
  for (const [slug, Card] of Object.entries(praxisArchetypes)) {
    it(`${slug} renders title, task link, and score`, () => {
      const { html, text } = markup(
        <Card praxis={PRAXIS} adminProps={PRAXIS_ADMIN} />,
      );
      expect(text, "title slot").toContain("Photosynthesis"); // PraxisTitle
      expect(html, "task-link slot").toContain('href="/tasks/7"'); // PraxisTaskLink
      expect(html, "score slot").toContain("4.2"); // PraxisByline score
    });
  }
});

// ─── Task Crown stamp (ADR-0028) ─────────────────────────────────────────────
// Every archetype must stamp the crown on a crowned praxis, must not stamp an
// uncrowned one, and must yield when the surface (a faction page) renders its
// own corner medallion via showCrown={false}.

const CROWN_TITLE = "Task Crown — top praxis for this task";
const CROWNED = { ...PRAXIS, is_top_for_task: true };

describe("praxis-card Task Crown stamp", () => {
  for (const [slug, Card] of Object.entries(praxisArchetypes)) {
    it(`${slug} stamps the crown iff is_top_for_task`, () => {
      const crowned = markup(
        <Card praxis={CROWNED} adminProps={{ ...PRAXIS_ADMIN, praxis: CROWNED }} />,
      );
      expect(crowned.html, "crowned card").toContain(CROWN_TITLE);

      const plain = markup(<Card praxis={PRAXIS} adminProps={PRAXIS_ADMIN} />);
      expect(plain.html, "uncrowned card").not.toContain(CROWN_TITLE);

      const suppressed = markup(
        <Card
          praxis={CROWNED}
          adminProps={{ ...PRAXIS_ADMIN, praxis: CROWNED }}
          showCrown={false}
        />,
      );
      expect(suppressed.html, "surface renders its own crown").not.toContain(
        CROWN_TITLE,
      );
    });
  }
});

// ─── Content-parity slots (#587) ─────────────────────────────────────────────
// The desktop praxis card reached full content parity with the mobile card:
// every archetype must fold in the body excerpt, media gallery, crew roster,
// mode chip and inline vote footer (via the shared PraxisBody). These slots are
// conditional (roster/chip only on collab·duel; excerpt/media only when present),
// so we fixture each shape and assert every archetype renders them.

const IMAGE_MEDIA: MediaItemOut = {
  id: 91,
  praxis_id: 1,
  type: "image",
  file_path: "proofs/chlorophyll-leaf.png",
  display_order: 0,
  created_at: "2026-01-01T00:00:00Z",
};

function member(id: number, name: string): PraxisMemberOut {
  return {
    id,
    praxis_id: 1,
    character_id: id,
    character_display_name: name,
    character_avatar_url: "",
    has_submitted: true,
    is_done: false,
    joined_at: "2026-01-01T00:00:00Z",
    nudged_at: null,
    submitted_at: null,
  };
}

// Solo proof carrying a body excerpt + one image tile, no crew.
const SOLO_RICH = aPraxisCard({
  body_text: "Grew a whole canopy from a single seedling.",
  media_items: [IMAGE_MEDIA],
});

// Collab of three, mid pending-publish window.
const COLLAB = aPraxisCard({
  type: "collab",
  member_count: 3,
  members: [member(3, "Ada"), member(4, "Græce"), member(5, "Kepler")],
  submit_proposed_at: "2026-01-03T00:00:00Z",
});

// Duel side — a mode chip, no crew roster. A duel side is stored type='solo' +
// a non-null duel_id (ADR-0011, #992), NOT type='duel'; the chip gates on
// duel_id, so the fixture must carry it.
const DUEL: PraxisCardOut = { ...PRAXIS, type: "solo", duel_id: 42 };

// Four images → gallery caps at three tiles with a "+1" overflow badge.
const OVERFLOW = aPraxisCard({
  media_items: [
    IMAGE_MEDIA,
    { ...IMAGE_MEDIA, id: 92 },
    { ...IMAGE_MEDIA, id: 93 },
    { ...IMAGE_MEDIA, id: 94 },
  ],
});

const COLLAB_LABEL = i18n.t("common:collaborationCard.collaboration");
const DUEL_LABEL = i18n.t("common:collaborationCard.duel");
const PENDING_LABEL = i18n.t("common:collaborationCard.pending");

describe("praxis-card content-parity slots (#587)", () => {
  for (const [slug, Card] of Object.entries(praxisArchetypes)) {
    const render = (praxis: PraxisCardOut) =>
      markup(<Card praxis={praxis} adminProps={{ ...PRAXIS_ADMIN, praxis }} />);

    it(`${slug} renders the excerpt + a real media thumbnail`, () => {
      const { html, text } = render(SOLO_RICH);
      expect(text, "excerpt slot").toContain("Grew a whole canopy");
      expect(html, "media thumbnail").toContain("chlorophyll-leaf.png");
      expect(html, "image tile is an <img>").toContain("<img");
    });

    it(`${slug} caps the gallery at three tiles + a +N badge`, () => {
      const { text } = render(OVERFLOW);
      expect(text, "overflow badge").toContain("+1");
    });

    it(`${slug} shows the crew roster + collaboration chip on a collab`, () => {
      const { text } = render(COLLAB);
      expect(text, "roster names").toContain("Ada");
      expect(text, "roster names").toContain("Kepler");
      expect(text, "collaboration chip").toContain(COLLAB_LABEL);
      expect(text, "pending chip").toContain(PENDING_LABEL);
    });

    it(`${slug} shows the duel chip on a duel and no roster`, () => {
      const { text } = render(DUEL);
      expect(text, "duel chip").toContain(DUEL_LABEL);
    });

    it(`${slug} omits the roster + mode chip on a plain solo praxis`, () => {
      const { text } = render(PRAXIS);
      expect(text, "no collaboration chip on solo").not.toContain(COLLAB_LABEL);
      expect(text, "no duel chip on solo").not.toContain(DUEL_LABEL);
    });
  }
});

/*
 * #2366 — THE BYLINE WRITES NO FACTION NAME. It used to print the AUTHOR's own
 * faction at the far edge whenever that faction differed from the task's; the
 * owner deleted it (#2245 rule 1: the sigil beside a player's photo carries
 * membership on its own, no text). `FactionAvatar` sits immediately to the left
 * of the name and draws that same faction's sigil, so the tag was a second copy
 * of a fact already on the row.
 *
 * THE FIXTURE MUST BE OFF-FACTION OR IT PROVES NOTHING: on a same-faction card
 * the tag never rendered, so a praxis whose author matches the task would pass
 * against the old code too. Every fixture here is therefore an author faction
 * on a `ua` task, and the byline was the only site under `praxisCard/` that
 * ever called `factionName` — so a hit in the stripped text is this tag and
 * nothing else, WITH ONE EXCEPTION the author faction is picked to dodge: the
 * Coven card writes "Cozy Coven" in its own slip-sheet chrome, so on that one
 * archetype the author is a different faction again.
 *
 * Asserted on the TAG-STRIPPED text, not the markup: the faction still reaches
 * assistive technology through `FactionAvatar`'s own accessible name, which
 * lives in an attribute and must survive.
 */
describe("praxis-card byline prints no faction name (#2366)", () => {
  for (const [slug, Card] of Object.entries(praxisArchetypes)) {
    const authorSlug = slug === "coven" ? "wow" : "coven";
    const offFaction: PraxisCardOut = {
      ...PRAXIS,
      task_faction_slug: "ua",
      created_by_faction_slug: authorSlug,
    };

    it(`${slug} omits the author's faction name beside the portrait`, () => {
      const { text } = markup(
        <Card praxis={offFaction} adminProps={{ ...PRAXIS_ADMIN, praxis: offFaction }} />,
      );
      expect(text, "the author name still reads").toContain("Ada");
      expect(text, "no faction name in the byline").not.toContain(
        factionName(authorSlug),
      );
    });
  }
});

// ─── Task cards ───────────────────────────────────────────────────────────────

const TASK = aTask({
  point_value: 4242,
  level_required: 3,
  created_by: 3,
  primary_faction_slug: "ua",
  created_by_display_name: "",
});

// `na` is a row in the map since #2530, so there is no `__default__:` key to
// add beside it any more — the spectrum card is asserted under its own slug.
const taskArchetypes = surfaceMap('taskCard');

describe("task-card content-slot invariant", () => {
  for (const [slug, Card] of Object.entries(taskArchetypes)) {
    it(`${slug} renders title, task link, and points`, () => {
      const { html, text } = markup(
        <Card task={TASK} basePoints={4242} multiplier={1} inProgressCount={0} />,
      );
      expect(text, "title slot").toContain("Photosynthesis");
      expect(html, "task-link slot").toContain('href="/tasks/7"');
      expect(html, "points slot").toContain("4242");
    });
  }
});

// ─── Comment archetypes (ADR-0018) ──────────────────────────────────────────
// Every comment voice must render the invariant author-identity + body slots in
// row mode. The author slot's universal anchor is the link to the author's
// profile (some voices show the handle, some the display name — both link out).

const COMMENT: CommentOut = {
  id: 1,
  praxis_id: 7,
  task_id: null,
  body_text: "Photosynthesis",
  is_edited: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  author: {
    id: 3,
    username: "ada",
    display_name: "Adabel",
    avatar_url: "",
    faction_slug: "ua",
  },
  mentions: [],
};

const commentArchetypes = {
  ...surfaceMap('comment'),
  __default__: DefaultComment,
};

describe("comment content-slot invariant (row mode)", () => {
  for (const [slug, Comment] of Object.entries(commentArchetypes)) {
    it(`${slug} renders author identity and body`, () => {
      const { html, text } = markup(<Comment mode="row" comment={COMMENT} />);
      expect(html, "author-identity slot").toContain('href="/characters/3"');
      expect(text, "body slot").toContain("Photosynthesis");
    });
  }
});
