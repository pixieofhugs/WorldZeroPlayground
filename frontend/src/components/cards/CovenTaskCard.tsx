import { Link } from "react-router-dom";
import type { TaskOut } from "../../api/tasks";
import i18n from "../../i18n";
import LevelGem from "../ui/LevelGem";

/**
 * Warriors of Whimsy — wow.exe.
 * Lo-fi computer-witch window: pastel title bar with window dots, a faint
 * dotted-grid body, and an inner "notepad" panel holding the task in the
 * Caveat headline font. Visuals only — same prop contract as the other cards.
 */

interface Props {
  task: TaskOut;
  displayPoints: number;
  onSignup?: (id: number) => void;
}

/** Tiny four-point sparkle used in the title bar and footer pill accent. */
function Sparkle({
  size = 10,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 1c.6 5.2 2.8 7.4 8 8-5.2.6-7.4 2.8-8 8-.6-5.2-2.8-7.4-8-8 5.2-.6 7.4-2.8 8-8z"
        fill={color}
      />
    </svg>
  );
}

/** One colored window-control dot. */
function WindowDot({ color }: { color: string }) {
  return (
    <span
      style={{
        width: 9,
        height: 9,
        borderRadius: "50%",
        background: color,
        border: "1.2px solid rgba(255,255,255,0.7)",
      }}
    />
  );
}

export default function CovenTaskCard({
  task,
  displayPoints,
  onSignup,
}: Props) {
  return (
    <div
      style={{
        minWidth: 168,
        maxWidth: 210,
        flex: "0 1 196px",
        borderRadius: 12,
        overflow: "hidden",
        border: "2px solid var(--faction-coven-win-border)",
        fontFamily: "var(--font-body)",
        transition: "border-color 150ms",
      }}
    >
      {/* title bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          padding: "var(--space-sm) var(--space-sm)",
          background:
            "linear-gradient(180deg, var(--faction-coven-title-from), var(--faction-coven-title-to))",
          borderBottom: "2px solid var(--faction-coven-win-border)",
        }}
      >
        <div style={{ display: "flex", gap: "var(--space-xs)" }}>
          <WindowDot color="#fb7aa8" />
          <WindowDot color="#f6c75e" />
          <WindowDot color="#86cfa6" />
        </div>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-xs)",
            fontSize: "var(--text-base)",
            letterSpacing: "0.03em",
            color: "var(--faction-coven-title-text)",
          }}
        >
          <Sparkle size={9} color="var(--faction-coven-title-text)" />
          {i18n.t("feed:taskCard.coven.windowTitle")}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "var(--text-base)",
            opacity: 0.75,
            letterSpacing: "1.5px",
            color: "var(--faction-coven-title-text)",
          }}
        >
          ▭ ✕
        </span>
      </div>

      {/* dotted-grid body */}
      <div
        style={
          {
            padding: "var(--space-md) var(--space-md) var(--space-md)",
            background: "var(--faction-coven-body-bg)",
            backgroundImage:
              "radial-gradient(var(--faction-coven-dot) 1.4px, transparent 1.4px)",
            backgroundSize: "13px 13px",
          } as React.CSSProperties
        }
      >
        {/* notepad panel */}
        <div
          style={{
            background: "var(--faction-coven-notepad-bg)",
            border: "1.5px solid var(--faction-coven-notepad-border)",
            borderRadius: 7,
            padding: "var(--space-sm) var(--space-md)",
            marginBottom: "var(--space-md)",
          }}
        >
          <div
            className="card-meta"
            style={{ color: "var(--faction-coven-card-accent)" }}
          >
            {i18n.t("feed:taskCard.coven.questMeta", { points: displayPoints })}
          </div>

          <Link
            to={`/tasks/${task.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              className="content-title"
              style={{
                fontFamily: "var(--faction-coven-card-font)",
                fontWeight: 700,
                lineHeight: 1.05,
                marginBottom: "var(--space-xs)",
                color: "var(--faction-coven-card-text)",
                overflowWrap: "anywhere",
              }}
            >
              {task.title}
            </div>
          </Link>

          {task.description && (
            <div
              className="card-description"
              style={{ color: "var(--faction-coven-card-muted)" }}
            >
              {task.description}
            </div>
          )}
        </div>

        {onSignup && (
          <button
            onClick={() => onSignup(task.id)}
            className="btn-primary"
            style={{ fontSize: "var(--text-xs)", padding: "var(--space-xs) var(--space-sm)", marginBottom: "var(--space-sm)" }}
          >
            {i18n.t("feed:taskCard.coven.signup")}
          </button>
        )}

        {/* status row */}
        <div className="card-footer">
          <LevelGem level={task.level_required} factionSlug="coven" />
          {/* Points shown as a ◆ corner-counter — a badge/counter, so it stays
              label-tier per the role vocabulary (§4), not a plain score number. */}
          <span
            style={{
              fontSize: "var(--text-sm)",
              letterSpacing: "0.1em",
              color: "var(--faction-coven-card-accent)",
            }}
          >
            ◆ {i18n.t("feed:taskCard.coven.points", { points: displayPoints })}
          </span>
        </div>
      </div>
    </div>
  );
}
