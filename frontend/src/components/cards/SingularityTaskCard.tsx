import type { CSSProperties } from "react";
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

// Static style objects, hoisted to module scope (#586) -- none of these close
// over a prop, so re-allocating them on every render bought nothing.

const TERMINAL_TEXT = "var(--faction-singularity-card-text)";
const HARD_BORDER = "var(--faction-singularity-border-hard)";
const MUTED = "var(--faction-singularity-card-muted)";

const sprocketRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-around",
  gap: "var(--space-sm)",
  padding: "var(--space-xs) var(--space-lg)",
};

const sprocketHoleStyle: CSSProperties = {
  width: 6,
  height: 4,
  background: "rgba(10,26,14)",
  border: `1px solid var(--faction-singularity-card-accent, ${HARD_BORDER})`,
  borderRadius: 1,
};

const cardShellStyle: CSSProperties = {
  minWidth: 180,
  maxWidth: 224,
  flex: "0 1 204px",
  background: "var(--faction-singularity-card-bg)",
  border: `1px solid ${HARD_BORDER}`,
  position: "relative",
  fontFamily: factionCssVar("singularity", "card-font"),
  color: TERMINAL_TEXT,
  overflow: "hidden",
};

const scanlineStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(74,222,128,0.015) 2px, rgba(74,222,128,0.015) 4px)",
  pointerEvents: "none",
  zIndex: 1,
};

/** Corner brackets -- one per corner; only the two drawn edges differ. */
const cornerBase: CSSProperties = { position: "absolute", width: 10, height: 10 };
const cornerTopLeft: CSSProperties = {
  ...cornerBase, top: 3, left: 3,
  borderTop: `1px solid ${TERMINAL_TEXT}`, borderLeft: `1px solid ${TERMINAL_TEXT}`,
};
const cornerTopRight: CSSProperties = {
  ...cornerBase, top: 3, right: 3,
  borderTop: `1px solid ${TERMINAL_TEXT}`, borderRight: `1px solid ${TERMINAL_TEXT}`,
};
const cornerBottomLeft: CSSProperties = {
  ...cornerBase, bottom: 3, left: 3,
  borderBottom: `1px solid ${TERMINAL_TEXT}`, borderLeft: `1px solid ${TERMINAL_TEXT}`,
};
const cornerBottomRight: CSSProperties = {
  ...cornerBase, bottom: 3, right: 3,
  borderBottom: `1px solid ${TERMINAL_TEXT}`, borderRight: `1px solid ${TERMINAL_TEXT}`,
};

const bodyStyle: CSSProperties = {
  padding: "var(--space-xs) var(--space-md) var(--space-sm)",
  position: "relative",
  zIndex: 2,
};

const eyebrowStyle: CSSProperties = {
  fontSize: "var(--text-xs)",
  color: MUTED,
  textTransform: "uppercase",
  letterSpacing: "0.15em",
  marginBottom: "var(--space-sm)",
};

const caretStyle: CSSProperties = {
  display: "inline-block",
  width: 5,
  height: 9,
  background: TERMINAL_TEXT,
  marginLeft: "var(--space-xs)",
  verticalAlign: "middle",
};

const linkStyle: CSSProperties = { textDecoration: "none", color: "inherit" };

const titleStyle: CSSProperties = {
  marginBottom: "var(--space-sm)",
  lineHeight: 1.3,
  overflowWrap: "anywhere",
};

const metaStyle: CSSProperties = {
  fontSize: "var(--text-xs)",
  color: MUTED,
  lineHeight: 1.6,
  marginBottom: "var(--space-sm)",
};

const pointsStyle: CSSProperties = { color: TERMINAL_TEXT, fontWeight: 700 };

const descriptionStyle: CSSProperties = {
  color: MUTED,
  lineHeight: 1.4,
  marginBottom: "var(--space-sm)",
  overflow: "hidden",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
};

const signupStyle: CSSProperties = {
  background: "transparent",
  color: TERMINAL_TEXT,
  border: `1px solid ${TERMINAL_TEXT}`,
  fontFamily: factionCssVar("singularity", "card-font"),
  fontSize: "var(--text-xs)",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  padding: "var(--space-xs) var(--space-sm)",
  cursor: "pointer",
  marginBottom: "var(--space-xs)",
};

const footerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  borderTop: `1px solid ${HARD_BORDER}`,
  paddingTop: "var(--space-xs)",
};

const levelPillStyle: CSSProperties = {
  border: `1px solid ${TERMINAL_TEXT}`,
  color: TERMINAL_TEXT,
  fontSize: "var(--text-xs)",
  padding: "0 var(--space-xs)",
  borderRadius: 6,
  textTransform: "uppercase",
};

/** Row of sprocket holes */
function SprocketHoles() {
  return (
    <div style={sprocketRowStyle}>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} style={sprocketHoleStyle} />
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
    <div style={cardShellStyle}>
      {/* Scanline overlay */}
      <div style={scanlineStyle} />

      {/* Corner brackets */}
      <div style={cornerTopLeft} />
      <div style={cornerTopRight} />
      <div style={cornerBottomLeft} />
      <div style={cornerBottomRight} />

      <SprocketHoles />

      <div style={bodyStyle}>
        {/* Header — eyebrow, stays label-tier (§4 content-text floor). */}
        <div style={eyebrowStyle}>
          {i18n.t("feed:identity.singularity.protocol")}
          <span aria-hidden className="sg-cursor" style={caretStyle} />
        </div>

        <Link
          to={`/tasks/${task.id}`}
          style={linkStyle}
        >
          {/* Task title — a title, so .content-title per #627's re-cut (§4). */}
          <div className="content-title" style={titleStyle}>
            {"> "}
            {task.title}
          </div>
        </Link>

        <div style={metaStyle}>
          <div>
            {i18n.t("feed:taskCard.singularity.pointsLabel")}{" "}
            {/* Points value — a score, so .content-title per #627's re-cut (§4). */}
            <span className="content-title" style={pointsStyle}>
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
          /* Body copy on the content floor (.content-text, 18px). The card was
             widened to ~204px in #628 so the floor has no exceptions. */
          <div className="content-text" style={descriptionStyle}>
            {task.description}
          </div>
        )}

        {onSignup && (
          <button
            onClick={() => onSignup(task.id)}
            style={signupStyle}
          >
            {">"} {i18n.t("feed:taskCard.singularity.signup")}
          </button>
        )}

        <div style={footerStyle}>
          {/* Level pill — badge label, stays label-tier (§4). */}
          <span style={levelPillStyle}>
            {i18n.t("feed:taskCard.singularity.levelPill", {
              level: task.level_required,
            })}
          </span>
        </div>
      </div>

      <SprocketHoles />

    </div>
  );
}
