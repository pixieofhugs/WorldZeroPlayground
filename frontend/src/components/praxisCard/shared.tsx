import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { CharacterOut } from "../../api/auth";
import { UNSCORED_MODERATION_STATUSES, type PraxisCardOut } from "../../api/praxis";
import { factionCssVar } from "../../utils/factions";
import { isDuelPraxis } from "../../utils/praxis";
import { mediaUrl } from "../../utils/media";
import FactionAvatar from "../avatar/FactionAvatar";
import VoteUI from "../vote/VoteUI";

/**
 * Praxis-card shared building blocks.
 *
 * Each faction's praxis card owns a bespoke FRAME (tilted memo, ruled paper,
 * scrap collage, torn evidence, vellum leaf, terminal, gazette…). The CONTENT
 * inside is broken into independently-placeable structural slots — `PraxisTitle`,
 * `PraxisTaskLink`, `PraxisStats`, `PraxisByline` — so an
 * archetype can arrange them (via the shared `PraxisBody` composition in
 * PraxisCard.tsx) instead of only re-coloring one fixed block. The dispatch stays
 * a true per-faction dispatch rather than chrome-only.
 */

/**
 * Roster-name helper — the crew names shown on a collaboration card, capped so a
 * large crew doesn't overflow the card. Returns up to `cap` display names plus
 * the overflow count (the "+N more" tail). Shared by the collaboration surface
 * (#587) and the praxis card (#573) — it was put here rather than copied into
 * the mobile tree so both read the same cap, and it outlived that tree
 * (ADR-0067).
 */
export const ROSTER_NAME_CAP = 7

/**
 * The two faces a desktop praxis card writes in (#888) — the same split the
 * mobile slots have carried since #573 as `MobileSlotTheme.displayFont` /
 * `bodyFont`. Ported here because desktop never got the seam: `shared.tsx` had
 * no `fontFamily` at all, so every faction's card read in Courier Prime no
 * matter what its own frame declared.
 *
 * It is a PAIR on purpose, not one resolved `--faction-{slug}-card-font`. A
 * single font collapses the split, and several card fonts are display faces
 * that stop being readable at paragraph length — S.N.I.D.E.'s is Permanent
 * Marker, which is a fine byline and an unreadable two-line excerpt.
 *
 * Both values are optional: a slot given nothing keeps its `font-*` class, so
 * an archetype that has no opinion is unchanged.
 */
export interface PraxisCardFonts {
  /** The identity face — author name, title, mode chip. */
  display?: string;
  /** The reading face — task line, excerpt, meta line. */
  body?: string;
}

/**
 * THE SHEET'S FUNCTIONAL INKS (#1302) — what a state colour is on faction paper.
 *
 * Everything in this module renders INSIDE a faction's praxis-card frame, so
 * every state colour it sets lands on cream, vellum, papyrus, a pink ward panel
 * or one of two near-black plates — never on the app's near-white page, which is
 * the ground `--color-danger` / `--color-warning` / `--color-success` were chosen
 * against. Painted here they failed AA on all eight sheets in light, at their
 * worst 1.96:1 (the green collab chip on S.N.I.D.E.'s plate).
 *
 * This is the third instance of the shape #694 and #1168 already fixed twice —
 * for the collab roster and for the duel seal dialogs — and the answer is theirs,
 * not a new one: the card ink family already carries a per-sheet ink for each
 * role, measured against the faction's own stock in both themes, and
 * `factionCssVar` dispatches it off the same slug `PraxisCard` dispatches the
 * archetype off (`task_faction_slug`). `na`, `albescent` and any unregistered
 * slug land on the `default` block, which is the sheet `DefaultPraxisCard`
 * paints, so the fallback is the right answer rather than a near miss.
 *
 * Deepening the global tokens was the rejected lever, twice over: they are read
 * as inks in ~30 places against the neutral page (#1169), and it cannot work
 * anyway — six sheets flip with the theme while S.N.I.D.E.'s and Singularity's
 * are dark in BOTH, so no single light-theme value clears #fbf4e0 and #050f08.
 * A colour that must differ between two factions inside one theme is a faction
 * token however functional the word for it sounds (WORLD_ZERO_STYLE §3).
 *
 * TWO ATTENTION INKS, NOT ONE (#1449). `-card-notice` used to be the family's
 * whole attention role, so danger and warning printed the same colour here: the
 * flagged and failed badges (mutually exclusive) and the hide/fail controls
 * (side by side) lost their red/amber severity cue. That flattening shipped
 * with a `ponytail:` naming the upgrade path, and the owner took it — nothing
 * was owed to WCAG 1.4.1, since each of the four carries its own word, but an
 * admin scanning a moderation queue is doing exactly the at-a-glance triage
 * colour exists for, and this is the one surface in the app where two alarm
 * states sit adjacent. Compliance was never the problem; misclicking
 * hide-versus-fail at speed was.
 *
 * WHICH MARK TAKES WHICH IS NOT A FRESH JUDGEMENT, and that is worth saying
 * because the two words could be argued either way. Every mark below already
 * wears #1169's `-veil` and `-edge` rungs — `--color-danger-*` behind the
 * flagged badge and the `hide` button, `--color-warning-*` behind the failed
 * badge and `fail` — and that split is the exact red/amber assignment their INK
 * carried before #1302 routed it through one token. So `alarm` goes where the
 * danger veil already is and `notice` stays where the warning veil is: the ink
 * rejoins its own wash rather than crossing it, and no mark ends up a red fill
 * under an amber ink. Change one of these and change its veil in the same edit.
 */
function sheetInk(slug: string | null | undefined): {
  /** Cautionary — the failed badge, the `fail` control, the mode chip's duel/pending marks. */
  notice: string;
  /** Destructive — the flagged badge, the `hide` control, a failed moderation call. */
  alarm: string;
  credit: string;
  muted: string;
} {
  return {
    notice: factionCssVar(slug, "card-notice"),
    alarm: factionCssVar(slug, "card-alarm"),
    credit: factionCssVar(slug, "card-credit"),
    muted: factionCssVar(slug, "card-muted"),
  };
}

/**
 * A badge's own wash or rule, mixed from the ink printed on it (#1302).
 *
 * The alphas are #1169's `-veil` / `-edge` rungs said about a per-faction ink
 * instead of a global one, and 8% is deliberately BELOW the 12% the mode chip
 * shipped: a wash made of the ink's own hue only ever pulls the ground toward
 * the ink, so it can only tighten the reading, and 12% cost the Ephemerists
 * plate its margin (4.41:1, against 4.66:1 at 8% and 5.20:1 on the bare sheet).
 * If you raise it, re-run `factionContrast.test.ts` — that plate is the row that
 * moves first.
 */
function inkWash(ink: string, percent: number): string {
  return `color-mix(in srgb, ${ink} ${percent}%, transparent)`;
}

export function rosterNames(
  members: { display_name?: string | null }[],
  cap = ROSTER_NAME_CAP,
): { names: string[]; overflow: number } {
  const names = members
    .slice(0, cap)
    .map((member) => member.display_name ?? "")
  const overflow = Math.max(0, members.length - cap)
  return { names, overflow }
}

/**
 * Slot: the praxis title, linked to the praxis detail page.
 *
 * An `<h2>`, and the one place that is decided for all nine archetypes — every
 * skin composes this through `desktop/shared`'s `PraxisBody`. A card is a
 * top-level item of whatever page mounts it and cannot see whether a section
 * heading sits between it and the page `<h1>`, so it takes level 2 and never
 * assumes one does (#1950). As an `<h3>` it skipped a level on `/praxis` in
 * both form factors and in all eight task-detail praxis galleries.
 */
export function PraxisTitle({
  praxis,
  style,
  fonts,
}: {
  praxis: PraxisCardOut;
  style?: CSSProperties;
  fonts?: PraxisCardFonts;
}) {
  return (
    <Link to={`/praxis/${praxis.id}`}>
      <h2
        className="content-title font-display font-semibold leading-tight hover:underline"
        style={{
          marginBottom: "var(--space-sm)",
          fontFamily: fonts?.display,
          ...style,
        }}
      >
        {praxis.title}
      </h2>
    </Link>
  );
}

/** Slot: the task this praxis completes, linked to the task detail page. */
export function PraxisTaskLink({
  praxis,
  style,
  lead,
  fonts,
}: {
  praxis: PraxisCardOut;
  style?: CSSProperties;
  fonts?: PraxisCardFonts;
  /**
   * An optional un-linked run-in before the task title (#840). Some factions
   * write this line as a sentence rather than a bare reference — WOW's chronicle
   * reads "for the quest — {task}". It sits OUTSIDE the anchor on purpose: the
   * faction's own framing is not part of the link's accessible name.
   */
  lead?: string;
}) {
  if (!lead) {
    return (
      <Link
        to={`/tasks/${praxis.task_id}`}
        className="font-body hover:underline"
        style={{ fontSize: "var(--text-content)", fontFamily: fonts?.body, ...style }}
      >
        {praxis.task_title}
      </Link>
    );
  }
  return (
    <span
      className="font-body"
      style={{ fontSize: "var(--text-content)", fontFamily: fonts?.body, ...style }}
    >
      <span style={{ marginRight: "var(--space-xs)" }}>{lead}</span>
      <Link to={`/tasks/${praxis.task_id}`} className="hover:underline" style={{ color: "inherit" }}>
        {praxis.task_title}
      </Link>
    </span>
  );
}

/**
 * A face on this card as the shared avatar surface wants them (#888).
 *
 * `FactionAvatar` reads only username / avatar_url / faction_slug off a
 * `CharacterOut`; a card payload carries those three under different names, so
 * pad the rest. Mirrors `comments/shared.tsx`'s `authorToCharacter` — reusing
 * the one avatar convention (portrait, else monogram, else spectrum ring) is
 * the point, so the card never grows a placeholder of its own.
 *
 * `display_name` stands in for `username` deliberately: it is what the byline
 * shows, so it is what the monogram initial and the img alt should follow.
 *
 * `id` is padded with 0 for the rival (#2128): the card payload carries no
 * character id for them, and no avatar skin reads it — the field is `CharacterOut`
 * shape, not data this surface has or needs.
 */
function faceAsCharacter(face: {
  id: number;
  name: string;
  avatarUrl: string | null | undefined;
  factionSlug: string | null | undefined;
}): CharacterOut {
  return {
    id: face.id,
    username: face.name,
    display_name: face.name,
    avatar_url: face.avatarUrl || "",
    // Unaffiliated is a slug, not a missing one (ADR-0030), and `CharacterOut`
    // says so now that it IS the generated type (#1400).
    faction_slug: face.factionSlug ?? "na",
    bio: "",
    tagline: "",
    location: "",
    level: 0,
    score: 0,
    all_time_score: 0,
    status: "active",
    created_at: "",
    badges: [],
    invitations: [],
  };
}

function authorAsCharacter(praxis: PraxisCardOut): CharacterOut {
  return faceAsCharacter({
    id: praxis.created_by_id,
    name: praxis.created_by_display_name || `#${praxis.created_by_id}`,
    avatarUrl: praxis.created_by_avatar_url,
    factionSlug: praxis.created_by_faction_slug,
  });
}

/**
 * The byline portrait's diameter. An argument to `FactionAvatar`'s own size API
 * (which takes `'sm' | 'md' | px`), not a style value — it sits between the two
 * named steps because the byline wants a face bigger than the roster's 24 and
 * smaller than a profile's 32.
 */
const BYLINE_PORTRAIT_SIZE = 28;

/**
 * Slot: the author byline (dashed rule on top) — portrait, then name.
 *
 * THE ROW HAS ONE CHILD (#2366). Two things have been deleted off its far
 * edge. First the praxis TOTAL (#888, closing #663): the score stamp is the
 * card's sole owner of that number, and a card that states its total twice
 * invites the reader to check whether the two agree. Then the author's faction
 * TAG, which had inherited that vacated edge — the owner deleted it under
 * #2245 rule 1, "the sigil beside a player's photo carries membership on its
 * own, no text". `FactionAvatar`, one element to the left, draws exactly that
 * sigil, so the tag was a second copy of a fact already on the row; it printed
 * only when the author's faction differed from the task's, which is why a
 * same-faction card looks unchanged.
 *
 * `justify-content: space-between` and the row `gap` are kept and are now
 * inert BY DESIGN, not by oversight: a lone flex item under space-between sits
 * at the start, which is precisely where the name group sat with the tag
 * present. Swapping in `flex-start` would repaint nothing and cost the nine
 * archetypes their byte-identical markup.
 *
 * The faction has NOT left the row for assistive technology — it reaches a
 * screen reader through `FactionAvatar`'s own accessible name, which is where
 * it always came from. No `aria-label` was touched.
 *
 * The portrait led the name's right-hand side and now LEADS the row (#2309,
 * owner ruling on the Ephemerists card): a face before a name is how every
 * other byline on the site reads. Source order is the whole change — the row
 * is a plain flex line that sets no `order` — plus the side the name's own
 * separation padding sits on.
 *
 * THE RULE ON TOP IS A SLOT NOW (#2312). It was `border-top: 1px dashed
 * currentColor 30%` and nothing else, which is right on eight sheets and wrong
 * on the Ephemerists plate: that kit rules its divisions with its own rune
 * strip, and drawing a generic dashed line there put a ninth mark on a card
 * whose every other rule is drawn. So the border became `divider` — pass a node
 * and it is painted in the border's place, pass nothing and the border is
 * exactly what it was.
 *
 * OPTIONAL, AND THE OPTIONALITY IS LOAD-BEARING. Eight archetypes and the
 * design-sync previews compose this without knowing the prop exists, and the
 * absent branch writes `undefined` into the same key at the same position —
 * React's style serializer skips it — so their markup is byte-identical rather
 * than merely equivalent. `praxisCard/__tests__/bylineDivider.test.tsx` holds
 * all nine to that.
 */
export function PraxisByline({
  praxis,
  style,
  fonts,
  divider,
}: {
  praxis: PraxisCardOut;
  style?: CSSProperties;
  fonts?: PraxisCardFonts;
  /**
   * The faction's own mark, drawn in place of the dashed rule (#2312). It
   * renders as this slot's previous sibling — the rule was the row's TOP
   * border, so its replacement sits above the row — and the row's own
   * `margin-top` / `padding-top` still carry the air on either side of it.
   */
  divider?: ReactNode;
}) {
  const authorHref = `/characters/${praxis.created_by_id}`;
  const authorName = praxis.created_by_display_name || `#${praxis.created_by_id}`;
  /*
   * #2125 — an anchor whose destination is the page you are already on is not a
   * broken link, it is a link that should not have been an anchor: it takes the
   * underline, the pointer and focus, and then does nothing, and a screen
   * reader still announces it as a link. So on the author's OWN character page
   * the name is plain text; everywhere else it stays a link. Not a "self"
   * variant, and NOT a disabled anchor — dropping the `<a>` is what fixes the
   * announcement.
   *
   * The test is destination-vs-location, character to character. Deliberately
   * NOT account-to-account: a player viewing their own OTHER character's page
   * is looking at a different page, and going there is meaningful (the ruling
   * says so explicitly). Comparing the whole path rather than a bare id also
   * keeps the link alive on `/praxis/7` when the author happens to be #7.
   */
  const here = useLocation().pathname.replace(/\/+$/, "");
  const onAuthorsOwnPage = here === authorHref;
  // Shared by both branches so the two render identically apart from the
  // anchor: how the name yields, and the padding that keeps it off the glyphs
  // (#1633 — that 8px lives here rather than as `gap` on the row because a
  // display face's final glyph can carry ink past its own advance width, and
  // the Ephemerists card sets this line in Poiret One). With the portrait now
  // leading the row (#2309) the same 8px is the name's INLINE-START padding:
  // it flipped side, it did not become a `gap`, because what it buys is a
  // glyph's overhang and that belongs to the name.
  //
  // #2132 — THE NAME WRAPS; it used to ellipsize, and the ellipsis was the
  // defect. `overflow: hidden` + `white-space: nowrap` is a bound on how the
  // name PAINTS and, deliberately, on nothing else: a nowrap string's
  // min-content size is its whole rendered width, and `min-width: auto` — the
  // initial value, so the value of every flex item nobody thought about —
  // floors an item at its content-based minimum size. So a 22-character name
  // did not overflow this row. It inflated the row, the card, and the profile
  // body's card wrapper, out past the viewport, until it met the first ancestor
  // carrying an explicit bound; the reporter filed it as the embedded VIDEO
  // overflowing, because the media slot was dragged along with everything else.
  // The `min-width: 0` on the row below was correct and bought nothing — it
  // only ever bites once an ancestor has a width to shrink against.
  //
  // `overflow-wrap: anywhere` is what actually fixes it, and the repo already
  // reaches for it (~30 sites) wherever it prints text a player typed. It takes
  // min-content to a single character, so no ancestor can be inflated by a name
  // on any surface, at any length, including the ones not written yet. NOT
  // `break-word`, which paints identically and does NOT reduce min-content —
  // the two differ in exactly the property this bug is about.
  //
  // The Ephemerists kit's `overflow: visible` + `text-overflow: clip` is still
  // the wrong port and for the same reason as ever: with nothing to break at,
  // the name stops yielding and paints over the portrait and the faction tag.
  // Wrapping yields, which is what that pair was buying.
  const nameStyle: CSSProperties = {
    fontFamily: fonts?.display,
    overflowWrap: "anywhere",
    paddingInlineStart: "var(--space-sm)",
  };
  return (
    <>
      {divider}
      <div
        className="flex justify-between items-center font-body"
        style={{
          // Byline chrome sits at the TOP of the label tier (14px), not its floor
          // (8px). The name itself overrides up to the content tier below.
          fontSize: "var(--text-xl)",
          marginTop: "var(--space-sm)",
          paddingTop: "var(--space-sm)",
          // A percentage of the ink already on the card, not a mid-grey hedge
          // (#1609). The byline is mounted inside nine faction frames whose
          // grounds run from cream to near-black, so a fixed rgba(128,128,128)
          // was the one value that could not be right on any of them — and it
          // could not flip. `currentColor` is the frame's own
          // `--faction-*-card-text`, which every archetype already sets on the
          // sheet, so one rule serves every faction and both cascades.
          //
          // `undefined` rather than a branch around the key (#2312): React's
          // style serializer skips an undefined value, so a card that passes no
          // `divider` emits the same declaration at the same position it always
          // did — byte-identical, not merely equivalent.
          borderTop: divider
            ? undefined
            : "1px dashed color-mix(in srgb, currentColor 30%, transparent)",
          gap: "var(--space-sm)",
          ...style,
        }}
      >
        {/*
         * No `gap` here on purpose (#1633) — the separation from the portrait is
         * carried as padding on the name itself. See `nameStyle` above.
         */}
        <span className="flex items-center" style={{ minWidth: 0 }}>
          <FactionAvatar
            character={authorAsCharacter(praxis)}
            size={BYLINE_PORTRAIT_SIZE}
          />
          {/*
           * A person's name is readable text, not scanned chrome: content tier
           * (18px). It ties the task link's size, and separates from it by
           * weight and by the faction's own display face instead. `hover:underline`
           * is the only thing the link branch adds — a name that goes nowhere
           * must not offer one.
           */}
          {onAuthorsOwnPage ? (
            <span className="content-text font-semibold" style={nameStyle}>
              {authorName}
            </span>
          ) : (
            <Link
              to={authorHref}
              className="content-text font-semibold hover:underline"
              style={nameStyle}
            >
              {authorName}
            </Link>
          )}
        </span>
      </div>
    </>
  );
}

/**
 * Slot: the "voted by {name}" marker (#644 §7). Renders when another character
 * on the viewer's ACCOUNT voted on this praxis. Account-scoped, so it can appear
 * even when the carried character has no star of its own (`viewer_vote` null) —
 * the intended display. Renders nothing when `voted_by_name` is absent.
 */
export function PraxisVotedByMarker({
  praxis,
  style,
}: {
  praxis: PraxisCardOut;
  style?: CSSProperties;
}) {
  const { t } = useTranslation("praxis");
  if (!praxis.voted_by_name) return null;
  return (
    <div className="label-caption" style={{ marginTop: "var(--space-sm)", opacity: 0.75, ...style }}>
      {t("card.votedBy", { name: praxis.voted_by_name })}
    </div>
  );
}

/**
 * Slot: level + base points + collaboration mode + date — the meta line.
 *
 * The level is never conditional (#888). It used to be gated on
 * `task_level_required > 0`, so a level-0 task dropped it and the separator
 * count changed card to card — a ragged line across a wall of cards. `L0` is a
 * real answer to "what does this need?", so it renders.
 *
 * The POINTS segment is the one exception, for the opposite reason (#1833, and
 * now #2114): it drops whenever the stamp beside it is printing that figure.
 * #1833 read "printing" as `total === base` — the stamp restating the task's
 * value as its own total — which left `L0 · 10 pts` sitting under a stamp whose
 * BASE row already said `10` on every card a vote had touched. The owner's
 * ruling on #2114 is the wider form of the same rule: the stamp states the base
 * either as a labelled row or, when nothing has moved it, as the total itself,
 * so wherever a stamp is MOUNTED the meta figure is a second printing. On a
 * 110px text column that restatement cost a quarter of the line.
 *
 * What survives from #1833 is its first clause, and it is the whole predicate
 * now: `ScoreStamp` renders nothing on a praxis that banked no points (#1444),
 * and on those two states the meta figure is the only points readout the card
 * has left. So the segment tracks the STAMP's presence rather than a comparison
 * between two figures. Praxis DETAIL keeps `stampRestatesTaskPoints` — its task
 * reference is a different line on a page with room for it.
 */
export function PraxisStats({
  praxis,
  style,
  fonts,
}: {
  praxis: PraxisCardOut;
  style?: CSSProperties;
  fonts?: PraxisCardFonts;
}) {
  const { t } = useTranslation("praxis");
  const collaborators = praxis.member_count - 1;
  const submittedDate = praxis.submitted_at
    ? new Date(praxis.submitted_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;
  return (
    <div
      className="flex items-center gap-2 font-body"
      style={{ fontSize: "var(--text-xl)", fontFamily: fonts?.body, ...style }}
    >
      {/* No `opacity` on either of the two quiet segments (#1675). The meta line
          already inherits the card's MUTED ink — 6.05:1 light, 5.44:1 dark — so
          the 0.75/0.65 washes were muting a muted token, and they dropped the
          level to 3.48:1 and the date to 2.84:1 on every faction in both themes.
          Clearing AA here would have taken 0.88, which is not a visible mute at
          all; the hierarchy the wash was reaching for is the token's job. */}
      <span style={{ fontWeight: 600 }}>
        {t("card.level", { level: praxis.task_level_required })}
      </span>
      {UNSCORED_MODERATION_STATUSES.has(praxis.moderation_status) && (
        <>
          <span aria-hidden>·</span>
          <span style={{ fontWeight: 700 }}>
            {t("card.points", { points: praxis.task_point_value, count: praxis.task_point_value })}
          </span>
        </>
      )}
      <span aria-hidden>·</span>
      <span>{collaborators > 0 ? t("card.crew", { count: collaborators }) : t("card.solo")}</span>
      {submittedDate && (
        <>
          <span aria-hidden>·</span>
          <span>{submittedDate}</span>
        </>
      )}
    </div>
  );
}

/**
 * Every node the parser can emit, resolved to plain inline text (#2578).
 *
 * The card printed `body_text` straight into the clamp, so a body written in
 * markdown arrived as its SOURCE — `## ****I be this is invalid****` is the
 * report. Meanwhile every praxis DETAIL page renders the same field through
 * `MarkdownPreview`, so one body read two ways depending on the surface.
 *
 * Owner ruling: rendering it AS markdown is not the fix either. A `##` would
 * become a heading and a list a `<ul>`, inside a two-line clamp, inside a card
 * that is itself a link — and a nested `<a>` is invalid HTML rather than merely
 * untidy. So the real parser runs and its output is flattened.
 *
 * WHY THE PARSER AND NOT A REGEX. A hand-rolled stripper is a second markdown
 * implementation, and it would disagree with remark on exactly the input that
 * produced this report: `****…****` is malformed emphasis, and two parsers
 * resolve malformed emphasis differently. Going through remark makes the card's
 * reading of a body identical to the detail page's BY CONSTRUCTION rather than
 * by maintenance. That property is the whole point; it is not available at any
 * level of care from a regex.
 *
 * Blocks emit a trailing space so `## Title` followed by a paragraph does not
 * read `TitleBody`. Anchors keep their words and drop their href. An image
 * resolves to its alt text — that IS its text — and fetches nothing. `hr` and
 * the GFM task-list checkbox have no text, so they leave nothing behind.
 */
/** A block: its text, then a space, so two blocks never read as one word. */
const Block = ({ children }: { children?: ReactNode }) => <>{children} </>;
/** An inline wrapper: its text and nothing else. */
const Inline = ({ children }: { children?: ReactNode }) => <>{children}</>;

/*
 * Written out one tag at a time on purpose. A loop over the tag list assigning
 * into `Components` makes TypeScript widen across every key of
 * `JSX.IntrinsicElements` at once and it gives up: `TS2590: Expression produces
 * a union type that is too complex to represent`. The literal is longer and
 * completely boring, which is the trade to take here — and a tag the parser can
 * emit that is missing from this list simply renders as itself, which the tests
 * catch rather than the types.
 */
const FLATTENED: Components = {
  p: Block,
  h1: Block,
  h2: Block,
  h3: Block,
  h4: Block,
  h5: Block,
  h6: Block,
  blockquote: Block,
  li: Block,
  pre: Block,
  tr: Block,
  th: Block,
  td: Block,
  a: Inline,
  em: Inline,
  strong: Inline,
  del: Inline,
  code: Inline,
  ul: Inline,
  ol: Inline,
  table: Inline,
  thead: Inline,
  tbody: Inline,
  tfoot: Inline,
  br: () => <> </>,
  hr: () => null,
  input: () => null,
  img: ({ alt }) => <>{alt}</>,
};

/** Slot: a 1–2 line body-text excerpt, clamped. Renders nothing without body. */
export function PraxisExcerpt({
  praxis,
  style,
  fonts,
}: {
  praxis: PraxisCardOut;
  style?: CSSProperties;
  fonts?: PraxisCardFonts;
}) {
  if (!praxis.body_text) return null;
  return (
    <p
      className="card-description font-body"
      style={{
        fontFamily: fonts?.body,
        marginTop: "var(--space-sm)",
        marginBottom: "0",
        lineHeight: 1.5,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        ...style,
      }}
    >
      <Markdown remarkPlugins={[remarkGfm]} components={FLATTENED}>
        {praxis.body_text}
      </Markdown>
    </p>
  );
}

/**
 * A round avatar disc — the person's portrait, ringed in the frame accent, and
 * their first initial when they have no portrait (#2318).
 *
 * Deliberately NOT `collab/RosterAvatar`, which is a different component with
 * the same name: that one is 34px and draws a TWO-letter monogram, and adopting
 * it here would change the fallback on all nine card archetypes. This is the
 * card's own dress; only the portrait is new.
 */
function RosterAvatar({
  name,
  avatarUrl,
  accent,
  paper,
}: {
  name: string;
  /** Raw wire path. Empty or absent falls back to the initial. */
  avatarUrl?: string | null;
  accent: string;
  paper?: string;
}) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  if (avatarUrl) {
    return (
      <img
        aria-hidden
        alt=""
        src={mediaUrl(avatarUrl)}
        style={{
          flex: "none",
          width: 24,
          height: 24,
          borderRadius: "50%",
          objectFit: "cover",
          border: `1.5px solid ${accent}`,
          boxSizing: "border-box",
        }}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: paper,
        border: `1.5px solid ${accent}`,
        color: accent,
        fontSize: "var(--text-md)",
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {initial}
    </span>
  );
}

/**
 * Slot: the crew roster — overlapping avatar initials plus every collaborator's
 * name (capped via `rosterNames`, then "+N more"). Collab only: renders nothing
 * on a solo/duel praxis or when the roster is just the author.
 */
export function PraxisRoster({
  praxis,
  accent,
  paper,
}: {
  praxis: PraxisCardOut;
  accent: string;
  paper?: string;
}) {
  const { t } = useTranslation("praxis");
  const members = praxis.members ?? [];
  if (praxis.type !== "collab" || members.length < 2) return null;
  const { names, overflow } = rosterNames(
    members.map((member) => ({ display_name: member.character_display_name })),
  );
  return (
    <div
      className="flex items-center flex-wrap"
      style={{ gap: "var(--space-sm)", marginTop: "var(--space-sm)" }}
    >
      <span style={{ display: "inline-flex" }}>
        {/* The same cap `rosterNames` applies, over the member rows themselves:
            the discs need the portrait, and `rosterNames` deliberately narrows
            to a display name so it can serve any shape with one. */}
        {members.slice(0, ROSTER_NAME_CAP).map((member, index) => (
          <span
            key={member.id}
            style={{ marginLeft: index === 0 ? undefined : "calc(var(--space-sm) * -1)" }}
          >
            <RosterAvatar
              name={member.character_display_name}
              avatarUrl={member.character_avatar_url}
              accent={accent}
              paper={paper}
            />
          </span>
        ))}
      </span>
      <span
        className="font-body"
        style={{ fontSize: "var(--text-content)", color: accent, minWidth: 0 }}
      >
        {names.join(", ")}
        {overflow > 0 ? ` ${t("mobileCard.rosterMore", { count: overflow })}` : ""}
      </span>
    </div>
  );
}

/**
 * Slot: the duel banner — who this side is fighting (#596).
 *
 * ONE SHARED SLOT, NOT NINE TREATMENTS (owner ruling, 2026-08-01). It sits in
 * the composition where {@link PraxisRoster} sits and is themed the same way —
 * `factionCssVar` off `task_faction_slug` for the ink — so a faction gets its
 * duel banner from the archetype it already passes, with no per-archetype edit.
 * The Snide mock in #596 was reference for tone; it also assumed the rival was
 * findable in `members`, which the schema never supported.
 *
 * THE RIVAL'S FACE IS `FactionAvatar`, NOT THE ROSTER DISC (#2128). It was the
 * accent-ringed monogram, which meant this card drew its two people two ways:
 * the byline eight inches above already renders its author through the shared
 * avatar surface, and a rival in a different idiom read as a different KIND of
 * thing. `FactionAvatar` brings the faction skin and the membership sigil with
 * it, and here that is the point rather than a cost — a duel is the one surface
 * two factions share, the wire carries `opponent_faction_slug` for exactly this,
 * and both composer duel surfaces already paint each side in its OWN faction.
 * (The praxis-detail byline in #2106 declined the same dress; it draws one
 * person inside a bespoke kit frame, where a second faction's colours would be
 * noise. Different question, different answer.)
 *
 * `opponent_avatar_url` is `""` for a rival with no portrait, and the shared
 * surface's own fallback (monogram, else spectrum ring) takes it from there —
 * no second fallback rule is written here.
 *
 * NO NEW TOKEN IS MINTED (ADR-0061). The "vs." mark reads in `card-notice`, the
 * sheet's cautionary ink — the same ink the duel mode chip directly above it
 * already prints, so the banner reads as that chip's continuation rather than a
 * second colour language. The rival's NAME takes the frame accent, exactly as a
 * collaborator's name does in {@link PraxisRoster}.
 *
 * SILENT DURING THE PENDING WINDOW. The card names an opponent only when the
 * wire carries one: `opponent_display_name` is absent both for a non-duel praxis
 * and for a challenger whose rival has not accepted yet, and in the second case
 * the mode chip alone is the answer that already shipped. Deliberately gated on
 * the NAME rather than `isDuelPraxis`: a duel side whose opponent is still
 * pending IS a duel by `duel_id`, and has nobody to print.
 */
export function PraxisDuelBanner({
  praxis,
  accent,
  fonts,
}: {
  praxis: PraxisCardOut;
  accent: string;
  fonts?: PraxisCardFonts;
}) {
  const { t } = useTranslation("praxis");
  const name = praxis.opponent_display_name;
  if (!name) return null;
  const { notice } = sheetInk(praxis.task_faction_slug);
  // The rival's own praxis, when the payload carries the id. A duel side always
  // has one once it exists, so the link is the optional half only defensively: a
  // named opponent with no link still says more than the bare chip did.
  const rival = (
    <span
      className="font-body"
      style={{ color: accent, fontFamily: fonts?.body, minWidth: 0 }}
    >
      {name}
    </span>
  );
  return (
    <div
      className="flex items-center flex-wrap"
      style={{ gap: "var(--space-sm)", marginTop: "var(--space-sm)" }}
    >
      <span
        style={{
          // A LABEL, not running text — the same tier and tracking the duel mode
          // chip above it uses, so the two read as one mark.
          fontSize: "var(--text-md)",
          fontFamily: fonts?.display,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: notice,
          flex: "none",
        }}
      >
        {t("duelBanner.versus")}
      </span>
      <FactionAvatar
        character={faceAsCharacter({
          id: 0,
          name,
          avatarUrl: praxis.opponent_avatar_url,
          factionSlug: praxis.opponent_faction_slug,
        })}
        // The diameter the accent-ringed disc drew at, said in the shared
        // surface's own size vocabulary rather than as a fresh number.
        size="sm"
      />
      <span style={{ fontSize: "var(--text-content)", minWidth: 0 }}>
        {praxis.opponent_praxis_id != null ? (
          <Link
            to={`/praxis/${praxis.opponent_praxis_id}`}
            className="hover:underline"
            aria-label={t("duelBanner.readTheirs", { name })}
          >
            {rival}
          </Link>
        ) : (
          rival
        )}
      </span>
    </div>
  );
}

/**
 * Slot: the mode chip — "Collaboration · {members}" or "Duel", plus a pending
 * marker when a collab's submit window is open. Reuses the shared collaboration
 * copy (`collaborationCard.*`, common ns) the retired CollaborationCard used.
 * Solo praxes get no chip (PraxisStats already reads "solo").
 */
export function PraxisModeChip({
  praxis,
  style,
  fonts,
}: {
  praxis: PraxisCardOut;
  style?: CSSProperties;
  fonts?: PraxisCardFonts;
}) {
  const { t } = useTranslation("common");
  // A duel side is stored type='solo' + a non-null duel_id (ADR-0011), so
  // `type === 'duel'` never fires (#992) — gate on duel presence instead.
  const isDuel = isDuelPraxis(praxis);
  const isCollab = praxis.type === "collab";
  const isPending = praxis.submit_proposed_at != null;
  if (!isDuel && !isCollab && !isPending) return null;
  // The chip paints its own ground, so it paints its own ink (#694) — and the
  // ground is the faction's sheet, so the ink is the sheet's (#1302). A duel
  // reads in the attention ink and a collaboration in the credit one; the
  // pending marker is attention too, and never renders beside the duel chip
  // (`submit_proposed_at` is the collab submit window).
  const { notice, credit } = sheetInk(praxis.task_faction_slug);
  const chip: CSSProperties = {
    // A chip is a LABEL, not running text: it keeps the label tier, at the
    // heading step the tier settled on in #1307 rather than the 8px floor the
    // meta line just left. (#888 left this at 9px; #1608 swept the step.)
    fontSize: "var(--text-md)",
    fontFamily: fonts?.display,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    padding: "var(--space-xs) var(--space-sm)",
    borderRadius: 3,
  };
  return (
    <div
      className="flex flex-wrap"
      style={{ gap: "var(--space-sm)", marginTop: "var(--space-sm)", ...style }}
    >
      {(isDuel || isCollab) && (
        <span
          style={{
            ...chip,
            color: isDuel ? notice : credit,
            background: inkWash(isDuel ? notice : credit, 8),
            border: `1px solid ${inkWash(isDuel ? notice : credit, 30)}`,
          }}
        >
          {isDuel
            ? t("collaborationCard.duel")
            : `${t("collaborationCard.collaboration")} · ${praxis.member_count}`}
        </span>
      )}
      {isPending && (
        <span
          style={{
            ...chip,
            color: notice,
            background: inkWash(notice, 8),
            border: `1px solid ${inkWash(notice, 30)}`,
          }}
        >
          {t("collaborationCard.pending")}
        </span>
      )}
    </div>
  );
}

/**
 * Slot: the proof media gallery — up to 3 tiles with a "+N" badge on the last
 * when there are more. UNIFORM across every faction (no opt-out, no faction
 * empty-state art). Images render a cover thumbnail; video/audio render a
 * faction-styled glyph placeholder (no inline player). Renders nothing empty.
 */
export function PraxisMediaGallery({
  praxis,
  accent,
  paper,
  showPlaceholder,
  emptyLabel,
  emptyStyle,
  fonts,
}: {
  praxis: PraxisCardOut;
  accent: string;
  paper?: string;
  fonts?: PraxisCardFonts;
  /**
   * When set, an empty gallery renders a neutral dashed drop-target placeholder
   * (the mock's "media slot") instead of nothing. Opt-in so it stays off the
   * dense faction cards; the spectrum Default card turns it on (#820).
   */
  showPlaceholder?: boolean;
  /**
   * The empty slot's invitation, in the faction's own words (#840) — WOW's
   * "❦ here, an illumination ❦", Coven's "Drop a happy little photo ✿". The
   * TILES stay uniform across every faction; only this one line and the frame
   * around it are a voice, and the design gives each faction its own.
   */
  emptyLabel?: string;
  /** Empty-slot frame overrides (the design draws a per-faction slot). */
  emptyStyle?: CSSProperties;
}) {
  const { t } = useTranslation("praxis");
  const items = praxis.media_items ?? [];
  if (items.length === 0) {
    if (!showPlaceholder) return null;
    return (
      <div
        className="flex items-center justify-center font-body"
        style={{
          marginTop: "var(--space-sm)",
          height: 96,
          borderRadius: 4,
          border: `1px dashed color-mix(in srgb, ${accent} 45%, transparent)`,
          background: `color-mix(in srgb, ${accent} 4%, transparent)`,
          color: accent,
          // Label tier, at its heading step rather than the 8px floor (#1608).
          fontSize: "var(--text-md)",
          fontFamily: fonts?.body,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          // NO `opacity` HERE (#2248). This carried `opacity: 0.7`, which is a
          // contrast cut no guard can see: the alpha composites the ink over
          // the ground at the CALL SITE, so the token the manifest measures is
          // not the colour the reader gets. On UA the pairing measured 2.85:1
          // in light and 3.22:1 in dark, for an 11px label owing 4.5:1; at full
          // strength the same ink reads 4.64:1 and 4.96:1 on the same grounds.
          // The slot still recedes — that is the GROUND's job here, and it is
          // already doing it: a 4% wash of the accent behind a 45% dashed rule.
          ...emptyStyle,
        }}
      >
        {emptyLabel ?? t("card.mediaEmpty")}
      </div>
    );
  }
  const tiles = items.slice(0, 3);
  const overflow = items.length - tiles.length;
  return (
    // `.user-media` marks the region that is the PLAYER's, not the site's, so a
    // faction flourish can be told to stop at it (#1646). Inert everywhere but
    // Albescent, and deliberately absent from the empty slot above — a dashed
    // drop-target is chrome, and the drift keeps washing it.
    <div className="flex user-media" style={{ gap: "var(--space-sm)", marginTop: "var(--space-sm)" }}>
      {tiles.map((item, index) => {
        const showOverflow = index === tiles.length - 1 && overflow > 0;
        return (
          <div
            key={item.id}
            className="flex items-center justify-center"
            style={{
              position: "relative",
              flex: 1,
              aspectRatio: "1 / 1",
              overflow: "hidden",
              borderRadius: 4,
              border: `1px solid ${accent}`,
              background: paper,
            }}
          >
            {item.type === "image" ? (
              <img
                src={mediaUrl(item.file_path)}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <span
                className="flex items-center"
                style={{ flexDirection: "column", gap: "var(--space-xs)", color: accent }}
              >
                <span aria-hidden style={{ fontSize: "var(--text-xl)", lineHeight: 1 }}>
                  {item.type === "video" ? "▶" : "♪"}
                </span>
                <span
                  style={{
                    // Label tier, heading step rather than the 8px floor (#1608).
                    fontSize: "var(--text-md)",
                    fontFamily: fonts?.body,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {item.type === "video" ? t("mobileCard.mediaVideo") : t("mobileCard.mediaAudio")}
                </span>
              </span>
            )}
            {showOverflow && (
              <span
                className="flex items-center justify-center"
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "color-mix(in srgb, black 55%, transparent)",
                  color: "white",
                  fontSize: "var(--text-xl)",
                  fontWeight: 700,
                }}
              >
                {t("mobileCard.mediaMore", { count: overflow })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Slot: the vote footer — the real per-faction VoteUI, keyed by the task
 * faction. Pre-highlights the viewer's own cast (`viewer_vote`); casting is
 * self-managed by VoteUI's own useVote path (no external handler).
 *
 * It passes NO `points`/`totalVotes` (#888, closing #663). `VoteShell`'s
 * existing `points != null` guard then drops the whole "N pts · M votes" tally
 * line, leaving the star control alone. That is the entire mechanism: the guard
 * is not re-cut here, and the praxis DETAIL page — a different caller that does
 * pass them — keeps its tally.
 */
export function PraxisVoteFooter({
  praxis,
  style,
}: {
  praxis: PraxisCardOut;
  style?: CSSProperties;
}) {
  return (
    <div style={{ marginTop: "var(--space-md)", ...style }}>
      <VoteUI
        factionSlug={praxis.task_faction_slug}
        praxisId={praxis.id}
        currentValue={praxis.viewer_vote ?? undefined}
        viewerCanVote={praxis.viewer_can_vote}
      />
    </div>
  );
}

// ─── Admin overlay ────────────────────────────────────────────────────────────

export interface AdminProps {
  praxis: PraxisCardOut;
  showAdminControls: boolean;
  onHide: (e: MouseEvent) => void;
  onFail: (e: MouseEvent) => void;
  moderateError: string | null;
}

/**
 * Moderation status badge + hide/fail controls, shared by every archetype.
 *
 * Every mark here is a PLATFORM state written on a FACTION sheet, so the words
 * stay neutral (they are the shared `card.adminStatus.*` / `card.adminAction.*`
 * copy on all nine cards) and the ink is the sheet's — see `sheetInk`. The two
 * status badges keep #1169's `-veil` / `-edge` rungs behind and around them: a
 * 5% wash and a 30% rule are fills, the role that family names, and the veiled
 * reading is the one the manifest gates.
 *
 * FOUR MARKS, TWO SEVERITIES (#1449). `flagged` / `hide` are the destructive
 * pair and take the alarm ink on the danger veil; `failed` / `fail` are the
 * cautionary pair and keep the notice ink on the warning veil. The pairing is
 * the point — an ink and the wash under it always come from the same half —
 * so these are edited together or not at all.
 *
 * The `hidden` badge used to be the exception, and it was the plainer bug of the
 * two: a raw `rgba(107,114,128, …)` at two alphas, a grey matching no token in
 * either theme, which `local/no-raw-style-values` cannot see because that rule
 * does not cover colour. It reads 2.94:1 on S.N.I.D.E.'s plate. It is the faction's
 * own muted ink now, and its 5% wash is GONE rather than restated in the ink's
 * hue: a wash of the ink's own colour only pulls the ground toward the ink, and
 * at 5% it is imperceptible on every sheet while costing WOW (4.48:1) and the
 * Ephemerists plate (4.43:1) their margin. The rule stays, at the alpha it had.
 */
export function AdminOverlay({
  praxis,
  showAdminControls,
  onHide,
  onFail,
  moderateError,
}: AdminProps) {
  const { t } = useTranslation("praxis");
  const { notice, alarm, muted } = sheetInk(praxis.task_faction_slug);
  const badge: CSSProperties = {
    position: "absolute",
    top: 8,
    right: 8,
    padding: "0 var(--space-xs)",
  };
  return (
    <>
      {praxis.moderation_status === "flagged" && (
        <span
          className="label-caption"
          style={{
            ...badge,
            border: "1px solid var(--color-danger-edge)",
            color: alarm,
            background: "var(--color-danger-veil)",
          }}
        >
          {t("card.adminStatus.underReview")}
        </span>
      )}
      {praxis.moderation_status === "failed" && (
        <span
          className="label-caption"
          style={{
            ...badge,
            border: "1px solid var(--color-warning-edge)",
            color: notice,
            background: "var(--color-warning-veil)",
          }}
        >
          {t("card.adminStatus.failed")}
        </span>
      )}
      {praxis.moderation_status === "hidden" && (
        <span
          className="label-caption"
          style={{
            ...badge,
            border: `1px solid ${inkWash(muted, 40)}`,
            color: muted,
          }}
        >
          {t("card.adminStatus.hidden")}
        </span>
      )}
      {moderateError && (
        <p
          className="content-text font-body"
          style={{
            // An error, so the alarm ink — bare on the sheet, with no veil over
            // it. Left on `notice` this paragraph would read amber beside the
            // red `hide` button that produced it.
            color: alarm,
            marginBottom: "var(--space-xs)",
          }}
        >
          {moderateError}
        </p>
      )}
      {showAdminControls && praxis.moderation_status === "visible" && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            gap: "var(--space-xs)",
          }}
        >
          <button
            onClick={onHide}
            className="label-caption"
            style={{
              padding: "0 var(--space-xs)",
              border: "1px solid var(--color-danger-edge)",
              color: alarm,
              background: "var(--color-danger-veil)",
              cursor: "pointer",
            }}
          >
            {t("card.adminAction.hide")}
          </button>
          <button
            onClick={onFail}
            className="label-caption"
            style={{
              padding: "0 var(--space-xs)",
              border: "1px solid var(--color-warning-edge)",
              color: notice,
              background: "var(--color-warning-veil)",
              cursor: "pointer",
            }}
          >
            {t("card.adminAction.fail")}
          </button>
        </div>
      )}
    </>
  );
}
