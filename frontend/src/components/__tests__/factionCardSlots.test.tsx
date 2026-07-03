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
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import { PRAXIS_CARD_BY_SLUG, DefaultPraxisCard } from "../PraxisCard";
import { CARD_COMPONENTS, DEFAULT_CARD } from "../TaskCard";
import { COMMENT_COMPONENTS, DefaultComment } from "../comments/CommentThread";
import type { PraxisCardOut } from "../../api/praxis";
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
  is_top_for_task: false,
  task_faction_slug: "ua",
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
  ...PRAXIS_CARD_BY_SLUG,
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

// ─── Task cards ───────────────────────────────────────────────────────────────

const TASK: TaskOut = {
  id: 7,
  title: "Photosynthesis",
  description: null,
  point_value: 4242,
  level_required: 3,
  status: "active",
  task_type: "standard",
  created_by: 3,
  primary_faction_slug: "ua",
  metatask_faction_slug: null,
  is_task_vision_eligible: false,
  created_at: "2026-01-01T00:00:00Z",
  can_submit_praxis: true,
  allowed_modes: ["solo"],
  eligible_for_current_user: true,
};

const taskArchetypes = {
  ...CARD_COMPONENTS,
  __default__: DEFAULT_CARD,
};

describe("task-card content-slot invariant", () => {
  for (const [slug, Card] of Object.entries(taskArchetypes)) {
    it(`${slug} renders title, task link, and points`, () => {
      const { html, text } = markup(<Card task={TASK} displayPoints={4242} />);
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
    avatar_url: null,
    faction_slug: "ua",
  },
  mentions: [],
};

const commentArchetypes = {
  ...COMMENT_COMPONENTS,
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
