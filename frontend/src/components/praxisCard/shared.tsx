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
 * Praxis-card content slots. Each faction owns its FRAME; the slots below
 * (`PraxisTitle`, `PraxisTaskLink`, `PraxisStats`, `PraxisByline`…) let an
 * archetype arrange the content rather than recolour one fixed block.
 */

/** Crew-name cap for collab cards ("+N more" past it); shared with collab (#587). */
export const ROSTER_NAME_CAP = 7

/**
 * The card's two faces (#888). A PAIR on purpose: several card fonts are
 * display faces unreadable at paragraph length (S.N.I.D.E.'s Permanent Marker).
 * Unset keeps the slot's `font-*` class.
 */
export interface PraxisCardFonts {
  /** The identity face — author name, title, mode chip. */
  display?: string;
  /** The reading face — task line, excerpt, meta line. */
  body?: string;
}

/**
 * State inks on faction paper (#1302). These slots render inside a faction
 * frame, so the global `--color-danger/-warning/-success` (chosen for the
 * near-white page) fail AA here; the per-sheet `-card-*` family is measured
 * against each faction's stock. Unregistered slugs fall to `default`, the
 * sheet `DefaultPraxisCard` paints. Global tokens can't be deepened instead:
 * S.N.I.D.E. and Singularity are dark in both themes (WORLD_ZERO_STYLE §3).
 *
 * Two attention inks (#1449), so hide-vs-fail keep a red/amber cue (a former
 * `ponytail:` shortcut). `alarm` sits on the danger veil, `notice` on the
 * warning veil: change an ink and its veil in the same edit.
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
 * A badge's wash/rule mixed from its own ink (#1302). Keep washes at 8%: 12%
 * dropped the Ephemerists plate under AA (`factionContrast.test.ts`).
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
 * Slot: the praxis title. An `<h2>` for all nine archetypes: a card can't see
 * whether a section heading sits above it, so it never assumes one (#1950).
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
  /** Un-linked run-in before the title (#840), outside the anchor's accessible name. */
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
 * A card face as `FactionAvatar` wants it (#888): it reads only username /
 * avatar_url / faction_slug, so the rest is padding (cf. `comments/shared.tsx`
 * `authorToCharacter`). `display_name` stands in for `username` so the
 * monogram follows the byline. The rival's `id` is 0: unknown, and unread.
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
    // Unaffiliated is a slug, not a missing one (ADR-0030).
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

/** Byline portrait px for `FactionAvatar`'s size API: between roster 24 and profile 32. */
const BYLINE_PORTRAIT_SIZE = 28;

/**
 * Slot: the author byline — portrait, then name, dashed rule on top.
 *
 * One child (#2366): the total belongs to the score stamp (#888) and the
 * faction tag duplicated `FactionAvatar`'s sigil (#2245), which also carries
 * the faction's accessible name. `space-between` and `gap` are inert but kept
 * so the nine archetypes stay byte-identical.
 *
 * `divider` replaces the rule (#2312; Ephemerists draw their own rune strip).
 * Absent, it writes `undefined` into the same key so markup stays
 * byte-identical (`__tests__/bylineDivider.test.tsx`).
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
  /** Faction mark drawn in place of the rule, as the row's previous sibling (#2312). */
  divider?: ReactNode;
}) {
  const authorHref = `/characters/${praxis.created_by_id}`;
  const authorName = praxis.created_by_display_name || `#${praxis.created_by_id}`;
  /*
   * #2125: on the author's own character page the name is plain text, not a
   * link to the current page (screen readers still announce one). Compared by
   * whole path, character to character, never by account.
   */
  const here = useLocation().pathname.replace(/\/+$/, "");
  const onAuthorsOwnPage = here === authorHref;
  // The 8px is padding on the name, not row `gap` (#1633): a display face's
  // last glyph can overhang its advance width (Poiret One).
  //
  // `overflow-wrap: anywhere`, not `break-word` and not nowrap+ellipsis
  // (#2132): only `anywhere` shrinks min-content, so a long name can't
  // inflate the card and its ancestors past the viewport.
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
          // Top of the label tier; the name overrides to the content tier.
          fontSize: "var(--text-xl)",
          marginTop: "var(--space-sm)",
          paddingTop: "var(--space-sm)",
          // `currentColor` (the frame's card text) so it works on every sheet
          // and theme (#1609). `undefined`, not a branch, keeps markup
          // byte-identical when no `divider` is passed (#2312).
          borderTop: divider
            ? undefined
            : "1px dashed color-mix(in srgb, currentColor 30%, transparent)",
          gap: "var(--space-sm)",
          ...style,
        }}
      >
        {/* No `gap`: see `nameStyle` (#1633). */}
        <span className="flex items-center" style={{ minWidth: 0 }}>
          <FactionAvatar
            character={authorAsCharacter(praxis)}
            size={BYLINE_PORTRAIT_SIZE}
          />
          {/* Content tier: a name is read, not scanned. */}
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
 * Slot: "voted by {name}" (#644 §7) — another character on the viewer's
 * ACCOUNT voted, so it can show even when `viewer_vote` is null.
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
 * Slot: the meta line — level · base points · mode · date.
 *
 * Level always renders, `L0` included (#888), so separators line up card to
 * card. Points render only when no stamp is mounted (#2114): the stamp states
 * the base itself, and renders nothing on an unscored praxis (#1444). Praxis
 * detail uses `stampRestatesTaskPoints` instead.
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
      {/* No `opacity` here (#1675): the line already wears the muted ink, and
          a further wash fails AA. */}
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
 * Markdown flattened to inline text for the excerpt (#2578). Parsed by remark,
 * not a regex, so the card reads a body exactly as the detail page's
 * `MarkdownPreview` does; flattened because headings, lists and a nested `<a>`
 * can't live in a two-line clamp inside a link. Blocks add a trailing space;
 * links drop their href; images become alt text.
 */
const Block = ({ children }: { children?: ReactNode }) => <>{children} </>;
const Inline = ({ children }: { children?: ReactNode }) => <>{children}</>;

/* Written out per tag: a loop hits TS2590 (union too complex). A missing tag renders as itself. */
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
 * Accent-ringed portrait disc, else first initial (#2318). Not
 * `collab/RosterAvatar` (34px, two-letter monogram).
 */
function RosterAvatar({
  name,
  avatarUrl,
  accent,
  paper,
}: {
  name: string;
  /** Raw wire path; empty falls back to the initial. */
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

/** Slot: the collab crew roster — overlapping discs plus capped names. */
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
        {/* Same cap as `rosterNames`, over full rows: discs need the portrait. */}
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
 * Slot: the duel banner — who this side is fighting (#596). One shared slot,
 * themed like {@link PraxisRoster}, not nine treatments.
 *
 * The rival is drawn with `FactionAvatar` in their OWN faction (#2128), like
 * the byline's author. "vs." reuses the duel chip's `card-notice` ink; no new
 * token (ADR-0061). Gated on the NAME, not `isDuelPraxis`: a pending duel has
 * nobody to print yet.
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
  // Linked to the rival's praxis when the id is present (defensive).
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
          // Same label tier and tracking as the duel chip.
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
 * Slot: the mode chip — "Collaboration · N" or "Duel", plus a pending marker
 * while a collab's submit window is open. Solo gets none.
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
  // A duel side is type='solo' + duel_id (ADR-0011), never type 'duel' (#992).
  const isDuel = isDuelPraxis(praxis);
  const isCollab = praxis.type === "collab";
  const isPending = praxis.submit_proposed_at != null;
  if (!isDuel && !isCollab && !isPending) return null;
  // Sheet inks (#694, #1302): duel and pending in notice, collab in credit.
  const { notice, credit } = sheetInk(praxis.task_faction_slug);
  const chip: CSSProperties = {
    // Label tier, heading step (#1608).
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
 * Slot: proof media — up to 3 tiles, "+N" on the last. Uniform across
 * factions; video/audio get a glyph, not a player.
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
  /** Render a dashed placeholder when empty (opt-in; #820). */
  showPlaceholder?: boolean;
  /** The empty slot's line in the faction's voice (#840). */
  emptyLabel?: string;
  /** Empty-slot frame overrides. */
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
          // Label tier, heading step (#1608).
          fontSize: "var(--text-md)",
          fontFamily: fonts?.body,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          // No `opacity` (#2248): it cuts contrast below what the manifest
          // measures (UA failed AA). The ground does the receding.
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
    // `.user-media`: player content a faction flourish must stop at (#1646).
    // Not on the empty slot, which is chrome.
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
                    // Label tier, heading step (#1608).
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
 * Slot: the per-faction VoteUI. Passes no `points`/`totalVotes` (#888), so
 * `VoteShell` drops its tally line; praxis detail passes them and keeps it.
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
 * Moderation badge + hide/fail controls. Neutral copy, sheet ink (`sheetInk`)
 * on #1169's veil/edge rungs. `flagged`/`hide` = alarm on danger veil,
 * `failed`/`fail` = notice on warning veil (#1449): edit pairs together.
 * `hidden` wears the muted ink with no wash (a wash cost WOW and Ephemerists AA).
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
            // Alarm, to match the red `hide` that produced it.
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
