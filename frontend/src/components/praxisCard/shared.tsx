import type { CSSProperties, MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { CharacterOut } from "../../api/auth";
import type { PraxisCardOut } from "../../api/praxis";
import { factionCssVar, factionName } from "../../utils/factions";
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

/** Slot: the praxis title, linked to the praxis detail page. */
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
      <h3
        className="content-title font-display font-semibold leading-tight hover:underline"
        style={{
          marginBottom: "var(--space-sm)",
          fontFamily: fonts?.display,
          ...style,
        }}
      >
        {praxis.title}
      </h3>
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
 * The praxis author as the shared avatar surface wants them (#888).
 *
 * `FactionAvatar` reads only username / avatar_url / faction_slug off a
 * `CharacterOut`; a card payload carries those three under different names, so
 * pad the rest. Mirrors `comments/shared.tsx`'s `authorToCharacter` — reusing
 * the one avatar convention (portrait, else monogram, else spectrum ring) is
 * the point, so the card never grows a placeholder of its own.
 *
 * `display_name` stands in for `username` deliberately: it is what the byline
 * shows, so it is what the monogram initial and the img alt should follow.
 */
function authorAsCharacter(praxis: PraxisCardOut): CharacterOut {
  const name = praxis.created_by_display_name || `#${praxis.created_by_id}`;
  return {
    id: praxis.created_by_id,
    username: name,
    display_name: name,
    avatar_url: praxis.created_by_avatar_url || "",
    // Unaffiliated is a slug, not a missing one (ADR-0030), and `CharacterOut`
    // says so now that it IS the generated type (#1400).
    faction_slug: praxis.created_by_faction_slug ?? "na",
    bio: "",
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

/**
 * The byline portrait's diameter. An argument to `FactionAvatar`'s own size API
 * (which takes `'sm' | 'md' | px`), not a style value — it sits between the two
 * named steps because the byline wants a face bigger than the roster's 24 and
 * smaller than a profile's 32.
 */
const BYLINE_PORTRAIT_SIZE = 28;

/**
 * Slot: the author byline (dashed rule on top) — name, portrait, faction tag.
 *
 * The praxis TOTAL used to sit at the right of this row. It is gone (#888,
 * closing #663): the score stamp is the card's sole owner of that number, and
 * a card that states its total twice invites the reader to check whether the
 * two agree. The portrait takes the name's right-hand side; the author's
 * faction tag takes the far edge the score vacated.
 */
export function PraxisByline({
  praxis,
  style,
  fonts,
}: {
  praxis: PraxisCardOut;
  style?: CSSProperties;
  fonts?: PraxisCardFonts;
}) {
  // The author's own member faction, shown only when it differs from the task
  // faction (the frame already carries the task faction's voice). Resolved via
  // the factions.json catalog (factionName), never a hardcoded map.
  const authorFaction = praxis.created_by_faction_slug;
  const showFaction = !!authorFaction && authorFaction !== praxis.task_faction_slug;
  return (
    <div
      className="flex justify-between items-center font-body"
      style={{
        // Byline chrome sits at the TOP of the label tier (14px), not its floor
        // (8px). The name itself overrides up to the content tier below.
        fontSize: "var(--text-xl)",
        marginTop: "var(--space-sm)",
        paddingTop: "var(--space-sm)",
        borderTop: "1px dashed rgba(128,128,128,0.3)",
        gap: "var(--space-sm)",
        ...style,
      }}
    >
      {/*
       * No `gap` here on purpose (#1633) — the separation from the portrait is
       * carried as padding on the name itself. See the link below.
       */}
      <span className="flex items-center" style={{ minWidth: 0 }}>
        <Link
          to={`/characters/${praxis.created_by_id}`}
          // A person's name is readable text, not scanned chrome: content tier
          // (18px). It ties the task link's size, and separates from it by
          // weight and by the faction's own display face instead.
          className="content-text font-semibold hover:underline"
          style={{
            fontFamily: fonts?.display,
            /*
             * The truncation pair, and the padding that keeps it off the
             * glyphs (#1633). `overflow: hidden` is doing two jobs: it clips,
             * and it is what makes this a shrinkable flex item at all
             * (min-width: auto resolves to 0 rather than to the whole nowrap
             * string), so a name too long for the card ellipsizes instead of
             * shoving the portrait out of the frame.
             *
             * But it clips at the PADDING box while `text-overflow` measures
             * the CONTENT box, and the two coincided while the 8px lived on
             * the row as `gap`. A display face's final glyph can carry ink
             * past its own advance width — the Ephemerists card sets this line
             * in Poiret One — so that overhang was shaved off flush against
             * the portrait beside it, with no ellipsis to explain it, which is
             * what "a letter clipped behind its own avatar" looks like.
             * Carrying the same 8px as padding here renders identically and
             * gives the ink somewhere to land.
             *
             * The Ephemerists kit's own fix was `overflow: visible` +
             * `text-overflow: clip`. It does not port: visible overflow
             * restores min-width: auto to min-content, the name stops yielding,
             * and a long one paints straight over the portrait and the faction
             * tag. That is the symptom, caused on purpose.
             */
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            paddingInlineEnd: "var(--space-sm)",
          }}
        >
          {praxis.created_by_display_name || `#${praxis.created_by_id}`}
        </Link>
        <FactionAvatar
          character={authorAsCharacter(praxis)}
          size={BYLINE_PORTRAIT_SIZE}
        />
      </span>
      {showFaction && (
        <span
          style={{ fontFamily: fonts?.body, opacity: 0.7, whiteSpace: "nowrap" }}
        >
          {factionName(authorFaction)}
        </span>
      )}
    </div>
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
    <div className="eyebrow" style={{ marginTop: "var(--space-sm)", opacity: 0.75, ...style }}>
      {t("card.votedBy", { name: praxis.voted_by_name })}
    </div>
  );
}

/**
 * Slot: level + base points + collaboration mode + date — the meta line.
 *
 * FOUR segments, always, in that order (#888). The level used to be conditional
 * on `task_level_required > 0`, so a level-0 task dropped it and the separator
 * count changed card to card — a ragged line across a wall of cards. `L0` is a
 * real answer to "what does this need?", so it renders.
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
      <span style={{ fontWeight: 600, opacity: 0.75 }}>
        {t("card.level", { level: praxis.task_level_required })}
      </span>
      <span aria-hidden>·</span>
      <span style={{ fontWeight: 700 }}>{t("card.points", { points: praxis.task_point_value })}</span>
      <span aria-hidden>·</span>
      <span>{collaborators > 0 ? t("card.crew", { count: collaborators }) : t("card.solo")}</span>
      {submittedDate && (
        <>
          <span aria-hidden>·</span>
          <span style={{ opacity: 0.65 }}>{submittedDate}</span>
        </>
      )}
    </div>
  );
}

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
      {praxis.body_text}
    </p>
  );
}

/** A round avatar disc showing the first initial — ringed in the frame accent. */
function RosterAvatar({
  name,
  accent,
  paper,
}: {
  name: string;
  accent: string;
  paper?: string;
}) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
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
        fontSize: "var(--text-xs)",
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
        {names.map((name, index) => (
          <span
            key={index}
            style={{ marginLeft: index === 0 ? undefined : "calc(var(--space-sm) * -1)" }}
          >
            <RosterAvatar name={name} accent={accent} paper={paper} />
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
 * the frame's own `accent`/`paper` for the avatar, `factionCssVar` off
 * `task_faction_slug` for the ink — so a faction gets its duel banner from the
 * archetype it already passes, with no per-archetype edit. The Snide mock in
 * #596 was reference for tone; it also assumed the rival was findable in
 * `members`, which the schema never supported.
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
  paper,
  fonts,
}: {
  praxis: PraxisCardOut;
  accent: string;
  paper?: string;
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
          fontSize: "var(--text-sm)",
          fontFamily: fonts?.display,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: notice,
          flex: "none",
        }}
      >
        {t("duelBanner.versus")}
      </span>
      <RosterAvatar name={name} accent={accent} paper={paper} />
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
    // A chip is a LABEL, not running text: it keeps the label tier (#888 leaves
    // `.eyebrow`/`--text-sm` alone by design), but at the 9px step rather than
    // the 8px floor the meta line just left.
    fontSize: "var(--text-sm)",
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
          // Label tier, at the eyebrow step rather than the 8px floor (#888).
          fontSize: "var(--text-sm)",
          fontFamily: fonts?.body,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          opacity: 0.7,
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
    <div className="flex" style={{ gap: "var(--space-sm)", marginTop: "var(--space-sm)" }}>
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
                    // Label tier, eyebrow step rather than the 8px floor (#888).
                    fontSize: "var(--text-sm)",
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
          className="eyebrow"
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
          className="eyebrow"
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
          className="eyebrow"
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
            className="eyebrow"
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
            className="eyebrow"
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

// ─── Albescent ────────────────────────────────────────────────────────────────

/**
 * The Albescent SPARKS (#842, ADR-0048) — three faint gold ✦ scattered over the
 * sheet, the other half of the secret-society tell.
 *
 * The design pairs `.alb-rainbow`'s slow drift with `.alb-spark`; #821 shipped
 * only the drift, so the card shimmered but never caught the light. Each spark
 * carries its own position, size and delay so the three never pulse together,
 * and all of them sit BEHIND the card content (`z-index: 0`, pointer-events
 * none). Reduced motion parks them at a steady low opacity rather than freezing
 * the keyframes — frozen at 0% they would be invisible, which is not "stilled".
 *
 * Shared by the desktop and mobile Albescent cards: both wrap the exact
 * unaffiliated card and layer the same tell over it. A repaint in Albescent's
 * own colours would put it back in the spectrum and un-hide it (#783).
 */
export function AlbescentSparks() {
  return (
    <>
      {/* eslint-disable-next-line local/no-raw-style-values -- ornament: ✦ glyph used as a drawn spark, sized as illustration (§4a) */}
      <span aria-hidden className="alb-spark" style={{ top: 118, left: 24, fontSize: 13, animationDelay: "0s" }}>
        ✦
      </span>
      {/* eslint-disable-next-line local/no-raw-style-values -- ornament: ✦ glyph used as a drawn spark, sized as illustration (§4a) */}
      <span aria-hidden className="alb-spark" style={{ top: 176, right: 36, fontSize: 9, animationDelay: "1.5s" }}>
        ✦
      </span>
      {/* eslint-disable-next-line local/no-raw-style-values -- ornament: ✦ glyph used as a drawn spark, sized as illustration (§4a) */}
      <span aria-hidden className="alb-spark" style={{ bottom: 104, left: 64, fontSize: 15, animationDelay: "2.8s" }}>
        ✦
      </span>
    </>
  );
}
