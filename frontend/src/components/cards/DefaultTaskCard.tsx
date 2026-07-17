import { Link } from "react-router-dom";
import type { TaskOut } from "../../api/tasks";
import i18n from "../../i18n";
import DefaultSigil from "./DefaultSigil";

/**
 * DefaultTaskCard — the task-card archetype for the UNAFFILIATED / no-faction
 * (`na`) state, and the fallback for any task whose faction has no bespoke card.
 * Where each faction commits to one loud archetype, the default stays
 * deliberately un-committed: a clean sheet wrapped in a thick spectrum band
 * (every faction colour at once = all paths open), marked with the seven-segment
 * ring. Replaces the old borrowed-UA `DEFAULT_CARD = UaTaskCard` (#418). All
 * colours via --faction-default-* tokens (no hardcoded hex — CLAUDE.md); flips
 * light/dark through the cascade.
 */
const MONO = "'Courier Prime', monospace";

interface Props {
  task: TaskOut;
  displayPoints: number;
  onSignup?: (id: number) => void;
}

export default function DefaultTaskCard({ task, displayPoints, onSignup }: Props) {
  return (
    // Spectrum band → clean inner sheet.
    <div
      style={{
        minWidth: 240,
        maxWidth: 292,
        flex: "0 1 282px",
        borderRadius: 10,
        padding: "var(--space-sm)",
        background: "var(--faction-default-rainbow)",
        boxShadow: "0 12px 32px -14px rgba(0,0,0,0.4)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: "var(--faction-default-card-bg)",
          borderRadius: 5,
          padding: "var(--space-xl) var(--space-xl) var(--space-xl)",
          color: "var(--faction-default-card-text)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-md)",
            marginBottom: "var(--space-lg)",
            fontFamily: MONO,
            fontSize: "var(--text-base)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--faction-default-card-muted)",
          }}
        >
          <DefaultSigil size={28} /> {i18n.t("feed:taskCard.na.eyebrow")}
        </div>

        <Link to={`/tasks/${task.id}`} style={{ textDecoration: "none", color: "inherit" }}>
          <h3
            className="content-title"
            style={{
              fontFamily: "var(--faction-default-card-font)",
              fontStyle: "italic",
              lineHeight: 1.08,
              margin: "0 0 var(--space-md)",
              color: "var(--faction-default-card-text)",
              overflowWrap: "anywhere",
            }}
          >
            {task.title}
          </h3>
        </Link>

        {task.description && (
          <p
            className="card-description"
            style={{
              lineHeight: 1.55,
              color: "var(--faction-default-card-muted)",
              margin: "0 0 var(--space-xl)",
            }}
          >
            {task.description}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: "var(--text-base)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--faction-default-card-muted)",
              border: "1px solid var(--faction-default-border)",
              borderRadius: 99,
              padding: "var(--space-xs) var(--space-md)",
            }}
          >
            {i18n.t("feed:taskCard.na.level", { level: task.level_required })}
          </span>
          <span
            className="content-title"
            style={{
              fontFamily: "var(--faction-default-card-font)",
              fontStyle: "italic",
              fontWeight: 700,
              lineHeight: 1,
              color: "var(--faction-default-card-text)",
            }}
          >
            {displayPoints}
            <span style={{ fontSize: "var(--text-md)", marginLeft: "var(--space-xs)", color: "var(--faction-default-card-muted)" }}>
              {i18n.t("feed:taskCard.na.pointsUnit")}
            </span>
          </span>
          {onSignup && (
            <button
              onClick={() => onSignup(task.id)}
              style={{
                marginLeft: "auto",
                cursor: "pointer",
                fontFamily: "var(--faction-default-card-font)",
                fontStyle: "italic",
                fontSize: "var(--text-xl)",
                letterSpacing: "0.03em",
                padding: "var(--space-sm) var(--space-lg)",
                borderRadius: 3,
                color: "var(--faction-default-card-text)",
                background: "transparent",
                border: "1.5px solid var(--faction-default-card-accent)",
              }}
            >
              {i18n.t("feed:taskCard.na.signup")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
