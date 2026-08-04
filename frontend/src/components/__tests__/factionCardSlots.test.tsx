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
import { DEFAULT_CARD } from "../taskCard/TaskCard";
import { DefaultComment } from "../comments/CommentThread";
import i18n from "../../i18n";
import { factionName } from "../../utils/factions";
import type { PraxisCardOut, PraxisMemberOut, MediaItemOut } from "../../api/praxis";
import type { TaskOut } from "../../api/tasks";
import type { CommentOut } from "../../api/comments";

function markup(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
  // Tag-stripped text — some archetypes split the title across spans (SNIDE's
  // ransom-note letters, the Ephemerists' lapis last-word), so the title slot
  // only reads contiguously once the wrapping tags are removed.
  return { html, text: html.replace(/<[^>]*>/g, "") };
}

// ─── Praxis cards ─────────────────────────────────────────────────────────────

const PRAXIS: PraxisCardOut = {
  id: 1,
  task_id: 7,
  task_title: "Reforestation",
  task_point_value: 10,
  task_level_required: 1,
  type: "solo",
  status: "submitted",
  title: "Photosynthesis",
  moderation_status: "visible",
  created_by_id: 3,
  created_by_display_name: "Ada",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  submitted_at: "2026-01-02T00:00:00Z",
  member_count: 1,
  score: 4.2,
  voter_count: 0,
  metatask_points: 0,
  display_multiplier: 1.0,
  points_from_votes: 0,
  habit_bonus_points: 0,
  is_top_for_task: false,
  task_faction_slug: "ua",
  applied_metatasks: [],
  body_text: null,
  created_by_avatar_url: "",
  created_by_faction_slug: null,
  duel_id: null,
  media_items: [],
  members: [],
  opponent_display_name: null,
  opponent_faction_slug: null,
  opponent_praxis_id: null,
  submit_proposed_at: null,
  viewer_can_vote: true,
  viewer_vote: null,
  voted_by_name: null,
};

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
    has_submitted: true,
    joined_at: "2026-01-01T00:00:00Z",
    nudged_at: null,
    submitted_at: null,
  };
}

// Solo proof carrying a body excerpt + one image tile, no crew.
const SOLO_RICH: PraxisCardOut = {
  ...PRAXIS,
  body_text: "Grew a whole canopy from a single seedling.",
  media_items: [IMAGE_MEDIA],
};

// Collab of three, mid pending-publish window.
const COLLAB: PraxisCardOut = {
  ...PRAXIS,
  type: "collab",
  member_count: 3,
  members: [member(3, "Ada"), member(4, "Græce"), member(5, "Kepler")],
  submit_proposed_at: "2026-01-03T00:00:00Z",
};

// Duel side — a mode chip, no crew roster. A duel side is stored type='solo' +
// a non-null duel_id (ADR-0011, #992), NOT type='duel'; the chip gates on
// duel_id, so the fixture must carry it.
const DUEL: PraxisCardOut = { ...PRAXIS, type: "solo", duel_id: 42 };

// Four images → gallery caps at three tiles with a "+1" overflow badge.
const OVERFLOW: PraxisCardOut = {
  ...PRAXIS,
  media_items: [
    IMAGE_MEDIA,
    { ...IMAGE_MEDIA, id: 92 },
    { ...IMAGE_MEDIA, id: 93 },
    { ...IMAGE_MEDIA, id: 94 },
  ],
};

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

// The byline surfaces the author's OWN faction only when it differs from the
// task faction (the frame already carries the task faction's voice).
describe("praxis-card byline author faction (#587)", () => {
  const OFF_FACTION: PraxisCardOut = {
    ...PRAXIS,
    task_faction_slug: "ua",
    created_by_faction_slug: "snide",
  };
  const SAME_FACTION: PraxisCardOut = {
    ...PRAXIS,
    task_faction_slug: "ua",
    created_by_faction_slug: "ua",
  };

  it("shows the author faction when it differs from the task faction", () => {
    const { text } = markup(
      <DefaultPraxisCard praxis={OFF_FACTION} adminProps={{ ...PRAXIS_ADMIN, praxis: OFF_FACTION }} />,
    );
    expect(text).toContain(factionName("snide"));
  });

  it("omits the author faction when it matches the task faction", () => {
    const { text } = markup(
      <DefaultPraxisCard praxis={SAME_FACTION} adminProps={{ ...PRAXIS_ADMIN, praxis: SAME_FACTION }} />,
    );
    // The UA name should not appear as a byline tag (only the task faction voice).
    expect(text).not.toContain(`· ${factionName("ua")}`);
  });
});

// ─── Task cards ───────────────────────────────────────────────────────────────

const TASK: TaskOut = {
  id: 7,
  title: "Photosynthesis",
  description: '',
  point_value: 4242,
  level_required: 3,
  status: "active",
  task_type: "standard",
  created_by: 3,
  primary_faction_slug: "ua",
  metatask_faction_slug: null,
  created_at: "2026-01-01T00:00:00Z",
  in_progress_count: 0,
  created_by_display_name: "",
  created_by_avatar_url: "",
  created_by_faction_slug: null,
  created_by_level: 0,
  signup_reason: null,
  can_sign_up: true,
  allowed_modes: ["solo"],
  eligible_for_current_user: true,
};

const taskArchetypes = {
  ...surfaceMap('taskCard'),
  __default__: DEFAULT_CARD,
};

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
