/**
 * Content-slot invariant guard (ADR-0002, #151): every registered archetype
 * emits the same CONTENT slots. Slots are convention-only, so this is the check.
 * Distinctive fixture values (id 7, 4242) keep substring checks from colliding.
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
import type { CommentComponent } from "../comments/shared";
import { aCharacter, aCurrentUser, aPraxisCard, aTask } from '../../test/fixtures'
import { AuthContext } from "../../auth/AuthContext";
import type { CurrentUser } from "../../api/auth";

function markup(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
  // Tag-stripped: some archetypes split the title across spans.
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
// Conditional slots, so each shape gets a fixture.

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

const SOLO_RICH = aPraxisCard({
  body_text: "Grew a whole canopy from a single seedling.",
  media_items: [IMAGE_MEDIA],
});

const COLLAB = aPraxisCard({
  type: "collab",
  member_count: 3,
  members: [member(3, "Ada"), member(4, "Græce"), member(5, "Kepler")],
  submit_proposed_at: "2026-01-03T00:00:00Z",
});

// A duel side is type='solo' + duel_id (ADR-0011), NOT type='duel'.
const DUEL: PraxisCardOut = { ...PRAXIS, type: "solo", duel_id: 42 };

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
 * #2366 — the byline prints no faction name; the sigil carries it (#2245 rule 1).
 * Fixtures are OFF-faction (same-faction never printed the tag); the Coven card
 * names itself in chrome, so its author is WOW. Asserted on stripped text: the
 * avatar's accessible name must survive.
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

// `na` is a row in the map (#2530), so no `__default__`.
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
// The author slot's universal anchor is the profile link.

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

/*
 * #2817 — every voice hides the owner row and flag from a signed-out viewer.
 * Positive cases first, so `not.toContain` can't pass vacuously. The four
 * hand-written per-suite copies stay until owner QA (epic #2814 phase 2).
 */
const EDIT_LABEL = `aria-label="${i18n.t("praxis:comments.edit")}"`;
const DELETE_LABEL = `aria-label="${i18n.t("praxis:comments.delete")}"`;
// Anchored on the text node to dodge ornaments spelling the same word.
const FLAG_BUTTON = `>${i18n.t("praxis:detail.flag.flag")}</button>`;

const AUTHOR = aCharacter({ id: COMMENT.author.id });
const ANOTHER_MEMBER = aCharacter({ id: COMMENT.author.id + 1 });

function asViewer(
  Comment: CommentComponent,
  character: CurrentUser["character"] | null,
): string {
  const user = character === null ? null : aCurrentUser({ character });
  return renderToStaticMarkup(
    <AuthContext.Provider
      value={{
        user,
        loading: false,
        refetch: async () => {},
        applyUser: () => {},
        signOut: async () => {},
      }}
    >
      <MemoryRouter>
        <Comment mode="row" comment={COMMENT} />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("comment voices gate the owner row and the flag on the viewer", () => {
  for (const [slug, Comment] of Object.entries(commentArchetypes)) {
    it(`${slug} shows no owner row and no flag affordance to a signed-out viewer`, () => {
      const own = asViewer(Comment, AUTHOR);
      expect(own, "positive case: the author gets the owner row").toContain(EDIT_LABEL);
      expect(own).toContain(DELETE_LABEL);

      const other = asViewer(Comment, ANOTHER_MEMBER);
      expect(other, "positive case: another member gets the flag").toContain(FLAG_BUTTON);

      const strangerToTheSite = asViewer(Comment, null);
      expect(strangerToTheSite, "no owner row").not.toContain(EDIT_LABEL);
      expect(strangerToTheSite, "no owner row").not.toContain(DELETE_LABEL);
      expect(strangerToTheSite, "no flag affordance").not.toContain(FLAG_BUTTON);
    });
  }
});
