import { Link } from "react-router-dom";
import type { TaskOut } from "../../api/tasks";
import i18n from "../../i18n";
import { factionCssVar } from "../../utils/factions";

/**
 * Singularity — Terminal Printout.
 * Always dark background, green terminal text, corner brackets, sprocket holes,
 * scanline overlay, blinking cursor. Same in light and dark mode.
 *
 * This card uses CSS variables for its colors even though it's always dark,
 * because the Singularity CSS vars are identical in both themes.
 */

interface Props {
  task: TaskOut;
  displayPoints: number;
  onSignup?: (id: number) => void;
}

/** Row of sprocket holes */
function SprocketHoles() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 6,
        padding: "4px 0",
      }}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          style={{
            width: 6,
            height: 4,
            background: "rgba(10,26,14)",
            border:
              "1px solid var(--faction-singularity-card-accent, var(--faction-singularity-border-hard))",
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

export default function SingularityTaskCard({
  task,
  displayPoints,
  onSignup,
}: Props) {
  return (
    <div
      style={{
        minWidth: 128,
        maxWidth: 156,
        flex: "0 1 140px",
        background: "var(--faction-singularity-card-bg)",
        border: "1px solid var(--faction-singularity-border-hard)",
        position: "relative",
        fontFamily: factionCssVar("singularity", "card-font"),
        color: "var(--faction-singularity-card-text)",
        overflow: "hidden",
      }}
    >
      {/* Scanline overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(74,222,128,0.015) 2px, rgba(74,222,128,0.015) 4px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Corner brackets */}
      <div
        style={{
          position: "absolute",
          top: 3,
          left: 3,
          width: 10,
          height: 10,
          borderTop: "1px solid var(--faction-singularity-card-text)",
          borderLeft: "1px solid var(--faction-singularity-card-text)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 3,
          right: 3,
          width: 10,
          height: 10,
          borderTop: "1px solid var(--faction-singularity-card-text)",
          borderRight: "1px solid var(--faction-singularity-card-text)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 3,
          left: 3,
          width: 10,
          height: 10,
          borderBottom: "1px solid var(--faction-singularity-card-text)",
          borderLeft: "1px solid var(--faction-singularity-card-text)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 3,
          right: 3,
          width: 10,
          height: 10,
          borderBottom: "1px solid var(--faction-singularity-card-text)",
          borderRight: "1px solid var(--faction-singularity-card-text)",
        }}
      />

      <SprocketHoles />

      <div style={{ padding: "4px 12px 8px", position: "relative", zIndex: 2 }}>
        {/* Header */}
        <div
          style={{
            fontSize: 7,
            color: "var(--faction-singularity-card-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            marginBottom: 6,
          }}
        >
          {i18n.t("feed:identity.singularity.protocol")}
          <span
            style={{
              display: "inline-block",
              width: 5,
              height: 9,
              background: "var(--faction-singularity-card-text)",
              marginLeft: 3,
              verticalAlign: "middle",
              animation: "blink 1s step-end infinite",
            }}
          />
        </div>

        <Link
          to={`/tasks/${task.id}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div
            style={{
              fontSize: "var(--text-sm)",
              marginBottom: 6,
              lineHeight: 1.3,
              overflowWrap: "anywhere",
            }}
          >
            {"> "}
            {task.title}
          </div>
        </Link>

        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--faction-singularity-card-muted)",
            lineHeight: 1.6,
            marginBottom: 6,
          }}
        >
          <div>
            {i18n.t("feed:taskCard.singularity.pointsLabel")}{" "}
            <span
              style={{
                color: "var(--faction-singularity-card-text)",
                fontSize: "var(--text-md)",
                fontWeight: 700,
              }}
            >
              {displayPoints}
            </span>
          </div>
          <div>
            {i18n.t("feed:taskCard.singularity.levelLabel", {
              level: task.level_required,
            })}
          </div>
        </div>

        {task.description && (
          <div
            style={{
              fontSize: 7,
              color: "var(--faction-singularity-card-muted)",
              lineHeight: 1.4,
              marginBottom: 6,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {task.description}
          </div>
        )}

        {onSignup && (
          <button
            onClick={() => onSignup(task.id)}
            style={{
              background: "transparent",
              color: "var(--faction-singularity-card-text)",
              border: "1px solid var(--faction-singularity-card-text)",
              fontFamily: factionCssVar("singularity", "card-font"),
              fontSize: 7,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              padding: "2px 8px",
              cursor: "pointer",
              marginBottom: 4,
            }}
          >
            {">"} {i18n.t("feed:taskCard.singularity.signup")}
          </button>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            borderTop: "1px solid var(--faction-singularity-border-hard)",
            paddingTop: 5,
          }}
        >
          <span
            style={{
              border: "1px solid var(--faction-singularity-card-text)",
              color: "var(--faction-singularity-card-text)",
              fontSize: 7,
              padding: "1px 6px",
              borderRadius: 6,
              textTransform: "uppercase",
            }}
          >
            {i18n.t("feed:taskCard.singularity.levelPill", {
              level: task.level_required,
            })}
          </span>
        </div>
      </div>

      <SprocketHoles />

      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </div>
  );
}
