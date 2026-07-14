import { Link } from "react-router-dom";
import type { TaskOut } from "../../api/tasks";
import i18n from "../../i18n";
import LevelPill from "../ui/LevelPill";

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

export default function WowTaskCard({
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
        border: "2px solid var(--faction-wow-win-border)",
        fontFamily: "var(--font-body)",
        transition: "border-color 150ms",
      }}
    >
      {/* title bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "6px 9px",
          background:
            "linear-gradient(180deg, var(--faction-wow-title-from), var(--faction-wow-title-to))",
          borderBottom: "2px solid var(--faction-wow-win-border)",
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          <WindowDot color="#fb7aa8" />
          <WindowDot color="#f6c75e" />
          <WindowDot color="#86cfa6" />
        </div>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 10,
            letterSpacing: "0.03em",
            color: "var(--faction-wow-title-text)",
          }}
        >
          <Sparkle size={9} color="var(--faction-wow-title-text)" />
          {i18n.t("feed:taskCard.wow.windowTitle")}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            opacity: 0.75,
            letterSpacing: "1.5px",
            color: "var(--faction-wow-title-text)",
          }}
        >
          ▭ ✕
        </span>
      </div>

      {/* dotted-grid body */}
      <div
        style={
          {
            padding: "12px 12px 11px",
            background: "var(--faction-wow-body-bg)",
            backgroundImage:
              "radial-gradient(var(--faction-wow-dot) 1.4px, transparent 1.4px)",
            backgroundSize: "13px 13px",
          } as React.CSSProperties
        }
      >
        {/* notepad panel */}
        <div
          style={{
            background: "var(--faction-wow-notepad-bg)",
            border: "1.5px solid var(--faction-wow-notepad-border)",
            borderRadius: 7,
            padding: "9px 11px",
            marginBottom: 10,
          }}
        >
          <div
            className="card-meta"
            style={{ color: "var(--faction-wow-card-accent)" }}
          >
            {i18n.t("feed:taskCard.wow.questMeta", { points: displayPoints })}
          </div>

          <Link
            to={`/tasks/${task.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                fontFamily: "var(--faction-wow-card-font)",
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1.05,
                marginBottom: 4,
                color: "var(--faction-wow-card-text)",
                overflowWrap: "anywhere",
              }}
            >
              {task.title}
            </div>
          </Link>

          {task.description && (
            <div
              className="card-description"
              style={{ color: "var(--faction-wow-card-muted)" }}
            >
              {task.description}
            </div>
          )}
        </div>

        {onSignup && (
          <button
            onClick={() => onSignup(task.id)}
            className="btn-primary"
            style={{ fontSize: 7, padding: "2px 8px", marginBottom: 8 }}
          >
            {i18n.t("feed:taskCard.wow.signup")}
          </button>
        )}

        {/* status row */}
        <div className="card-footer">
          <LevelPill level={task.level_required} factionSlug="wow" />
          <span
            style={{
              fontSize: 9,
              letterSpacing: "0.1em",
              color: "var(--faction-wow-card-accent)",
            }}
          >
            ◆ {i18n.t("feed:taskCard.wow.points", { points: displayPoints })}
          </span>
        </div>
      </div>
    </div>
  );
}
