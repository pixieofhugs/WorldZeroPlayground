import type { CSSProperties, MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { PraxisCardOut } from "../../api/praxis";
import { factionName } from "../../utils/factions";
import { mediaUrl } from "../../utils/media";
import { TaskCrown } from "../cards/TaskCrown";
import VoteUI from "../vote/VoteUI";

/**
 * Praxis-card shared building blocks.
 *
 * Each faction's praxis card owns a bespoke FRAME (tilted memo, ruled paper,
 * scrap collage, torn evidence, vellum leaf, terminal, gazette…). The CONTENT
 * inside is broken into independently-placeable structural slots — `PraxisTitle`,
 * `PraxisTaskLink`, `PraxisScoreHero`, `PraxisStats`, `PraxisByline` — so an
 * archetype can arrange them (via the shared `PraxisBody` composition in
 * PraxisCard.tsx) instead of only re-coloring one fixed block. The dispatch stays
 * a true per-faction dispatch rather than chrome-only.
 */

/**
 * Roster-name helper — the crew names shown on a collaboration card, capped so a
 * large crew doesn't overflow the card. Returns up to `cap` display names plus
 * the overflow count (the "+N more" tail). Shared by the desktop collaboration
 * surface (#587) and the mobile praxis card (#573) — put it here, not a mobile
 * copy, so both read the same cap.
 */
export const ROSTER_NAME_CAP = 7

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
}: {
  praxis: PraxisCardOut;
  style?: CSSProperties;
}) {
  return (
    <Link to={`/praxes/${praxis.id}`}>
      <h3
        className="font-display font-semibold leading-tight hover:underline"
        style={{ fontSize: "var(--text-content)", marginBottom: "var(--space-sm)", ...style }}
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
}: {
  praxis: PraxisCardOut;
  style?: CSSProperties;
}) {
  return (
    <Link
      to={`/tasks/${praxis.task_id}`}
      className="font-body hover:underline"
      style={{ fontSize: "var(--text-xs)", ...style }}
    >
      {praxis.task_title}
    </Link>
  );
}

/** Slot: the author + score footer row (dashed rule on top). */
export function PraxisByline({
  praxis,
  style,
}: {
  praxis: PraxisCardOut;
  style?: CSSProperties;
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
        fontSize: "var(--text-xs)",
        marginTop: "var(--space-sm)",
        paddingTop: "var(--space-sm)",
        borderTop: "1px dashed rgba(128,128,128,0.3)",
        ...style,
      }}
    >
      <span className="flex items-baseline" style={{ gap: "var(--space-xs)", minWidth: 0 }}>
        <Link
          to={`/characters/${praxis.created_by_id}`}
          className="hover:underline"
        >
          {praxis.created_by_display_name || `#${praxis.created_by_id}`}
        </Link>
        {showFaction && (
          <span style={{ opacity: 0.7, whiteSpace: "nowrap" }}>
            {`· ${factionName(authorFaction)}`}
          </span>
        )}
      </span>
      {praxis.score !== null && (
        <span
          className="font-display font-bold"
          style={{ fontSize: "var(--text-content)", color: "inherit" }}
        >
          {praxis.score.toFixed(1)}
        </span>
      )}
    </div>
  );
}

/**
 * Slot: the score hero — a completed praxis's earned-points readout, stamped as
 * `{base} + {votes}`: the task's base points plus the points scored FROM votes
 * (ADR-0014 merit = `task base + points_from_votes`, so vote-points =
 * `score - task_point_value`). This is a points sum, never a 1–5 rating or an
 * average. `voter_count` (a people-count) is deliberately not shown — the second
 * number is vote *points*, per Molly's #375 call.
 */
export function PraxisScoreHero({
  praxis,
  color,
  border,
  paper,
  showCrown,
}: {
  praxis: PraxisCardOut;
  color?: string;
  border?: string;
  /** The card's paper colour — the crown medallion's inner disc (ADR-0028). */
  paper?: string;
  /** Set false when the surface renders its own TaskCrown (the faction pages). */
  showCrown?: boolean;
}) {
  const { t } = useTranslation("praxis");
  if (praxis.score === null || praxis.score === undefined) return null;
  const base = praxis.task_point_value;
  const votePoints = Math.max(0, Math.round(praxis.score - base));
  const crowned = praxis.is_top_for_task && showCrown !== false;
  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        minWidth: 54,
        padding: "var(--space-sm) var(--space-md)",
        border: `2px solid ${border ?? "currentColor"}`,
        borderRadius: 4,
        transform: "rotate(-3deg)",
        color: color ?? "inherit",
        lineHeight: 1,
      }}
    >
      {/* Task Crown (ADR-0028) — stamped over the score stamp's corner. */}
      {crowned && (
        <TaskCrown
          size={26}
          ringInset={3}
          innerBg={paper}
          glyphColor={color ?? "currentColor"}
          rotate="8deg"
          style={{ position: "absolute", top: -13, right: -12, zIndex: 3 }}
        />
      )}
      {/* The earned-points readout — a score, so --text-content per the floor (§4). */}
      <span className="font-display" style={{ fontWeight: 800, fontSize: "var(--text-content)", whiteSpace: "nowrap" }}>
        {base}
        <span style={{ opacity: 0.55, margin: "0 var(--space-xs)" }}>+</span>
        {votePoints}
      </span>
      <span
        style={{
          fontSize: "var(--text-xs)",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          marginTop: "var(--space-xs)",
          opacity: 0.8,
        }}
      >
        {t("card.ptsAndVotes")}
      </span>
    </div>
  );
}

/** Slot: base points + collaboration mode — a compact stat line. */
export function PraxisStats({
  praxis,
  style,
}: {
  praxis: PraxisCardOut;
  style?: CSSProperties;
}) {
  const { t } = useTranslation("praxis");
  const collaborators = praxis.member_count - 1;
  const submittedDate = praxis.submitted_at
    ? new Date(praxis.submitted_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;
  return (
    <div
      className="flex items-center gap-2 font-body"
      style={{ fontSize: "var(--text-xs)", ...style }}
    >
      {praxis.task_level_required > 0 && (
        <>
          <span style={{ fontWeight: 600, opacity: 0.75 }}>{t("card.level", { level: praxis.task_level_required })}</span>
          <span aria-hidden>·</span>
        </>
      )}
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
}: {
  praxis: PraxisCardOut;
  style?: CSSProperties;
}) {
  if (!praxis.body_text) return null;
  return (
    <p
      className="font-body"
      style={{
        fontSize: "var(--text-sm)",
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
        style={{ fontSize: "var(--text-xs)", color: accent, minWidth: 0 }}
      >
        {names.join(", ")}
        {overflow > 0 ? ` ${t("mobileCard.rosterMore", { count: overflow })}` : ""}
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
}: {
  praxis: PraxisCardOut;
  style?: CSSProperties;
}) {
  const { t } = useTranslation("common");
  const isDuel = praxis.type === "duel";
  const isCollab = praxis.type === "collab";
  const isPending = praxis.submit_proposed_at != null;
  if (!isDuel && !isCollab && !isPending) return null;
  const chip: CSSProperties = {
    fontSize: "var(--text-xs)",
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
            color: isDuel ? "var(--color-danger)" : "var(--color-success)",
            background: isDuel
              ? "color-mix(in srgb, var(--color-danger) 12%, transparent)"
              : "color-mix(in srgb, var(--color-success) 12%, transparent)",
            border: `1px solid ${
              isDuel
                ? "color-mix(in srgb, var(--color-danger) 30%, transparent)"
                : "color-mix(in srgb, var(--color-success) 30%, transparent)"
            }`,
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
            color: "var(--color-warning)",
            background: "color-mix(in srgb, var(--color-warning) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)",
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
}: {
  praxis: PraxisCardOut;
  accent: string;
  paper?: string;
}) {
  const { t } = useTranslation("praxis");
  const items = praxis.media_items ?? [];
  if (items.length === 0) return null;
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
                    fontSize: "var(--text-xs)",
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
 * self-managed by VoteUI's own useVote path (no external handler). An additive
 * footer — it never replaces the score-hero stamp.
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
        points={praxis.score}
        totalVotes={praxis.voter_count}
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

/** Moderation status badge + hide/fail controls, shared by every archetype. */
export function AdminOverlay({
  praxis,
  showAdminControls,
  onHide,
  onFail,
  moderateError,
}: AdminProps) {
  const { t } = useTranslation("praxis");
  return (
    <>
      {praxis.moderation_status === "flagged" && (
        <span
          className="eyebrow"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            padding: "0 var(--space-xs)",
            border: "1px solid rgba(220,38,38,0.4)",
            color: "var(--color-danger)",
            background: "rgba(220,38,38,0.05)",
          }}
        >
          {t("card.adminStatus.underReview")}
        </span>
      )}
      {praxis.moderation_status === "failed" && (
        <span
          className="eyebrow"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            padding: "0 var(--space-xs)",
            border: "1px solid rgba(245,158,11,0.4)",
            color: "var(--color-warning)",
            background: "rgba(245,158,11,0.05)",
          }}
        >
          {t("card.adminStatus.failed")}
        </span>
      )}
      {praxis.moderation_status === "hidden" && (
        <span
          className="eyebrow"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            padding: "0 var(--space-xs)",
            border: "1px solid rgba(107,114,128,0.4)",
            color: "var(--color-text-secondary)",
            background: "rgba(107,114,128,0.05)",
          }}
        >
          {t("card.adminStatus.hidden")}
        </span>
      )}
      {moderateError && (
        <p
          className="font-body"
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--color-danger)",
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
              border: "1px solid rgba(220,38,38,0.3)",
              color: "var(--color-danger)",
              background: "rgba(220,38,38,0.05)",
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
              border: "1px solid rgba(245,158,11,0.3)",
              color: "var(--color-warning)",
              background: "rgba(245,158,11,0.05)",
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
