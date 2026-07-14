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
 * ring. Replaces the old borrowed-UA `DEFAULT_CARD = UATaskCard` (#418). All
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
        padding: 6,
        background: "var(--faction-default-rainbow)",
        boxShadow: "0 12px 32px -14px rgba(0,0,0,0.4)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: "var(--faction-default-card-bg)",
          borderRadius: 5,
          padding: "24px 22px 22px",
          color: "var(--faction-default-card-text)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--faction-default-card-muted)",
          }}
        >
          <DefaultSigil size={28} /> {i18n.t("feed:taskCard.na.eyebrow")}
        </div>

        <Link to={`/tasks/${task.id}`} style={{ textDecoration: "none", color: "inherit" }}>
          <h3
            style={{
              fontFamily: "var(--faction-default-card-font)",
              fontStyle: "italic",
              fontSize: 26,
              lineHeight: 1.08,
              margin: "0 0 10px",
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
              fontSize: 11.5,
              lineHeight: 1.55,
              color: "var(--faction-default-card-muted)",
              margin: "0 0 20px",
            }}
          >
            {task.description}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--faction-default-card-muted)",
              border: "1px solid var(--faction-default-border)",
              borderRadius: 99,
              padding: "4px 10px",
            }}
          >
            {i18n.t("feed:taskCard.na.level", { level: task.level_required })}
          </span>
          <span
            style={{
              fontFamily: "var(--faction-default-card-font)",
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: 26,
              lineHeight: 1,
              color: "var(--faction-default-card-text)",
            }}
          >
            {displayPoints}
            <span style={{ fontSize: 11, marginLeft: 2, color: "var(--faction-default-card-muted)" }}>
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
                fontSize: 14,
                letterSpacing: "0.03em",
                padding: "8px 14px",
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
