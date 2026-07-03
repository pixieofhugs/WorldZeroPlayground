import type { CSSProperties, MouseEvent } from "react";
import { Link } from "react-router-dom";
import type { PraxisCardOut } from "../../api/praxis";
import { TaskCrown } from "../cards/TaskCrown";

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
        style={{ fontSize: "var(--text-lg)", marginBottom: 6, ...style }}
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
  return (
    <div
      className="flex justify-between items-center font-body"
      style={{
        fontSize: "var(--text-xs)",
        marginTop: 8,
        paddingTop: 6,
        borderTop: "1px dashed rgba(128,128,128,0.3)",
        ...style,
      }}
    >
      <Link
        to={`/characters/${praxis.created_by_id}`}
        className="hover:underline"
      >
        {praxis.created_by_display_name || `#${praxis.created_by_id}`}
      </Link>
      {praxis.score !== null && (
        <span
          className="font-display font-bold"
          style={{ fontSize: "var(--text-sm)", color: "inherit" }}
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
        padding: "6px 10px",
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
      <span className="font-display" style={{ fontWeight: 800, fontSize: "var(--text-lg)", whiteSpace: "nowrap" }}>
        {base}
        <span style={{ opacity: 0.55, margin: "0 2px" }}>+</span>
        {votePoints}
      </span>
      <span
        style={{
          fontSize: 7,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          marginTop: 3,
          opacity: 0.8,
        }}
      >
        pts + votes
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
          <span style={{ fontWeight: 600, opacity: 0.75 }}>L{praxis.task_level_required}</span>
          <span aria-hidden>·</span>
        </>
      )}
      <span style={{ fontWeight: 700 }}>{praxis.task_point_value} pts</span>
      <span aria-hidden>·</span>
      <span>{collaborators > 0 ? `+${collaborators} crew` : "solo"}</span>
      {submittedDate && (
        <>
          <span aria-hidden>·</span>
          <span style={{ opacity: 0.65 }}>{submittedDate}</span>
        </>
      )}
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
  return (
    <>
      {praxis.moderation_status === "flagged" && (
        <span
          className="eyebrow"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            fontSize: 7,
            padding: "1px 5px",
            border: "1px solid rgba(220,38,38,0.4)",
            color: "var(--color-danger)",
            background: "rgba(220,38,38,0.05)",
          }}
        >
          under review
        </span>
      )}
      {praxis.moderation_status === "failed" && (
        <span
          className="eyebrow"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            fontSize: 7,
            padding: "1px 5px",
            border: "1px solid rgba(245,158,11,0.4)",
            color: "var(--color-warning)",
            background: "rgba(245,158,11,0.05)",
          }}
        >
          failed
        </span>
      )}
      {praxis.moderation_status === "hidden" && (
        <span
          className="eyebrow"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            fontSize: 7,
            padding: "1px 5px",
            border: "1px solid rgba(107,114,128,0.4)",
            color: "var(--color-text-secondary)",
            background: "rgba(107,114,128,0.05)",
          }}
        >
          hidden
        </span>
      )}
      {moderateError && (
        <p
          className="font-body"
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--color-danger)",
            marginBottom: 4,
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
            gap: 4,
          }}
        >
          <button
            onClick={onHide}
            className="eyebrow"
            style={{
              fontSize: 7,
              padding: "1px 5px",
              border: "1px solid rgba(220,38,38,0.3)",
              color: "var(--color-danger)",
              background: "rgba(220,38,38,0.05)",
              cursor: "pointer",
            }}
          >
            hide
          </button>
          <button
            onClick={onFail}
            className="eyebrow"
            style={{
              fontSize: 7,
              padding: "1px 5px",
              border: "1px solid rgba(245,158,11,0.3)",
              color: "var(--color-warning)",
              background: "rgba(245,158,11,0.05)",
              cursor: "pointer",
            }}
          >
            fail
          </button>
        </div>
      )}
    </>
  );
}
